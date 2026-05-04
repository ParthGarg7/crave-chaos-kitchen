"""
K3s Restart Service Strategy

Performs a Kubernetes rolling restart of the CRAVE backend Deployment
by patching the restartedAt annotation. K3s replaces pods one by one
so the service stays available during restart.

Used for: database_error, payment_timeout
"""
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict
import structlog

from app.healing_action_executor.strategies.base import BaseHealingStrategy
from app.shared.k3s_client import get_apps_v1
from app.core.config import settings

logger = structlog.get_logger(__name__)


class K3sRestartStrategy(BaseHealingStrategy):

    async def execute(self, machine_alert: Dict[str, Any]) -> Dict[str, Any]:
        service = machine_alert.get("service", "unknown")
        alert_id = machine_alert.get("alert_id", "unknown")

        logger.info("K3sRestartStrategy: starting", service=service, alert_id=alert_id)

        apps = await asyncio.get_event_loop().run_in_executor(None, get_apps_v1)
        if apps is None:
            return self._failure(
                healing_action="restart_service",
                message="K3s API unavailable",
                error="Could not connect to K3s cluster",
                service=service, container_restarted=None, scenarios_disabled=[],
            )

        deployment_name = settings.K3S_CRAVE_DEPLOYMENT_NAME
        namespace = settings.K3S_NAMESPACE
        now = datetime.now(timezone.utc).isoformat()

        try:
            patch = {
                "spec": {
                    "template": {
                        "metadata": {
                            "annotations": {
                                "kubectl.kubernetes.io/restartedAt": now
                            }
                        }
                    }
                }
            }

            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: apps.patch_namespaced_deployment(
                    name=deployment_name, namespace=namespace, body=patch,
                ),
            )

            logger.info("K3sRestartStrategy: triggered", deployment=deployment_name)

            return self._success(
                healing_action="restart_service",
                message=f"Rolling restart triggered on {deployment_name} in {namespace}.",
                service=service, container_restarted=deployment_name, scenarios_disabled=[],
                k3s_deployment=deployment_name, k3s_namespace=namespace,
            )
        except Exception as e:
            logger.error("K3sRestartStrategy: failed", error=str(e))
            return self._failure(
                healing_action="restart_service",
                message=f"Rolling restart failed on {deployment_name}",
                error=str(e), service=service,
                container_restarted=None, scenarios_disabled=[],
            )
