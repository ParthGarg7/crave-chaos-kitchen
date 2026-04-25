"""
CRAVE Service Registry
======================
Maps incoming request path prefixes to logical service names.

Each service name corresponds to a distinct domain within CRAVE.
When CRAVE is eventually split into real microservices, these names
should match the Docker container names exactly so that Niramay's
healing actions (restart_service, scale_up, etc.) can target the
correct container without any renaming.

To add a new service:
  1. Add a new (prefix, service_name) tuple to _SERVICE_ROUTES below,
     ordered from most-specific to least-specific prefix.
  2. That is it — ObservationMiddleware picks it up automatically.
"""
from __future__ import annotations

from typing import List, Tuple

# ── Service route table ───────────────────────────────────────────────────────
# Each entry is (path_prefix, service_name).
# Rules:
#   - Evaluated top-to-bottom; first match wins.
#   - More specific prefixes must come before less specific ones.
#   - All names use the kebab-case "crave-<domain>" convention so they
#     can map 1-to-1 to future Docker container names.
# ─────────────────────────────────────────────────────────────────────────────
_SERVICE_ROUTES: List[Tuple[str, str]] = [
    # Authentication & session management
    ("/api/v1/auth",               "crave-auth"),

    # Restaurant browsing, management and menu
    ("/api/v1/restaurants",        "crave-restaurant"),

    # Order lifecycle (create, track, cancel)
    ("/api/v1/orders",             "crave-orders"),

    # Payment processing & gateway
    ("/api/v1/payments",           "crave-payments"),

    # Driver assignment, tracking & delivery status
    ("/api/v1/delivery",           "crave-delivery"),

    # Admin operations (user management, approvals)
    ("/api/v1/admin",              "crave-admin"),

    # Contact & customer support notifications
    ("/api/v1/contact",            "crave-notification"),

    # Developer dashboard data (active calls, endpoint stats)
    ("/api/v1/developer",          "crave-developer"),

    # Chaos engineering experiment control
    ("/api/v1/chaos",              "crave-chaos"),

    # Failure injection simulator control
    ("/api/v1/failure-simulator",  "crave-simulator"),

    # Observation log retrieval
    ("/api/v1/observation",        "crave-observation"),
]

# Fallback used when no prefix matches (health check, root, unknown paths)
_FALLBACK_SERVICE = "crave-gateway"


def resolve_service(path: str) -> str:
    """
    Return the logical service name for a given request path.

    Evaluated top-to-bottom; the first matching prefix wins.
    Returns crave-gateway if no prefix matches.

    Examples
    --------
    >>> resolve_service("/api/v1/payments/process")
    'crave-payments'
    >>> resolve_service("/api/v1/auth/login")
    'crave-auth'
    >>> resolve_service("/health")
    'crave-gateway'
    """
    for prefix, service_name in _SERVICE_ROUTES:
        if path.startswith(prefix):
            return service_name
    return _FALLBACK_SERVICE


def list_services() -> List[str]:
    """Return all registered service names including the fallback."""
    names = [svc for _, svc in _SERVICE_ROUTES]
    names.append(_FALLBACK_SERVICE)
    return names


def list_routes() -> List[Tuple[str, str]]:
    """Return the full route table as a list of (prefix, service_name) tuples."""
    return list(_SERVICE_ROUTES)
