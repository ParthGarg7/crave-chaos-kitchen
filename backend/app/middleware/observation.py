import time
import uuid
from datetime import datetime, timezone
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.observation_store import observation_store

# Paths to exclude from observation (avoid recursive noise and unrelated paths)
_EXCLUDED_PATHS = {
    "/api/v1/observation/logs",
    "/health",
    "/",
    "/docs",
    "/redoc",
    "/openapi.json",
}

class ObservationMiddleware(BaseHTTPMiddleware):
    """
    Captures API request-response data for the Observation Layer.
    Acts as a 'CCTV camera' for all API traffic.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Skip tracking for excluded paths
        if any(path.startswith(excluded) for excluded in _EXCLUDED_PATHS) and \
           not path.startswith("/api/v1"):
            return await call_next(request)
        
        # Specifically exclude the logs endpoint itself even if it's under /api/v1
        if path == "/api/v1/observation/logs":
             return await call_next(request)

        # 1. Capture request metadata
        request_id = str(uuid.uuid4())
        start_time = time.monotonic()
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # 2. Process the request
        try:
            response: Response = await call_next(request)
        except Exception as exc:
            # If an exception escapes all handlers, we still want to log it as a 500
            duration_ms = round((time.monotonic() - start_time) * 1000, 1)
            
            # Extract failure type if stamped by FailureSimulationMiddleware
            # even in error cases, though usually it's caught and returned as JSONResponse
            failure_type = getattr(request.state, "observation_failure_type", "none")
            
            log_entry = {
                "timestamp": timestamp,
                "endpoint": path,
                "method": request.method,
                "status_code": 500,
                "response_time_ms": duration_ms,
                "request_id": request_id,
                "service_name": "demo-food-delivery",
                "failure_type": failure_type
            }
            await observation_store.push_log(log_entry)
            raise exc

        # 3. Capture response metadata
        duration_ms = round((time.monotonic() - start_time) * 1000, 1)
        
        # Get failure type stamped by FailureSimulationMiddleware
        failure_type = getattr(request.state, "observation_failure_type", "none")

        # 4. Record the log
        log_entry = {
            "timestamp": timestamp,
            "endpoint": path,
            "method": request.method,
            "status_code": response.status_code,
            "response_time_ms": duration_ms,
            "request_id": request_id,
            "service_name": "demo-food-delivery",
            "failure_type": failure_type
        }
        
        # Record asynchronously but await to ensure it's pushed (short operation)
        await observation_store.push_log(log_entry)

        return response
