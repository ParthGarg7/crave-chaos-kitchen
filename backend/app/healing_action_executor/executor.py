"""
Healing Action Executor

Central registry that maps healing action strings to strategy classes.
When K3S_ENABLED=true, loads K3s strategies for real cluster healing.
When K3S_ENABLED=false, returns a stub result for Docker Compose mode.

Usage:
    from app.healing_action_executor.executor import execute_healing
    result = await execute_healing(machine_alert)
"""
import structlog
from typing import Any, Dict

from app.core.config import settings
from app.shared.healing_vocabulary import VALID_ACTIONS

logger = structlog.get_logger(__name__)

# Strategy registry — populated on first use
_strategies: Dict[str, Any] = {}
_loaded = False


def _load_strategies():
    global _strategies, _loaded
    if _loaded:
        return

    if settings.K3S_ENABLED:
        from app.healing_action_executor.strategies.k3s_restart import K3sRestartStrategy
        from app.healing_action_executor.strategies.k3s_scale_up import K3sScaleUpStrategy
        from app.healing_action_executor.strategies.k3s_rollback import K3sRollbackStrategy
        from app.healing_action_executor.strategies.k3s_throttle import K3sThrottleStrategy
        from app.healing_action_executor.strategies.k3s_circuit_breaker import K3sCircuitBreakerStrategy
        from app.healing_action_executor.strategies.k3s_flush_cache import K3sFlushCacheStrategy

        _strategies = {
            "restart_service":    K3sRestartStrategy(),
            "scale_up":           K3sScaleUpStrategy(),
            "rollback_deployment": K3sRollbackStrategy(),
            "throttle_requests":  K3sThrottleStrategy(),
            "circuit_breaker":    K3sCircuitBreakerStrategy(),
            "flush_cache":        K3sFlushCacheStrategy(),
        }
        logger.info("Executor: K3s strategies loaded", count=len(_strategies))
    else:
        logger.info("Executor: K3S_ENABLED=false, using Docker Compose stub mode")

    _loaded = True


async def execute_healing(machine_alert: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a healing action based on the machine_alert.

    The machine_alert must contain:
        - healing_action: str (from VALID_ACTIONS)
        - service: str (service name)

    Returns a result dict with status, message, and action details.
    """
    _load_strategies()

    action = machine_alert.get("healing_action", "none")
    service = machine_alert.get("service", "unknown")

    # Validate action
    if action not in VALID_ACTIONS:
        return {
            "status": "rejected",
            "healing_action": action,
            "message": f"Unknown healing action: {action}",
            "service": service,
            "container_restarted": None,
            "scenarios_disabled": [],
        }

    # escalate_only and none don't execute strategies
    if action in ("escalate_only", "none"):
        return {
            "status": "success",
            "healing_action": action,
            "message": f"No automated healing for action: {action}",
            "service": service,
            "container_restarted": None,
            "scenarios_disabled": [],
        }

    # Docker Compose stub mode
    if not settings.K3S_ENABLED:
        return await _docker_compose_stub(machine_alert, action, service)

    # K3s mode — execute the real strategy
    strategy = _strategies.get(action)
    if strategy is None:
        return {
            "status": "failed",
            "healing_action": action,
            "message": f"No K3s strategy registered for: {action}",
            "service": service,
            "container_restarted": None,
            "scenarios_disabled": [],
        }

    logger.info("Executor: executing K3s strategy",
                action=action, service=service)

    return await strategy.execute(machine_alert)


async def _docker_compose_stub(
    machine_alert: Dict[str, Any],
    action: str,
    service: str,
) -> Dict[str, Any]:
    """
    Docker Compose fallback: calls CRAVE /failure-simulator/heal endpoint
    to disable active scenarios. Used when K3S_ENABLED=false.
    """
    import httpx

    crave_url = machine_alert.get(
        "crave_heal_url",
        "http://crave-backend:8000/api/v1/failure-simulator/heal",
    )

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # The heal endpoint requires a developer token.
            # In Docker Compose mode we pass the token from the alert.
            headers = {}
            token = machine_alert.get("crave_token")
            if token:
                headers["Authorization"] = f"Bearer {token}"

            resp = await client.post(crave_url, headers=headers)

            if resp.status_code == 200:
                data = resp.json()
                return {
                    "status": "success",
                    "healing_action": action,
                    "message": f"Docker Compose heal: {data.get('message', 'OK')}",
                    "service": service,
                    "container_restarted": None,
                    "scenarios_disabled": data.get("scenarios_disabled", []),
                }
            else:
                return {
                    "status": "failed",
                    "healing_action": action,
                    "message": f"CRAVE heal endpoint returned {resp.status_code}",
                    "error": resp.text[:200],
                    "service": service,
                    "container_restarted": None,
                    "scenarios_disabled": [],
                }
    except Exception as e:
        return {
            "status": "failed",
            "healing_action": action,
            "message": "Docker Compose heal call failed",
            "error": str(e),
            "service": service,
            "container_restarted": None,
            "scenarios_disabled": [],
        }
