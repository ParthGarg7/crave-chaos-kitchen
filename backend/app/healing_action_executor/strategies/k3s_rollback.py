"""
K3s Rollback Deployment Strategy

Restores CRAVE backend Deployment to its previous ReplicaSet.
Used for: config_error
"""
import asyncio
from typing import Any, Dict
import structlog

from app.healing_action_executor.strategies.base import BaseHealingStrategy
from app.shared.k3s_client import get_apps_v1
from app.core.config import settings

logger = structlog.get_logger(__name__)


class K3sRollbackStrategy(BaseHealingStrategy):

    async def execute(self, machine_alert: Dict[str, Any]) -> Dict[str, Any]:
        service = machine_alert.get("service", "unknown")

        apps = await asyncio.get_event_loop().run_in_executor(None, get_apps_v1)
        if apps is None:
            return self._failure(
                healing_action="rollback_deployment", message="K3s API unavailable",
                error="Could not connect to K3s cluster",
                service=service, container_restarted=None, scenarios_disabled=[],
            )

        deployment_name = settings.K3S_CRAVE_DEPLOYMENT_NAME
        namespace = settings.K3S_NAMESPACE

        try:
            rs_list = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: apps.list_namespaced_replica_set(
                    namespace=namespace,
                    label_selector=f"app={deployment_name}",
                ),
            )

            replica_sets = sorted(
                rs_list.items,
                key=lambda r: r.metadata.creation_timestamp,
                reverse=True,
            )

            if len(replica_sets) < 2:
                return self._failure(
                    healing_action="rollback_deployment",
                    message="No previous ReplicaSet exists. Cannot rollback.",
                    error="Insufficient rollback history",
                    service=service, container_restarted=None, scenarios_disabled=[],
                )

            previous_rs = replica_sets[1]
            previous_template = previous_rs.spec.template

            patch = {"spec": {"template": previous_template.to_dict()}}

            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: apps.patch_namespaced_deployment(
                    name=deployment_name, namespace=namespace, body=patch,
                ),
            )

            logger.info("K3sRollbackStrategy: rolled back",
                        deployment=deployment_name, previous_rs=previous_rs.metadata.name)

            return self._success(
                healing_action="rollback_deployment",
                message=f"Rolled back {deployment_name} to ReplicaSet {previous_rs.metadata.name}.",
                service=service, container_restarted=None, scenarios_disabled=[],
                rolled_back_to=previous_rs.metadata.name, k3s_deployment=deployment_name,
            )
        except Exception as e:
            logger.error("K3sRollbackStrategy: failed", error=str(e))
            return self._failure(
                healing_action="rollback_deployment",
                message=f"Rollback failed for {deployment_name}",
                error=str(e), service=service,
                container_restarted=None, scenarios_disabled=[],
            )
