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

# ── Paths to skip from RabbitMQ publishing ───────────────────────────────────
# These are CRAVE's internal control endpoints. Publishing them to Niramay
# creates noise in detection engines (they look like normal traffic but
# have unusual patterns that trigger false positives).
SKIP_PUBLISH_PATHS = {
    "/api/v1/failure-simulator/heal",
    "/api/v1/failure-simulator/injector/state",
    "/api/v1/failure-simulator/injector/traffic",
    "/api/v1/failure-simulator/injector/clear-pause",
    "/api/v1/failure-simulator/scenarios",
    "/api/v1/failure-simulator/rabbitmq/state",
    "/api/v1/failure-simulator/reset",
    "/api/v1/failure-simulator/toggle",
    "/api/v1/failure-simulator/status",
    "/api/v1/failure-simulator/metrics",
    "/api/v1/failure-simulator/presets",
    "/api/v1/failure-simulator/global-rate",
    "/api/v1/failure-simulator/payment-config",
    "/api/v1/failure-simulator/health",
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
    "/api/v1/chaos",
    "/api/v1/observation",
    "/api/v1/developer",
    "/health",
    "/health/detailed",
    "/",
    "/api/v1/",
}


def _should_publish_to_niramay(path: str) -> bool:
    """Check if this path should be published to Niramay via RabbitMQ.

    Returns False for internal control endpoints that would create
    noise in Niramay's detection engines.
    """
    if not path:
        return False
    for skip in SKIP_PUBLISH_PATHS:
        if path.startswith(skip):
            return False
    return True


def _classify_exception(exc: Exception) -> str:
    """
    Determine failure_tag from a real exception type.

    Used when Chaos Mesh causes real failures that the failure
    simulator did not inject. The exception string is inspected
    for keywords that map to specific failure categories.

    Priority: database errors > timeouts > overload > dependency > default
    """
    exc_str = str(exc).lower()

    # Real database errors (from Chaos Mesh network loss to postgres)
    if any(k in exc_str for k in [
        "connection refused", "database", "postgres",
        "sqlalchemy", "asyncpg", "connection reset",
        "could not connect", "connection pool",
        "psycopg2", "operationalerror",
    ]):
        return "database_error"

    # Real timeout errors (from Chaos Mesh network delay)
    if any(k in exc_str for k in [
        "timeout", "timed out", "deadline exceeded",
        "read timeout", "connect timeout",
    ]):
        return "payment_timeout"

    # Real overload errors (from Chaos Mesh CPU stress)
    if any(k in exc_str for k in [
        "503", "service unavailable", "overloaded",
        "too many requests", "capacity",
    ]):
        return "service_unavailable"

    # Real dependency errors (from Chaos Mesh DNS failure)
    if any(k in exc_str for k in [
        "dns", "name resolution", "nodename",
        "host not found", "external",
    ]):
        return "dependency"

    # Redis errors
    if any(k in exc_str for k in [
        "redis", "cache", "connection error",
    ]):
        return "database_error"

    # Default for unclassified server errors
    return "database_error"


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

            # Determine failure_tag: prefer injector tag, then Chaos Mesh,
            # then classify the real exception
            failure_tag = getattr(request.state, "observation_failure_type", "none")
            if failure_tag == "none":
                # No injector scenario active — check if Chaos Mesh is running
                try:
                    from app.core.chaos_detector import get_active_chaos_tag
                    chaos_tag = get_active_chaos_tag()
                    if chaos_tag != "none":
                        failure_tag = chaos_tag
                except Exception:
                    pass
            if failure_tag == "none":
                # Last resort: classify from exception type
                failure_tag = _classify_exception(exc)

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

            # Enqueue for RabbitMQ shipping (best-effort, filtered)
            if _should_publish_to_niramay(path):
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

        # 5. Enqueue for RabbitMQ shipping (best-effort, filtered)
        if _should_publish_to_niramay(path):
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
