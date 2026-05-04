"""
K3s Flush Cache Strategy

Exec into the CRAVE Redis pod and runs FLUSHDB to clear
stale cache entries. Only in K3s mode.
Used for: cache_error, general cache poisoning
"""
import asyncio
from typing import Any, Dict
import structlog

from app.healing_action_executor.strategies.base import BaseHealingStrategy
from app.shared.k3s_client import get_core_v1
from app.core.config import settings

logger = structlog.get_logger(__name__)


class K3sFlushCacheStrategy(BaseHealingStrategy):

    async def execute(self, machine_alert: Dict[str, Any]) -> Dict[str, Any]:
        service = machine_alert.get("service", "unknown")

        core = await asyncio.get_event_loop().run_in_executor(None, get_core_v1)
        if core is None:
            return self._failure(
                healing_action="flush_cache",
                message="K3s API unavailable",
                error="Could not connect to K3s cluster",
                service=service, container_restarted=None, scenarios_disabled=[],
            )

        namespace = settings.K3S_NAMESPACE
        pod_label = settings.K3S_CRAVE_REDIS_POD_LABEL

        try:
            pods = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: core.list_namespaced_pod(
                    namespace=namespace, label_selector=pod_label,
                ),
            )

            if not pods.items:
                return self._failure(
                    healing_action="flush_cache",
                    message=f"No pods found with label {pod_label}",
                    error="Pod not found",
                    service=service, container_restarted=None, scenarios_disabled=[],
                )

            redis_pod = pods.items[0].metadata.name

            from kubernetes.stream import stream
            resp = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: stream(
                    core.connect_get_namespaced_pod_exec,
                    name=redis_pod,
                    namespace=namespace,
                    command=["redis-cli", "FLUSHDB"],
                    stderr=True, stdin=False, stdout=True, tty=False,
                ),
            )

            logger.info("K3sFlushCacheStrategy: flushed", pod=redis_pod, output=resp)

            return self._success(
                healing_action="flush_cache",
                message=f"Cache flushed on {redis_pod}",
                service=service, container_restarted=None, scenarios_disabled=[],
                redis_pod=redis_pod, output=resp,
            )
        except Exception as e:
            logger.error("K3sFlushCacheStrategy: failed", error=str(e))
            return self._failure(
                healing_action="flush_cache",
                message="Cache flush failed",
                error=str(e), service=service,
                container_restarted=None, scenarios_disabled=[],
            )
