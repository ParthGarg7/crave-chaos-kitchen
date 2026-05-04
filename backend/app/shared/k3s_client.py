"""
K3s Client Factory

Shared entry point for all K3s healing strategies.
K3s exposes the standard Kubernetes REST API so the
official kubernetes Python library works unchanged.

Authentication modes (set by K3S_IN_CLUSTER):
    True  - In-cluster service account
    False - Local kubeconfig from ~/.kube/config

Safety contract:
    Returns None if kubernetes library not installed.
    Returns None if cluster unreachable.
    Never raises exceptions.
    All callers must check for None before using.
"""
import structlog
from typing import Optional

logger = structlog.get_logger(__name__)

_config_loaded: bool = False


def _load_k3s_config() -> bool:
    try:
        from kubernetes import config as k8s_config
        from app.core.config import settings

        if settings.K3S_IN_CLUSTER:
            try:
                k8s_config.load_incluster_config()
                logger.info("K3s: loaded in-cluster service account")
                return True
            except k8s_config.ConfigException:
                logger.warning(
                    "K3s: in-cluster failed, trying kubeconfig"
                )

        k8s_config.load_kube_config()
        logger.info("K3s: loaded local kubeconfig")
        return True

    except ImportError:
        logger.warning(
            "K3s: kubernetes library not installed. "
            "pip install kubernetes>=28.1.0"
        )
        return False
    except Exception as e:
        logger.error("K3s: config load failed", error=str(e))
        return False


def _ensure_config() -> bool:
    global _config_loaded
    if not _config_loaded:
        _config_loaded = _load_k3s_config()
    return _config_loaded


def get_apps_v1():
    """
    Return AppsV1Api for Deployment operations.
    Used by: k3s_restart, k3s_scale_up, k3s_rollback,
             k3s_throttle, k3s_circuit_breaker
    Returns None if unavailable.
    """
    if not _ensure_config():
        return None
    try:
        from kubernetes import client
        return client.AppsV1Api()
    except Exception as e:
        logger.error("K3s: AppsV1Api creation failed", error=str(e))
        return None


def get_core_v1():
    """
    Return CoreV1Api for Pod operations.
    Used by: k3s_flush_cache (exec into Redis pod)
    Returns None if unavailable.
    """
    if not _ensure_config():
        return None
    try:
        from kubernetes import client
        return client.CoreV1Api()
    except Exception as e:
        logger.error("K3s: CoreV1Api creation failed", error=str(e))
        return None


def get_custom_objects():
    """
    Return CustomObjectsApi for Chaos Mesh resources.
    Returns None if unavailable.
    """
    if not _ensure_config():
        return None
    try:
        from kubernetes import client
        return client.CustomObjectsApi()
    except Exception as e:
        logger.error("K3s: CustomObjectsApi creation failed", error=str(e))
        return None
