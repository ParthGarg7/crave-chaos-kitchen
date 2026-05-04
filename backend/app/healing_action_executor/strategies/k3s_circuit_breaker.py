"""
K3s Circuit Breaker Strategy

Signals circuit breaker via Redis, then scales Deployment to 1 replica.
Auto-restores after K3S_CIRCUIT_BREAKER_DURATION_SECONDS.
Used for: dependency failures, cascading failures
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


class K3sCircuitBreakerStrategy(BaseHealingStrategy):

    async def execute(self, machine_alert: Dict[str, Any]) -> Dict[str, Any]:
        service = machine_alert.get("service", "unknown")
        alert_id = machine_alert.get("alert_id", "unknown")
        duration = settings.K3S_CIRCUIT_BREAKER_DURATION_SECONDS

        # Part 1: Redis circuit breaker signal
        try:
            import redis as redis_sync
            r = redis_sync.Redis(
                host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=0,
                decode_responses=True, socket_connect_timeout=2,
            )
            signal_key = f"healing:signals:{service}:circuit_breaker"
            signal_value = json.dumps({
                "state": "open",
                "duration_seconds": duration,
                "set_at": datetime.now(timezone.utc).isoformat(),
                "set_by": "component_a", "alert_id": alert_id,
            })
            r.setex(signal_key, duration, signal_value)
            logger.info("K3sCircuitBreakerStrategy: Redis signal set", key=signal_key)
        except Exception as e:
            logger.warning("K3sCircuitBreakerStrategy: Redis failed", error=str(e))

        # Part 2: Scale to 1 replica
        apps = await asyncio.get_event_loop().run_in_executor(None, get_apps_v1)
        if apps is None:
            return self._success(
                healing_action="circuit_breaker",
                message="Redis circuit breaker signal set. K3s scaling skipped.",
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
            original_replicas = deployment.spec.replicas or 1

            patch = {"spec": {"replicas": 1}}
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: apps.patch_namespaced_deployment(
                    name=deployment_name, namespace=namespace, body=patch,
                ),
            )

            asyncio.create_task(
                self._restore_replicas(apps, deployment_name, namespace,
                                       original_replicas, duration)
            )

            return self._success(
                healing_action="circuit_breaker",
                message=f"Circuit breaker OPEN. Scaled {deployment_name} to 1 replica. "
                        f"Restores to {original_replicas} in {duration}s.",
                service=service, container_restarted=None, scenarios_disabled=[],
                original_replicas=original_replicas, duration_seconds=duration,
            )
        except Exception as e:
            return self._failure(
                healing_action="circuit_breaker",
                message="Circuit breaker K3s scaling failed",
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
            logger.info("K3sCircuitBreakerStrategy: replicas restored", replicas=original)
        except Exception as e:
            logger.error("K3sCircuitBreakerStrategy: restore failed", error=str(e))
