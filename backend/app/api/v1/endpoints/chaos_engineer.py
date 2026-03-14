"""
Chaos Engineer API Endpoints
Admin-only control plane for the 23 chaos experiments.
All experiment state is kept entirely in memory — no DB writes.
State resets to all-disabled on every server restart.
"""
from __future__ import annotations

import time
from collections import deque
from datetime import datetime, timezone
from typing import Any, Deque, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.v1.endpoints.auth import require_role
from app.models.user import User, UserRole

router = APIRouter(prefix="/chaos", tags=["Chaos Engineer"])
_admin = Depends(require_role(UserRole.ADMIN))


# ─────────────────────────────────────────────────────────────────
# Experiment Definitions (static metadata only — id, name, desc, category)
# ─────────────────────────────────────────────────────────────────

EXPERIMENT_DEFS: List[Dict[str, Any]] = [
    # ── Category A: Endpoint Kills ────────────────────────────────
    {
        "id": "kill_restaurants",
        "name": "Kill Restaurant Listing",
        "description": "Returns 503 on GET /restaurants. Home page cannot load any restaurants.",
        "category": "A",
        "category_label": "API Endpoint Kills",
        "failure_type": "503_kill",
    },
    {
        "id": "kill_order_create",
        "name": "Kill Order Creation",
        "description": "Returns 503 on POST /orders. No customer can place any order.",
        "category": "A",
        "category_label": "API Endpoint Kills",
        "failure_type": "503_kill",
    },
    {
        "id": "kill_delivery_available",
        "name": "Kill Delivery Available Orders",
        "description": "Returns 503 on GET /delivery/available. Drivers see empty list.",
        "category": "A",
        "category_label": "API Endpoint Kills",
        "failure_type": "503_kill",
    },
    {
        "id": "kill_payment",
        "name": "Kill Payment Endpoint",
        "description": "Returns 503 on POST /payments/process. Checkout is impossible.",
        "category": "A",
        "category_label": "API Endpoint Kills",
        "failure_type": "503_kill",
    },
    {
        "id": "kill_user_profile",
        "name": "Kill User Profile Endpoint",
        "description": "Returns 503 on GET /auth/me. Profile pages fail to load.",
        "category": "A",
        "category_label": "API Endpoint Kills",
        "failure_type": "503_kill",
    },
    # ── Category B: Latency Injection ─────────────────────────────
    {
        "id": "latency_restaurants",
        "name": "3s Delay on Restaurant Listing",
        "description": "Adds a 3 second delay before /restaurants responds. Tests loading spinners.",
        "category": "B",
        "category_label": "Latency Injection",
        "failure_type": "latency",
        "delay_seconds": 3,
    },
    {
        "id": "latency_order_create",
        "name": "5s Delay on Order Creation",
        "description": "Adds a 5 second delay on POST /orders. Tests submit-button disabled state.",
        "category": "B",
        "category_label": "Latency Injection",
        "failure_type": "latency",
        "delay_seconds": 5,
    },
    {
        "id": "latency_auth",
        "name": "2s Delay on All Auth Endpoints",
        "description": "Adds a 2 second delay on /auth/* paths. Login and refresh are sluggish.",
        "category": "B",
        "category_label": "Latency Injection",
        "failure_type": "latency",
        "delay_seconds": 2,
    },
    {
        "id": "latency_payment",
        "name": "10s Delay on Payment Endpoint",
        "description": "Adds a 10 second delay on /payments/process. Extreme latency stress test.",
        "category": "B",
        "category_label": "Latency Injection",
        "failure_type": "latency",
        "delay_seconds": 10,
    },
    # ── Category C: Error Response Injection ──────────────────────
    {
        "id": "error_restaurants_500",
        "name": "500 from Restaurant Listing",
        "description": "Route runs normally but response is replaced with 500. Tests frontend error UI.",
        "category": "C",
        "category_label": "Error Response Injection",
        "failure_type": "error_inject",
        "injected_status": 500,
    },
    {
        "id": "error_auth_401_all",
        "name": "401 from All Protected Endpoints",
        "description": "Every authenticated endpoint returns 401. Simulates auth service outage.",
        "category": "C",
        "category_label": "Error Response Injection",
        "failure_type": "error_inject",
        "injected_status": 401,
    },
    {
        "id": "error_orders_429",
        "name": "429 from Order Creation",
        "description": "POST /orders returns 429. Tests rate-limit messaging in the frontend.",
        "category": "C",
        "category_label": "Error Response Injection",
        "failure_type": "error_inject",
        "injected_status": 429,
    },
    {
        "id": "error_delivery_track_404",
        "name": "404 from Delivery Tracking",
        "description": "Delivery /{id}/location returns 404. Simulates a lost order in tracking.",
        "category": "C",
        "category_label": "Error Response Injection",
        "failure_type": "error_inject",
        "injected_status": 404,
    },
    # ── Category D: Data Corruption ───────────────────────────────
    {
        "id": "corrupt_restaurants_empty",
        "name": "Empty Restaurant List",
        "description": "Response body overwritten with []. Tests frontend empty-state handling.",
        "category": "D",
        "category_label": "Data Corruption Injection",
        "failure_type": "data_corrupt",
    },
    {
        "id": "corrupt_order_total_zero",
        "name": "Zero Order Total",
        "description": "Multiplies order total by 0 in response. Tests whether frontend validates amounts.",
        "category": "D",
        "category_label": "Data Corruption Injection",
        "failure_type": "data_corrupt",
    },
    {
        "id": "corrupt_delivery_status_null",
        "name": "Null Delivery Status",
        "description": "Removes 'status' field from delivery response. Tests null-field resilience.",
        "category": "D",
        "category_label": "Data Corruption Injection",
        "failure_type": "data_corrupt",
    },
    {
        "id": "corrupt_menu_malformed_json",
        "name": "Malformed JSON from Menu Endpoint",
        "description": "Returns invalid JSON bytes from the menu endpoint. Tests JSON parse error handling.",
        "category": "D",
        "category_label": "Data Corruption Injection",
        "failure_type": "data_corrupt",
    },
    # ── Category E: Resource Exhaustion ───────────────────────────
    {
        "id": "exhaust_cpu_spike",
        "name": "CPU Spike Simulation",
        "description": "Runs a busy computation loop (~200ms) on every request, slowing all responses.",
        "category": "E",
        "category_label": "Resource Exhaustion Simulation",
        "failure_type": "resource_exhaust",
    },
    {
        "id": "exhaust_memory_pressure",
        "name": "Memory Pressure Simulation",
        "description": "Allocates 50 MB in-memory per request, held for request duration then released.",
        "category": "E",
        "category_label": "Resource Exhaustion Simulation",
        "failure_type": "resource_exhaust",
    },
    {
        "id": "exhaust_db_connection_hold",
        "name": "DB Connection Pool Exhaustion",
        "description": "Holds a DB connection for 2s after response. Under load, cascades into queue failures.",
        "category": "E",
        "category_label": "Resource Exhaustion Simulation",
        "failure_type": "resource_exhaust",
    },
    # ── Category F: Cascading Failures ────────────────────────────
    {
        "id": "cascade_payment_outage",
        "name": "Payment System Outage",
        "description": "Kills payment endpoint + 3s delay on order creation + 500 on order history. Simulates payment processor down.",
        "category": "F",
        "category_label": "Cascading Failure Scenarios",
        "failure_type": "cascade",
        "cascade_experiments": ["kill_payment", "latency_order_create", "error_restaurants_500"],
    },
    {
        "id": "cascade_driver_crisis",
        "name": "Driver Availability Crisis",
        "description": "Kills available deliveries + empty my-deliveries list + 5s delay on delivery status.",
        "category": "F",
        "category_label": "Cascading Failure Scenarios",
        "failure_type": "cascade",
        "cascade_experiments": ["kill_delivery_available", "corrupt_restaurants_empty", "latency_order_create"],
    },
    {
        "id": "cascade_auth_breakdown",
        "name": "Full Authentication Breakdown",
        "description": "401 on all protected endpoints + 2s delay on auth + corrupted token refresh response.",
        "category": "F",
        "category_label": "Cascading Failure Scenarios",
        "failure_type": "cascade",
        "cascade_experiments": ["kill_user_profile", "latency_auth", "error_auth_401_all"],
    },
]


# ─────────────────────────────────────────────────────────────────
# In-memory State
# ─────────────────────────────────────────────────────────────────

class _ExperimentState:
    """Singleton holding all 23 experiment on/off flags and the impact log."""

    def __init__(self) -> None:
        # Enabled flags — all start disabled
        self.enabled: Dict[str, bool] = {exp["id"]: False for exp in EXPERIMENT_DEFS}
        # Rolling impact log — last 500 entries
        self.impact_log: Deque[Dict[str, Any]] = deque(maxlen=500)

    def toggle(self, experiment_id: str) -> bool:
        """Flip the experiment and return the new state."""
        if experiment_id not in self.enabled:
            raise KeyError(experiment_id)
        new_state = not self.enabled[experiment_id]
        self.enabled[experiment_id] = new_state

        # If toggling a cascade, also flip its children
        for exp in EXPERIMENT_DEFS:
            if exp["id"] == experiment_id and exp.get("failure_type") == "cascade":
                for child_id in exp.get("cascade_experiments", []):
                    if child_id in self.enabled:
                        self.enabled[child_id] = new_state
                break

        return new_state

    def reset_all(self) -> None:
        for key in self.enabled:
            self.enabled[key] = False

    def record_impact(
        self,
        experiment_id: str,
        method: str,
        endpoint: str,
        failure_type: str,
        injected_status: Optional[int],
        detail: str,
    ) -> None:
        self.impact_log.appendleft(
            {
                "id": f"{experiment_id}_{int(time.monotonic() * 1000)}",
                "experiment_id": experiment_id,
                "method": method,
                "endpoint": endpoint,
                "failure_type": failure_type,
                "injected_status": injected_status,
                "detail": detail,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    @property
    def active_count(self) -> int:
        return sum(1 for v in self.enabled.values() if v)

    @property
    def health_label(self) -> str:
        n = self.active_count
        if n == 0:
            return "Healthy"
        if n <= 5:
            return "Degraded"
        return "Critical"

    @property
    def health_color(self) -> str:
        n = self.active_count
        if n == 0:
            return "green"
        if n <= 5:
            return "orange"
        return "red"


# Global singleton — imported by the middleware too
chaos_state = _ExperimentState()


# ─────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────────

class ExperimentResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    category_label: str
    failure_type: str
    enabled: bool
    delay_seconds: Optional[float] = None
    injected_status: Optional[int] = None
    cascade_experiments: Optional[List[str]] = None


class ExperimentsListResponse(BaseModel):
    experiments: List[ExperimentResponse]
    active_count: int
    total_count: int
    health_label: str
    health_color: str


class ToggleResponse(BaseModel):
    experiment_id: str
    enabled: bool
    active_count: int
    health_label: str
    health_color: str


class ResetResponse(BaseModel):
    reset: bool
    message: str
    active_count: int
    health_label: str


class ImpactEntry(BaseModel):
    id: str
    experiment_id: str
    method: str
    endpoint: str
    failure_type: str
    injected_status: Optional[int]
    detail: str
    timestamp: str


class ImpactLogResponse(BaseModel):
    entries: List[ImpactEntry]
    total: int


class StateResponse(BaseModel):
    active_count: int
    total_count: int
    health_label: str
    health_color: str


# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/experiments", response_model=ExperimentsListResponse)
async def list_experiments(_: User = _admin) -> ExperimentsListResponse:
    """List all 23 chaos experiments with their current enabled state. Admin only."""
    experiments = []
    for defn in EXPERIMENT_DEFS:
        experiments.append(
            ExperimentResponse(
                id=defn["id"],
                name=defn["name"],
                description=defn["description"],
                category=defn["category"],
                category_label=defn["category_label"],
                failure_type=defn["failure_type"],
                enabled=chaos_state.enabled[defn["id"]],
                delay_seconds=defn.get("delay_seconds"),
                injected_status=defn.get("injected_status"),
                cascade_experiments=defn.get("cascade_experiments"),
            )
        )
    return ExperimentsListResponse(
        experiments=experiments,
        active_count=chaos_state.active_count,
        total_count=len(EXPERIMENT_DEFS),
        health_label=chaos_state.health_label,
        health_color=chaos_state.health_color,
    )


@router.post("/experiments/{experiment_id}/toggle", response_model=ToggleResponse)
async def toggle_experiment(experiment_id: str, _: User = _admin) -> ToggleResponse:
    """Toggle a single experiment on or off. Admin only."""
    if experiment_id not in chaos_state.enabled:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found")
    new_state = chaos_state.toggle(experiment_id)
    return ToggleResponse(
        experiment_id=experiment_id,
        enabled=new_state,
        active_count=chaos_state.active_count,
        health_label=chaos_state.health_label,
        health_color=chaos_state.health_color,
    )


@router.post("/reset", response_model=ResetResponse)
async def reset_all_experiments(_: User = _admin) -> ResetResponse:
    """Emergency kill-switch: deactivate all 23 experiments simultaneously. Admin only."""
    chaos_state.reset_all()
    return ResetResponse(
        reset=True,
        message="All 23 chaos experiments have been deactivated.",
        active_count=0,
        health_label="Healthy",
    )


@router.get("/impact-log", response_model=ImpactLogResponse)
async def get_impact_log(limit: int = 100, _: User = _admin) -> ImpactLogResponse:
    """Return the last N impact log entries (requests affected by chaos experiments). Admin only."""
    entries = list(chaos_state.impact_log)[:limit]
    return ImpactLogResponse(entries=entries, total=len(chaos_state.impact_log))


@router.get("/state", response_model=StateResponse)
async def get_state(_: User = _admin) -> StateResponse:
    """Lightweight summary of the current chaos state. Admin only."""
    return StateResponse(
        active_count=chaos_state.active_count,
        total_count=len(EXPERIMENT_DEFS),
        health_label=chaos_state.health_label,
        health_color=chaos_state.health_color,
    )
