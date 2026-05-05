"""
Chaos Mesh Failure Detector
Returns failure_tag for active Chaos Mesh experiments.
Only active when K3S_ENABLED=true. Returns "none" in Docker mode.
"""
import os
import logging
logger = logging.getLogger(__name__)

CHAOS_KIND_TO_TAG = {
    "NetworkChaos": {
        "loss":      "database_error",
        "delay":     "payment_timeout",
        "corrupt":   "dependency",
        "duplicate": "dependency",
    },
    "StressChaos": {
        "cpu":    "service_unavailable",
        "memory": "service_unavailable",
    },
    "PodChaos": {
        "pod-kill":       "service_unavailable",
        "pod-failure":    "service_unavailable",
        "container-kill": "database_error",
    },
}

def get_active_chaos_tag() -> str:
    k3s_enabled = os.getenv("K3S_ENABLED", "false").lower() == "true"
    if not k3s_enabled:
        return "none"
    try:
        from kubernetes import client, config
        try:
            config.load_incluster_config()
        except Exception:
            config.load_kube_config()
        custom = client.CustomObjectsApi()
        namespace = os.getenv("K3S_NAMESPACE", "selfhealing")
        for plural, kind in [("networkchaos","NetworkChaos"),("stresschaos","StressChaos"),("podchaos","PodChaos")]:
            try:
                items = custom.list_namespaced_custom_object(
                    group="chaos-mesh.org", version="v1alpha1",
                    namespace=namespace, plural=plural,
                ).get("items", [])
                for item in items:
                    if item.get("status", {}).get("phase") == "Running":
                        if kind == "NetworkChaos":
                            action = item.get("spec", {}).get("action", "")
                            return CHAOS_KIND_TO_TAG[kind].get(action, "database_error")
                        elif kind == "StressChaos":
                            stressors = item.get("spec", {}).get("stressors", {})
                            if "cpu" in stressors or "memory" in stressors:
                                return "service_unavailable"
                        elif kind == "PodChaos":
                            action = item.get("spec", {}).get("action", "")
                            return CHAOS_KIND_TO_TAG[kind].get(action, "service_unavailable")
            except Exception:
                pass
    except ImportError:
        pass
    except Exception as e:
        logger.warning("ChaosDetector: %s", e)
    return "none"
