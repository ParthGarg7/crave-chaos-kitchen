"""
Failure Simulator API Endpoints
All endpoints are restricted to ADMIN role only.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any

from app.core.failure_config import failure_simulator
from app.models.user import User, UserRole
from app.schemas.failure_simulator import (
    FailureScenarioResponse,
    FailureScenarioUpdate,
    FailureSimulatorStatus,
    FailureSimulatorMetrics,
    PresetScenario,
    FAILURE_PRESETS
)
from app.api.v1.endpoints.auth import require_exact_role

router = APIRouter(prefix="/failure-simulator", tags=["Failure Simulator"])

# Developer-only dependency used on every endpoint
_developer = Depends(require_exact_role(UserRole.DEVELOPER))


@router.get("/status", response_model=FailureSimulatorStatus)
async def get_simulator_status(_: User = _developer):
    """Get current status of the failure simulator (developer only)"""
    metrics = failure_simulator.get_metrics()
    return FailureSimulatorStatus(
        enabled=failure_simulator.state.enabled,
        global_failure_rate=failure_simulator.state.global_failure_rate,
        active_scenarios=metrics["active_scenarios"],
        total_scenarios=metrics["total_scenarios"],
        request_count=metrics["total_requests"],
        failure_count=metrics["failed_requests"],
        success_rate=metrics["success_rate"],
        failure_rate=metrics["failure_rate"],
        last_updated=failure_simulator.state.last_updated
    )


@router.get("/metrics", response_model=FailureSimulatorMetrics)
async def get_simulator_metrics(_: User = _developer):
    """Get metrics for the failure simulator (developer only)"""
    metrics = failure_simulator.get_metrics()
    return FailureSimulatorMetrics(**metrics)


@router.get("/scenarios", response_model=Dict[str, FailureScenarioResponse])
async def list_scenarios(_: User = _developer):
    """List all available failure scenarios (developer only)"""
    scenarios = failure_simulator.list_scenarios()
    result = {}
    for name, scenario in scenarios.items():
        result[name] = FailureScenarioResponse(
            name=name,
            enabled=scenario.enabled,
            failure_type=scenario.failure_type,
            probability=scenario.probability,
            endpoints=scenario.endpoints,
            methods=scenario.methods,
            error_message=scenario.error_message,
            rate_limit_requests=scenario.rate_limit_requests,
            rate_limit_window=scenario.rate_limit_window,
            timeout_seconds=scenario.timeout_seconds
        )
    return result


@router.get("/scenarios/{name}", response_model=FailureScenarioResponse)
async def get_scenario(name: str, _: User = _developer):
    """Get a specific failure scenario (developer only)"""
    scenario = failure_simulator.get_scenario(name)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{name}' not found")
    
    return FailureScenarioResponse(
        name=name,
        enabled=scenario.enabled,
        failure_type=scenario.failure_type,
        probability=scenario.probability,
        endpoints=scenario.endpoints,
        methods=scenario.methods,
        error_message=scenario.error_message,
        rate_limit_requests=scenario.rate_limit_requests,
        rate_limit_window=scenario.rate_limit_window,
        timeout_seconds=scenario.timeout_seconds
    )


@router.post("/scenarios/{name}/enable")
async def enable_scenario(name: str, _: User = _developer):
    """Enable a failure scenario (developer only)"""
    if name not in failure_simulator.state.scenarios:
        raise HTTPException(status_code=404, detail=f"Scenario '{name}' not found")
    
    failure_simulator.enable_scenario(name)
    return {"message": f"Scenario '{name}' enabled", "scenario": name}


@router.post("/scenarios/{name}/disable")
async def disable_scenario(name: str, _: User = _developer):
    """Disable a failure scenario (developer only)"""
    if name not in failure_simulator.state.scenarios:
        raise HTTPException(status_code=404, detail=f"Scenario '{name}' not found")
    
    failure_simulator.disable_scenario(name)
    return {"message": f"Scenario '{name}' disabled", "scenario": name}


@router.patch("/scenarios/{name}", response_model=FailureScenarioResponse)
async def update_scenario(name: str, update: FailureScenarioUpdate, _: User = _developer):
    """Update a failure scenario (developer only)"""
    if name not in failure_simulator.state.scenarios:
        raise HTTPException(status_code=404, detail=f"Scenario '{name}' not found")
    
    # Build update dict with only provided fields
    update_data = update.model_dump(exclude_unset=True)
    failure_simulator.update_scenario(name, **update_data)
    
    # Return updated scenario
    scenario = failure_simulator.get_scenario(name)
    return FailureScenarioResponse(
        name=name,
        enabled=scenario.enabled,
        failure_type=scenario.failure_type,
        probability=scenario.probability,
        endpoints=scenario.endpoints,
        methods=scenario.methods,
        error_message=scenario.error_message,
        rate_limit_requests=scenario.rate_limit_requests,
        rate_limit_window=scenario.rate_limit_window,
        timeout_seconds=scenario.timeout_seconds
    )


@router.post("/reset")
async def reset_all_scenarios(_: User = _developer):
    """Reset all scenarios to disabled (developer only)"""
    failure_simulator.reset_all()
    return {"message": "All failure scenarios have been reset"}


@router.post("/heal")
async def heal_service(_: User = _developer):
    """
    Healing endpoint called by Component A to disable all active 
    failure scenarios and stop the auto-injector.
    
    This endpoint is the contract between Niramay Component A 
    and CRAVE. When Component A executes a healing action, it 
    calls this endpoint to:
    1. Disable all currently active failure scenarios
    2. Signal the auto-injector to pause
    3. Return what was disabled for Component A audit logging
    
    No connections to Component A are made here.
    The auto-injector pause is implemented via two permanent Redis keys
    (no TTL) so it stays paused until the developer explicitly clears it
    via the Injector Control page:
      crave:injector:paused = "1"   (heal marker)
      crave:injector:state  = "paused"

    Returns:
      healed: bool
      scenarios_disabled: list of scenario names that were active
      count: number of scenarios disabled
      injector_state: "paused"
      message: str
      timestamp: ISO8601
    """
    from datetime import datetime, timezone
    import redis as redis_sync
    from app.core.config import settings

    # Find all currently active scenarios before disabling
    active_scenarios = [
        name for name, scenario 
        in failure_simulator.state.scenarios.items()
        if scenario.enabled
    ]
    
    # Disable all active scenarios
    failure_simulator.reset_all()
    
    # Pause the auto-injector permanently via Redis (no TTL)
    try:
        r = redis_sync.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=0,
            decode_responses=True
        )
        r.set("crave:injector:paused", "1")
        r.set("crave:injector:state", "paused")
    except Exception:
        pass

    return {
        "healed": True,
        "scenarios_disabled": active_scenarios,
        "count": len(active_scenarios),
        "injector_state": "paused",
        "message": "Injector paused permanently until manually resumed via Injector Control page",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.post("/global-rate")
async def set_global_failure_rate(rate: float = Query(..., ge=0.0, le=1.0), _: User = _developer):
    """Set a global failure rate (0-1) that applies to all requests (developer only)"""
    failure_simulator.state.global_failure_rate = rate
    return {
        "message": f"Global failure rate set to {rate * 100}%",
        "global_failure_rate": rate
    }


@router.post("/payment-config")
async def set_payment_config(
    card_success_rate: float = Query(..., ge=0.0, le=1.0),
    upi_success_rate: float = Query(..., ge=0.0, le=1.0),
    _: User = _developer,
):
    """Configure payment gateway success rates for card and UPI (admin only)."""
    failure_simulator.state.payment_success_rate_card = card_success_rate
    failure_simulator.state.payment_success_rate_upi = upi_success_rate
    return {
        "message": "Payment gateway simulator config updated",
        "payment_success_rate_card": card_success_rate,
        "payment_success_rate_upi": upi_success_rate,
    }


@router.get("/payment-config")
async def get_payment_config(_: User = _developer):
    """Get payment gateway simulator success-rate configuration."""
    return {
        "payment_success_rate_card": failure_simulator.state.payment_success_rate_card,
        "payment_success_rate_upi": failure_simulator.state.payment_success_rate_upi,
    }


@router.get("/presets", response_model=Dict[str, PresetScenario])
async def list_presets(_: User = _developer):
    """List available failure presets (developer only)"""
    return {
        name: PresetScenario(name=preset["name"], description=preset["description"], scenarios=preset.get("scenarios", {}))
        for name, preset in FAILURE_PRESETS.items()
    }


@router.post("/presets/{preset_name}/apply")
async def apply_preset(preset_name: str, _: User = _developer):
    """Apply a failure preset (developer only)"""
    if preset_name not in FAILURE_PRESETS:
        raise HTTPException(status_code=404, detail=f"Preset '{preset_name}' not found")
    
    preset = FAILURE_PRESETS[preset_name]
    
    # Reset first
    failure_simulator.reset_all()
    
    # Apply preset scenarios
    for scenario_name, scenario_config in preset.get("scenarios", {}).items():
        if scenario_name in failure_simulator.state.scenarios:
            failure_simulator.update_scenario(scenario_name, **scenario_config)
            failure_simulator.enable_scenario(scenario_name)
    
    return {
        "message": f"Applied preset: {preset['name']}",
        "preset": preset_name,
        "description": preset["description"],
        "scenarios_applied": len(preset.get("scenarios", {}))
    }


@router.post("/toggle")
async def toggle_simulator(enabled: bool = Query(...), _: User = _developer):
    """Enable or disable the entire failure simulator (developer only)"""
    failure_simulator.state.enabled = enabled
    return {
        "message": f"Failure simulator {'enabled' if enabled else 'disabled'}",
        "enabled": enabled
    }


@router.get("/health")
async def health_check(_: User = _developer):
    """Health check endpoint that may fail based on configuration (developer only)"""
    return {
        "status": "healthy",
        "simulator_enabled": failure_simulator.state.enabled,
        "active_scenarios": sum(1 for s in failure_simulator.state.scenarios.values() if s.enabled)
    }


# ── Injector Control endpoints ────────────────────────────────────────────────

@router.get("/injector/state")
async def get_injector_state(_: User = _developer):
    """
    Returns current state of the auto-injector and traffic generator
    by reading Redis keys directly.
    """
    import redis as redis_sync
    from app.core.config import settings
    try:
        r = redis_sync.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=0,
            decode_responses=True
        )
        injector_state = r.get("crave:injector:state") or "idle"
        traffic_enabled = r.get("crave:traffic:enabled")
        current_scenario = r.get("crave:injector:current")
        is_paused_by_heal = r.exists("crave:injector:paused") > 0
        return {
            "injector_state": injector_state,
            "traffic_enabled": traffic_enabled != "0",
            "current_scenario": current_scenario,
            "is_paused_by_heal": is_paused_by_heal,
        }
    except Exception as e:
        return {
            "injector_state": "unknown",
            "traffic_enabled": True,
            "current_scenario": None,
            "is_paused_by_heal": False,
            "error": str(e),
        }


@router.post("/injector/state")
async def set_injector_state(
    state: str,
    _: User = _developer
):
    """
    Set the auto-injector state.
    state must be one of: idle, active.
    paused is set only by the heal endpoint and cleared only via clear-pause.
    """
    import redis as redis_sync
    from app.core.config import settings
    if state not in ("idle", "active"):
        raise HTTPException(
            status_code=400,
            detail="state must be idle or active"
        )
    try:
        r = redis_sync.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=0,
            decode_responses=True
        )
        r.set("crave:injector:state", state)
        if state == "idle":
            r.delete("crave:injector:current")
        return {
            "injector_state": state,
            "message": f"Injector set to {state}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/injector/traffic")
async def set_traffic_state(
    enabled: bool,
    _: User = _developer
):
    """
    Enable or disable the traffic generator.
    When disabled the injector stops making HTTP requests to CRAVE
    so no new logs are produced.
    """
    import redis as redis_sync
    from app.core.config import settings
    try:
        r = redis_sync.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=0,
            decode_responses=True
        )
        r.set("crave:traffic:enabled", "1" if enabled else "0")
        return {
            "traffic_enabled": enabled,
            "message": f"Traffic generator {'enabled' if enabled else 'disabled'}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/injector/clear-pause")
async def clear_injector_pause(_: User = _developer):
    """
    Clear the heal-triggered pause.
    Deletes the pause marker and sets state back to idle so the developer
    can manually restart injection when ready.
    Does NOT automatically restart injection — developer must explicitly
    set state to active.
    """
    import redis as redis_sync
    from app.core.config import settings
    try:
        r = redis_sync.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=0,
            decode_responses=True
        )
        r.delete("crave:injector:paused")
        r.set("crave:injector:state", "idle")
        return {
            "message": "Heal pause cleared. Injector set to idle. Click START INJECTION to resume.",
            "injector_state": "idle"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── RabbitMQ publishing control ───────────────────────────────────────────────

@router.get("/rabbitmq/state")
async def get_rabbitmq_state(_: User = _developer):
    """
    Returns whether CRAVE is currently publishing
    logs to Niramay's RabbitMQ.
    """
    import redis as redis_sync
    from app.core.config import settings
    try:
        r = redis_sync.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=0,
            decode_responses=True,
        )
        enabled = r.get("crave:rabbitmq:enabled")
        host_configured = bool((settings.RABBITMQ_HOST or "").strip())
        return {
            "publishing_enabled": enabled == "1",
            "rabbitmq_host_configured": host_configured,
            "rabbitmq_host": settings.RABBITMQ_HOST or "",
            "rabbitmq_queue": settings.RABBITMQ_QUEUE,
            "ready": host_configured and enabled == "1",
        }
    except Exception as e:
        return {
            "publishing_enabled": False,
            "rabbitmq_host_configured": False,
            "rabbitmq_host": "",
            "rabbitmq_queue": "",
            "ready": False,
            "error": str(e),
        }


@router.post("/rabbitmq/state")
async def set_rabbitmq_state(
    enabled: bool,
    _: User = _developer,
):
    """
    Enable or disable log publishing to Niramay RabbitMQ.
    When enabled CRAVE starts sending all observation
    logs to niramay-rabbitmq:5672 queue component-c-logs.
    When disabled logs are only stored locally in
    PostgreSQL and Redis as usual.
    Requires RABBITMQ_HOST to be configured in
    docker-compose.yml environment.
    """
    import redis as redis_sync
    from app.core.config import settings
    host = (settings.RABBITMQ_HOST or "").strip()
    if enabled and not host:
        raise HTTPException(
            status_code=400,
            detail=(
                "RABBITMQ_HOST is not configured. "
                "Set RABBITMQ_HOST: niramay-rabbitmq in "
                "docker-compose.yml backend environment "
                "and restart the backend container."
            ),
        )
    try:
        r = redis_sync.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=0,
            decode_responses=True,
        )
        r.set("crave:rabbitmq:enabled", "1" if enabled else "0")
        return {
            "publishing_enabled": enabled,
            "rabbitmq_host": host,
            "rabbitmq_queue": settings.RABBITMQ_QUEUE,
            "message": (
                f"RabbitMQ publishing {'ENABLED' if enabled else 'DISABLED'}. "
                + (
                    f"Logs now flowing to {host} queue {settings.RABBITMQ_QUEUE}"
                    if enabled else
                    "Logs stored locally only."
                )
            ),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
