"""
Chaos Mesh Failure Detector

Checks if Chaos Mesh experiments are currently active and determines
what failure_tag CRAVE should report based on experiment type.

This allows Niramay to receive accurate failure_tag values even when
failures come from Chaos Mesh rather than CRAVE's own failure simulator.

Only active when K3S_ENABLED=true. In Docker Compose mode (default),
returns "none" immediately without making any API calls.
"""
import os
import logging

logger = logging.getLogger(__name__)

# Maps Chaos Mesh experiment kinds to failure_tag
CHAOS_KIND_TO_TAG = {
    "NetworkChaos": {
        "loss":      "database_error",       # network loss = DB unreachable
        "delay":     "payment_timeout",      # network delay = timeout
        "corrupt":   "dependency",           # corruption = dep failure
        "duplicate": "dependency",
    },
    "StressChaos": {
        "cpu":    "service_unavailable",     # CPU stress = overload
        "memory": "service_unavailable",     # memory pressure = overload
    },
    "PodChaos": {
        "pod-kill":       "service_unavailable",
        "pod-failure":    "service_unavailable",
        "container-kill": "database_error",
    },
}


def get_active_chaos_tag() -> str:
    """
    Returns the failure_tag that should be reported based on active
    Chaos Mesh experiments.

    In K3s mode: queries Kubernetes API for active Chaos Mesh
    experiments in selfhealing namespace.

    In Docker mode: returns "none" (no Chaos Mesh).

    This is called as fallback when CRAVE's own scenario injector
    is not active but failures are still happening (Chaos Mesh injecting).
    """
    k3s_enabled = os.getenv("K3S_ENABLED", "false").lower() == "true"

    if not k3s_enabled:
        return "none"

    try:
        from kubernetes import client, config

        # Try in-cluster first
        try:
            config.load_incluster_config()
        except Exception:
            config.load_kube_config()

        custom = client.CustomObjectsApi()
        namespace = os.getenv("K3S_NAMESPACE", "selfhealing")

        # Check NetworkChaos experiments
        try:
            network_chaos = custom.list_namespaced_custom_object(
                group="chaos-mesh.org",
                version="v1alpha1",
                namespace=namespace,
                plural="networkchaos",
            )
            for item in network_chaos.get("items", []):
                status = item.get("status", {})
                if status.get("phase") == "Running":
                    action = item.get("spec", {}).get("action", "")
                    tag = CHAOS_KIND_TO_TAG["NetworkChaos"].get(
                        action, "database_error"
                    )
                    logger.debug(
                        "Active NetworkChaos detected: action=%s tag=%s",
                        action, tag,
                    )
                    return tag
        except Exception:
            pass

        # Check StressChaos experiments
        try:
            stress_chaos = custom.list_namespaced_custom_object(
                group="chaos-mesh.org",
                version="v1alpha1",
                namespace=namespace,
                plural="stresschaos",
            )
            for item in stress_chaos.get("items", []):
                status = item.get("status", {})
                if status.get("phase") == "Running":
                    stressors = item.get("spec", {}).get("stressors", {})
                    if "cpu" in stressors or "memory" in stressors:
                        return "service_unavailable"
        except Exception:
            pass

        # Check PodChaos experiments
        try:
            pod_chaos = custom.list_namespaced_custom_object(
                group="chaos-mesh.org",
                version="v1alpha1",
                namespace=namespace,
                plural="podchaos",
            )
            for item in pod_chaos.get("items", []):
                status = item.get("status", {})
                if status.get("phase") == "Running":
                    action = item.get("spec", {}).get("action", "")
                    return CHAOS_KIND_TO_TAG["PodChaos"].get(
                        action, "service_unavailable"
                    )
        except Exception:
            pass

    except ImportError:
        pass  # kubernetes not installed in Docker mode
    except Exception as e:
        logger.warning(
            "ChaosDetector: could not query Chaos Mesh: %s", e,
        )

    return "none"
