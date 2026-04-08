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
