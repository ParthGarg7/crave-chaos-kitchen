"""
K3s Throttle Requests Strategy

Two-part throttling: Redis signal + scale down by 1 replica.
Auto-restores after THROTTLE_RESTORE_SECONDS.
Used for: rate_limiting
"""
import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict
import structlog

from app.healing_action_executor.strategies.base import BaseHealingStrategy
from app.shared.k3s_client import get_apps_v1
from app.core.config import settings

logger = structlog.get_logger(__name__)

THROTTLE_RESTORE_SECONDS = 300
THROTTLE_RATE_LIMIT_RPS = 10


class K3sThrottleStrategy(BaseHealingStrategy):

    async def execute(self, machine_alert: Dict[str, Any]) -> Dict[str, Any]:
        service = machine_alert.get("service", "unknown")
        alert_id = machine_alert.get("alert_id", "unknown")

        # Part 1: Write Redis signal
        try:
            import redis as redis_sync
            r = redis_sync.Redis(
                host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=0,
                decode_responses=True, socket_connect_timeout=2,
            )
            signal_key = f"healing:signals:{service}:throttle"
            signal_value = json.dumps({
                "rate_limit_rps": THROTTLE_RATE_LIMIT_RPS,
                "duration_seconds": THROTTLE_RESTORE_SECONDS,
                "set_at": datetime.now(timezone.utc).isoformat(),
                "set_by": "component_a", "alert_id": alert_id,
            })
            r.setex(signal_key, THROTTLE_RESTORE_SECONDS, signal_value)
            logger.info("K3sThrottleStrategy: Redis signal written", key=signal_key)
        except Exception as e:
            logger.warning("K3sThrottleStrategy: Redis signal failed", error=str(e))

        # Part 2: Scale down by 1 via K3s
        apps = await asyncio.get_event_loop().run_in_executor(None, get_apps_v1)
        if apps is None:
            return self._success(
                healing_action="throttle_requests",
                message="Redis throttle signal written. K3s scale-down skipped.",
                service=service, container_restarted=None, scenarios_disabled=[],
            )

        deployment_name = settings.K3S_CRAVE_DEPLOYMENT_NAME
        namespace = settings.K3S_NAMESPACE

        try:
            deployment = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: apps.read_namespaced_deployment(
                    name=deployment_name, namespace=namespace,
                ),
            )
            current_replicas = deployment.spec.replicas or 1
            new_replicas = max(current_replicas - 1, 1)

            if new_replicas < current_replicas:
                patch = {"spec": {"replicas": new_replicas}}
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: apps.patch_namespaced_deployment(
                        name=deployment_name, namespace=namespace, body=patch,
                    ),
                )
                asyncio.create_task(
                    self._restore_replicas(apps, deployment_name, namespace,
                                           current_replicas, THROTTLE_RESTORE_SECONDS)
                )

            return self._success(
                healing_action="throttle_requests",
                message=f"Throttle applied: scaled {current_replicas} to {new_replicas}. Restores in {THROTTLE_RESTORE_SECONDS}s.",
                service=service, container_restarted=None, scenarios_disabled=[],
                previous_replicas=current_replicas, throttled_replicas=new_replicas,
            )
        except Exception as e:
            return self._failure(
                healing_action="throttle_requests", message="K3s scale-down failed",
                error=str(e), service=service,
                container_restarted=None, scenarios_disabled=[],
            )

    async def _restore_replicas(self, apps, deployment_name, namespace, original, wait):
        await asyncio.sleep(wait)
        try:
            patch = {"spec": {"replicas": original}}
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: apps.patch_namespaced_deployment(
                    name=deployment_name, namespace=namespace, body=patch,
                ),
            )
            logger.info("K3sThrottleStrategy: replicas restored", replicas=original)
        except Exception as e:
            logger.error("K3sThrottleStrategy: restore failed", error=str(e))
