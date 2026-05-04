"""
K3s Scale Up Strategy

Increases CRAVE backend Deployment replica count by 1 (up to K3S_MAX_REPLICAS).
Used for: service_unavailable, high_latency, rate_based_error_spike
"""
import asyncio
from typing import Any, Dict
import structlog

from app.healing_action_executor.strategies.base import BaseHealingStrategy
from app.shared.k3s_client import get_apps_v1
from app.core.config import settings

logger = structlog.get_logger(__name__)


class K3sScaleUpStrategy(BaseHealingStrategy):

    async def execute(self, machine_alert: Dict[str, Any]) -> Dict[str, Any]:
        service = machine_alert.get("service", "unknown")

        apps = await asyncio.get_event_loop().run_in_executor(None, get_apps_v1)
        if apps is None:
            return self._failure(
                healing_action="scale_up", message="K3s API unavailable",
                error="Could not connect to K3s cluster",
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
            new_replicas = min(current_replicas + 1, settings.K3S_MAX_REPLICAS)

            if new_replicas == current_replicas:
                return self._failure(
                    healing_action="scale_up",
                    message=f"Already at maximum replicas ({settings.K3S_MAX_REPLICAS}).",
                    error="Max replicas reached",
                    service=service, container_restarted=None, scenarios_disabled=[],
                )

            patch = {"spec": {"replicas": new_replicas}}
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: apps.patch_namespaced_deployment(
                    name=deployment_name, namespace=namespace, body=patch,
                ),
            )

            logger.info("K3sScaleUpStrategy: scaled", deployment=deployment_name,
                        previous=current_replicas, new=new_replicas)

            return self._success(
                healing_action="scale_up",
                message=f"Scaled {deployment_name} from {current_replicas} to {new_replicas} replicas.",
                service=service, container_restarted=None, scenarios_disabled=[],
                previous_replicas=current_replicas, new_replicas=new_replicas,
                k3s_deployment=deployment_name,
            )
        except Exception as e:
            logger.error("K3sScaleUpStrategy: failed", error=str(e))
            return self._failure(
                healing_action="scale_up",
                message=f"Scale up failed for {deployment_name}",
                error=str(e), service=service,
                container_restarted=None, scenarios_disabled=[],
            )
