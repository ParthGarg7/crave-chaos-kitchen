"""
Chaos Middleware
Injects failures for the 23 chaos experiments defined in chaos_engineer.py.
This middleware runs BEFORE route handlers and, for response-level experiments,
intercepts the response body AFTER the route handler returns.

Middleware execution order (in main.py, middlewares are added in reverse-LIFO):
  Request:  ChaosMiddleware → FailureSimulationMiddleware → route handler
  Response: route handler → FailureSimulationMiddleware → ChaosMiddleware
"""
from __future__ import annotations

import asyncio
import json
import time
from typing import Any, Callable, Dict, Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from app.api.v1.endpoints.chaos_engineer import chaos_state


# ─────────────────────────────────────────────────────────────────
# Path-matching helpers
# ─────────────────────────────────────────────────────────────────

def _is_restaurant_list(path: str, method: str) -> bool:
    """Exact restaurant list — not /{id}, not /cuisines, not /my-restaurant..."""
    return method == "GET" and path == "/api/v1/restaurants"


def _is_order_create(path: str, method: str) -> bool:
    return method == "POST" and path == "/api/v1/orders"


def _is_delivery_available(path: str, method: str) -> bool:
    return method == "GET" and path == "/api/v1/delivery/available"


def _is_payment_process(path: str, method: str) -> bool:
    return method == "POST" and path == "/api/v1/payments/process"


def _is_user_profile(path: str, method: str) -> bool:
    return method == "GET" and path == "/api/v1/auth/me"


def _is_auth_endpoint(path: str) -> bool:
    return path.startswith("/api/v1/auth/")


def _is_delivery_location(path: str, method: str) -> bool:
    """Matches /api/v1/delivery/{id}/location GET."""
    parts = path.rstrip("/").split("/")
    return (
        method == "GET"
        and len(parts) >= 6
        and parts[3] == "delivery"
        and parts[5] == "location"
    )


def _is_menu_endpoint(path: str, method: str) -> bool:
    """Matches /api/v1/restaurants/{id}/menu GET."""
    parts = path.rstrip("/").split("/")
    return (
        method == "GET"
        and len(parts) >= 6
        and parts[3] == "restaurants"
        and parts[5] == "menu"
    )


def _is_protected_endpoint(path: str) -> bool:
    """Heuristic: most non-public endpoints start with these prefixes."""
    public = {
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/refresh",
        "/api/v1/restaurants",
        "/health",
        "/",
    }
    if path in public:
        return False
    if path.startswith("/api/v1/restaurants/") and path.endswith("/menu"):
        return False
    return path.startswith("/api/v1/")


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def _is_active(experiment_id: str) -> bool:
    return chaos_state.enabled.get(experiment_id, False)


def _log(
    experiment_id: str,
    method: str,
    path: str,
    failure_type: str,
    injected_status: Optional[int],
    detail: str,
) -> None:
    chaos_state.record_impact(
        experiment_id=experiment_id,
        method=method,
        endpoint=path,
        failure_type=failure_type,
        injected_status=injected_status,
        detail=detail,
    )


def _503_response(message: str) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "error": "ServiceUnavailable",
            "message": message,
            "chaos": True,
        },
        headers={"Retry-After": "10"},
    )


async def _read_body_json(response: Response) -> Optional[Any]:
    """Attempt to decode the response body as JSON. Returns None on failure."""
    try:
        body = b""
        async for chunk in response.body_iterator:
            body += chunk if isinstance(chunk, bytes) else chunk.encode()
        return json.loads(body.decode()), body
    except Exception:
        return None, None


# ─────────────────────────────────────────────────────────────────
# Middleware
# ─────────────────────────────────────────────────────────────────

class ChaosMiddleware(BaseHTTPMiddleware):
    """
    Injects chaos for all 23 experiments.

    Request-phase experiments (run BEFORE call_next):
      - Category A: Kill switches → return 503 immediately
      - Category B: Latency → sleep then call_next
      - Category E: Resource exhaustion → side-effects then call_next

    Response-phase experiments (run AFTER call_next):
      - Category C: Error injection → replace status code
      - Category D: Data corruption → mutate body JSON

    Category F cascading experiments affect their constituent sub-experiments
    at toggle-time (handled in chaos_engineer.py state), so the middleware
    just checks the sub-experiments directly.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        method = request.method

        # Skip chaos on the chaos control endpoints themselves to avoid recursion
        if path.startswith("/api/v1/chaos"):
            return await call_next(request)
        # Skip noise paths
        if path in {"/health", "/", "/docs", "/redoc", "/openapi.json"}:
            return await call_next(request)

        # ── Category E: CPU spike ──────────────────────────────────────
        if _is_active("exhaust_cpu_spike"):
            deadline = time.monotonic() + 0.2  # 200 ms busy loop
            while time.monotonic() < deadline:
                _ = sum(i * i for i in range(1000))
            _log("exhaust_cpu_spike", method, path, "resource_exhaust", None, "200ms CPU busy-loop executed")

        # ── Category E: Memory pressure ────────────────────────────────
        _memory_hold = None
        if _is_active("exhaust_memory_pressure"):
            _memory_hold = bytearray(50 * 1024 * 1024)  # 50 MB held for request duration
            _log("exhaust_memory_pressure", method, path, "resource_exhaust", None, "50 MB allocated for request duration")

        # ─── Category A: Kill switches (return 503 before call_next) ────

        if _is_active("kill_restaurants") and _is_restaurant_list(path, method):
            _log("kill_restaurants", method, path, "503_kill", 503, "Restaurant listing endpoint killed")
            return _503_response("Restaurant listing is currently unavailable (chaos: kill_restaurants)")

        if _is_active("kill_order_create") and _is_order_create(path, method):
            _log("kill_order_create", method, path, "503_kill", 503, "Order creation endpoint killed")
            return _503_response("Order creation is currently unavailable (chaos: kill_order_create)")

        if _is_active("kill_delivery_available") and _is_delivery_available(path, method):
            _log("kill_delivery_available", method, path, "503_kill", 503, "Delivery available endpoint killed")
            return _503_response("Delivery available endpoint is currently unavailable (chaos: kill_delivery_available)")

        if _is_active("kill_payment") and _is_payment_process(path, method):
            _log("kill_payment", method, path, "503_kill", 503, "Payment endpoint killed")
            return _503_response("Payment processing is currently unavailable (chaos: kill_payment)")

        if _is_active("kill_user_profile") and _is_user_profile(path, method):
            _log("kill_user_profile", method, path, "503_kill", 503, "User profile endpoint killed")
            return _503_response("User profile service is currently unavailable (chaos: kill_user_profile)")

        # ─── Category B: Latency injection (sleep before call_next) ─────

        if _is_active("latency_restaurants") and _is_restaurant_list(path, method):
            _log("latency_restaurants", method, path, "latency", None, "3s artificial delay injected")
            await asyncio.sleep(3)

        if _is_active("latency_order_create") and _is_order_create(path, method):
            _log("latency_order_create", method, path, "latency", None, "5s artificial delay injected")
            await asyncio.sleep(5)

        if _is_active("latency_auth") and _is_auth_endpoint(path):
            _log("latency_auth", method, path, "latency", None, "2s artificial delay injected on auth endpoint")
            await asyncio.sleep(2)

        if _is_active("latency_payment") and _is_payment_process(path, method):
            _log("latency_payment", method, path, "latency", None, "10s artificial delay injected")
            await asyncio.sleep(10)

        # ────────────── Call the real route handler ──────────────────────
        response: Response = await call_next(request)
        del _memory_hold  # Release any held memory

        # ─── Category C: Error response injection ────────────────────────
        # These replace the status code but also return a chaos JSON body

        if _is_active("error_restaurants_500") and _is_restaurant_list(path, method):
            _log("error_restaurants_500", method, path, "error_inject", 500, "500 injected over restaurant listing response")
            return JSONResponse(
                status_code=500,
                content={"error": "InternalServerError", "message": "Internal server error (chaos: error_restaurants_500)", "chaos": True},
            )

        if _is_active("error_auth_401_all") and _is_protected_endpoint(path):
            _log("error_auth_401_all", method, path, "error_inject", 401, "401 injected — simulating auth service outage")
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized", "message": "Authentication service unavailable (chaos: error_auth_401_all)", "chaos": True},
                headers={"WWW-Authenticate": "Bearer"},
            )

        if _is_active("error_orders_429") and _is_order_create(path, method):
            _log("error_orders_429", method, path, "error_inject", 429, "429 rate limit injected on order creation")
            return JSONResponse(
                status_code=429,
                content={"error": "TooManyRequests", "message": "Rate limit exceeded. Please try again in a moment. (chaos: error_orders_429)", "chaos": True},
                headers={"Retry-After": "30"},
            )

        if _is_active("error_delivery_track_404") and _is_delivery_location(path, method):
            _log("error_delivery_track_404", method, path, "error_inject", 404, "404 injected on delivery tracking")
            return JSONResponse(
                status_code=404,
                content={"error": "NotFound", "message": "Order tracking data not found — delivery may be lost. (chaos: error_delivery_track_404)", "chaos": True},
            )

        # ─── Category D: Data corruption (mutate response body) ──────────

        if _is_active("corrupt_restaurants_empty") and _is_restaurant_list(path, method) and response.status_code == 200:
            _log("corrupt_restaurants_empty", method, path, "data_corrupt", 200, "Restaurant list replaced with empty array")
            return JSONResponse(status_code=200, content=[])

        if _is_active("corrupt_order_total_zero") and _is_order_create(path, method) and response.status_code in (200, 201):
            parsed, raw = await _read_body_json(response)
            if parsed is not None and isinstance(parsed, dict):
                parsed["total"] = 0.0
                parsed["_chaos"] = "corrupt_order_total_zero"
                _log("corrupt_order_total_zero", method, path, "data_corrupt", response.status_code, "Order total zeroed out in response")
                return JSONResponse(status_code=response.status_code, content=parsed)
            return Response(content=raw, status_code=response.status_code, media_type="application/json")

        if _is_active("corrupt_delivery_status_null") and path.startswith("/api/v1/delivery/") and method == "GET" and response.status_code == 200:
            parsed, raw = await _read_body_json(response)
            if parsed is not None and isinstance(parsed, dict):
                parsed["status"] = None
                parsed["_chaos"] = "corrupt_delivery_status_null"
                _log("corrupt_delivery_status_null", method, path, "data_corrupt", response.status_code, "Delivery status field set to null")
                return JSONResponse(status_code=response.status_code, content=parsed)
            return Response(content=raw, status_code=response.status_code, media_type="application/json")

        if _is_active("corrupt_menu_malformed_json") and _is_menu_endpoint(path, method):
            _log("corrupt_menu_malformed_json", method, path, "data_corrupt", 200, "Malformed JSON returned from menu endpoint")
            return Response(
                content=b'{{{invalid_json:::',
                status_code=200,
                media_type="application/json",
            )

        # ── Category E: DB connection hold (background, post-response) ───
        if _is_active("exhaust_db_connection_hold"):
            _log("exhaust_db_connection_hold", method, path, "resource_exhaust", None, "DB connection held for 2s post-response")
            # Schedule the hold in the background; the response returns immediately
            asyncio.ensure_future(_hold_connection_simulation())

        return response


async def _hold_connection_simulation() -> None:
    """Simulate holding a DB connection for 2 seconds after the response is sent."""
    # We simulate this with a sleep. In a real implementation you'd acquire
    # a connection from the pool and not release it for 2 seconds.
    await asyncio.sleep(2)
