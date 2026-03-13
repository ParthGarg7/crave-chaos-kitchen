"""
API Tracker Middleware
Tracks all HTTP requests for the Chaos Engineer developer dashboard.
"""
import time
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Dict, Deque
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# ── In-memory stores ──────────────────────────────────────────────────────────
# Active (in-flight) requests keyed by request_id
_active_requests: Dict[str, dict] = {}

# Rolling history of the last 200 completed calls
_recent_calls: Deque[dict] = deque(maxlen=200)

# Paths to exclude from tracking (avoid recursive noise)
_EXCLUDED_PATHS = {
    "/api/v1/developer/active-calls",
    "/api/v1/developer/endpoints",
    "/health",
    "/",
}


class ApiTrackerMiddleware(BaseHTTPMiddleware):
    """Capture every request and store timing/status data for the developer dashboard."""

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Skip noise paths
        if path in _EXCLUDED_PATHS:
            return await call_next(request)

        request_id = str(uuid.uuid4())[:12]
        start_ts = time.monotonic()
        start_iso = datetime.now(timezone.utc).isoformat()

        entry: dict = {
            "id": request_id,
            "method": request.method,
            "path": path,
            "full_url": str(request.url),
            "status": "active",
            "start_time": start_iso,
            "end_time": None,
            "duration_ms": None,
            "status_code": None,
            "client_ip": request.client.host if request.client else "unknown",
        }
        _active_requests[request_id] = entry

        try:
            response: Response = await call_next(request)
        except Exception as exc:  # pragma: no cover
            _active_requests.pop(request_id, None)
            raise exc

        duration_ms = round((time.monotonic() - start_ts) * 1000, 1)
        end_iso = datetime.now(timezone.utc).isoformat()

        entry.update(
            status="completed",
            duration_ms=duration_ms,
            status_code=response.status_code,
            end_time=end_iso,
        )
        _active_requests.pop(request_id, None)
        _recent_calls.appendleft(dict(entry))

        return response


# ── Public accessors ──────────────────────────────────────────────────────────

def get_active_requests() -> list:
    return list(_active_requests.values())


def get_recent_calls() -> list:
    return list(_recent_calls)
