import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.observation_store import observation_store
from app.core.service_registry import resolve_service
from app.db.base import get_session_factory
from app.models.api_call_log import ApiCallLog

_logger = logging.getLogger(__name__)

# Paths to skip from observation entirely (exact match or prefix)
_EXCLUDED_PATHS = {
    "/api/v1/observation/logs",
    "/health",
    "/",
    "/docs",
    "/redoc",
    "/openapi.json",
}


def _persist_api_log(
    *,
    request_id: str,
    method: str,
    endpoint: str,
    status_code: int,
    response_time_ms: float,
    service_name: str,
    failure_type: str,
    client_ip: Optional[str],
    error_message: Optional[str] = None,
) -> None:
    """Persist one API call log row to DB (runs in a thread-pool executor).

    Note: parameter names here (service_name, failure_type) intentionally
    match the DB column names in ApiCallLog and must NOT be renamed.
    The Niramay-facing log dict uses different keys (service, failure_tag)
    and is built separately in dispatch().
    """
    session_factory = get_session_factory()
    db = session_factory()
    try:
        db.add(
            ApiCallLog(
                request_id=request_id,
                method=method,
                endpoint=endpoint,
                status_code=status_code,
                response_time_ms=response_time_ms,
                service_name=service_name,
                failure_type=failure_type,
                client_ip=client_ip,
                error_message=error_message,
            )
        )
        db.commit()
    except Exception as exc:
        _logger.warning("ObservationMiddleware: failed to persist API log: %s", exc)
        db.rollback()
    finally:
        db.close()


class ObservationMiddleware(BaseHTTPMiddleware):
    """
    Captures API request-response data for the Observation Layer.
    Acts as a CCTV camera for all API traffic.

    Every completed request produces two outputs:

    1. A Niramay-compatible log dict pushed to observation_store and
       enqueued for RabbitMQ shipping. Field names match the schema
       Niramay expects:
           service      — logical service name from service_registry
           failure_tag  — injected failure type or "none"

    2. A DB row in api_call_logs using the internal column names
       (service_name, failure_type) for CRAVEs own developer dashboard.
       These column names are intentionally different and must stay that way.

    DB writes are dispatched via run_in_executor so the async event
    loop is never blocked by a synchronous SQLAlchemy commit.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        if path in _EXCLUDED_PATHS:
            return await call_next(request)

        # 1. Capture request metadata
        request_id = str(uuid.uuid4())
        start_time = time.monotonic()
        timestamp = datetime.now(timezone.utc).isoformat()

        # Resolve which logical service owns this path
        service = resolve_service(path)

        # 2. Process the request
        try:
            response: Response = await call_next(request)
        except Exception as exc:
            duration_ms = round((time.monotonic() - start_time) * 1000, 1)
            failure_tag = getattr(request.state, "observation_failure_type", "none")

            # Niramay-facing log entry — uses 'service' and 'failure_tag'
            log_entry = {
                "timestamp": timestamp,
                "service": service,
                "endpoint": path,
                "method": request.method,
                "status_code": 500,
                "response_time_ms": duration_ms,
                "failure_tag": failure_tag,
                "request_id": request_id,
            }
            await observation_store.push_log(log_entry)

            # Enqueue for RabbitMQ shipping (best-effort)
            try:
                from app.core.log_shipper import enqueue_log_event
                enqueue_log_event({**log_entry, "source": "observation"})
            except Exception:
                pass

            # DB write uses internal column names — do not rename these kwargs
            asyncio.get_event_loop().run_in_executor(
                None,
                lambda: _persist_api_log(
                    request_id=request_id,
                    method=request.method,
                    endpoint=path,
                    status_code=500,
                    response_time_ms=duration_ms,
                    service_name=service,
                    failure_type=failure_tag,
                    client_ip=request.client.host if request.client else "unknown",
                    error_message=str(exc),
                ),
            )
            raise exc

        # 3. Capture response metadata
        duration_ms = round((time.monotonic() - start_time) * 1000, 1)
        failure_tag = getattr(request.state, "observation_failure_type", "none")

        # 4. Niramay-facing log entry
        # Field names here MUST match what Niramay's normalizer expects.
        # Do not rename these keys without coordinating with Niramay team.
        log_entry = {
            "timestamp": timestamp,
            "service": service,
            "endpoint": path,
            "method": request.method,
            "status_code": response.status_code,
            "response_time_ms": duration_ms,
            "failure_tag": failure_tag,
            "request_id": request_id,
        }
        await observation_store.push_log(log_entry)

        # 5. Enqueue for RabbitMQ shipping (best-effort)
        try:
            from app.core.log_shipper import enqueue_log_event
            enqueue_log_event({**log_entry, "source": "observation"})
        except Exception:
            pass

        # 6. Persist to DB asynchronously
        # service_name and failure_type here are DB column kwargs — keep as-is
        asyncio.get_event_loop().run_in_executor(
            None,
            lambda: _persist_api_log(
                request_id=request_id,
                method=request.method,
                endpoint=path,
                status_code=response.status_code,
                response_time_ms=duration_ms,
                service_name=service,
                failure_type=failure_tag,
                client_ip=request.client.host if request.client else "unknown",
            ),
        )

        return response
