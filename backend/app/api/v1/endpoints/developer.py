"""
Developer API Endpoints — for Chaos Engineer dashboard (admin only)
"""
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Request

from app.api.v1.endpoints.auth import require_role
from app.models.user import User, UserRole
from app.middleware.api_tracker import get_active_requests, get_recent_calls

router = APIRouter(prefix="/developer", tags=["Developer"])


@router.get("/active-calls")
async def get_active_api_calls(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
) -> Dict[str, Any]:
    """Return in-flight API requests + recent call history for the Chaos Engineer dashboard."""
    return {
        "active": get_active_requests(),
        "recent": get_recent_calls(),
    }


@router.get("/endpoints")
async def get_registered_endpoints(
    request: Request,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
) -> Dict[str, Any]:
    """Return all registered API routes from the FastAPI app."""
    app = request.app
    routes: List[Dict[str, Any]] = []

    for route in app.routes:
        # Only include APIRoute objects (skip mounting, static, etc.)
        if hasattr(route, "methods") and hasattr(route, "path"):
            routes.append({
                "path": route.path,
                "methods": sorted(list(route.methods)) if route.methods else [],
                "name": getattr(route, "name", ""),
            })

    # Sort by path for readability
    routes.sort(key=lambda r: r["path"])

    return {"endpoints": routes, "total": len(routes)}
