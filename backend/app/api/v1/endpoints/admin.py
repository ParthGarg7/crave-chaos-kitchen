"""
Admin API Endpoints
Provides a live session registry and user management for admins only.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import csv

from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.restaurant import Restaurant
from app.models.delivery import Delivery, DeliveryStatus
from app.schemas.user import UserResponse
from app.api.v1.endpoints.auth import get_current_user, require_role

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Session Registry Schema (inline) ─────────────────────────────────────


def _build_registry_entry(user: User, db: Session) -> dict:
    """Build a session registry entry for a user."""
    # Find restaurant association
    restaurant = None
    restaurant_name = None
    if user.role == UserRole.RESTAURANT_OWNER:
        restaurant = db.query(Restaurant).filter(
            Restaurant.owner_id == user.id
        ).first()
        if restaurant:
            restaurant_name = restaurant.name

    # Find driver association (last active delivery)
    driver_delivery = None
    active_order_id = None
    if user.role == UserRole.DRIVER:
        driver_delivery = db.query(Delivery).filter(
            Delivery.driver_id == user.id,
            Delivery.status.notin_([DeliveryStatus.DELIVERED, DeliveryStatus.FAILED])
        ).order_by(Delivery.assigned_at.desc()).first()
        if driver_delivery:
            active_order_id = driver_delivery.order_id

    # Session active = last login within 30 minutes
    session_active = False
    if user.last_login:
        delta = (datetime.utcnow() - user.last_login.replace(tzinfo=None)).total_seconds()
        session_active = delta < 1800  # 30 minutes

    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": f"{user.first_name} {user.last_name}",
        "role": user.role.value,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "session_status": "active" if session_active else "inactive",
        "restaurant_id": restaurant.id if restaurant else None,
        "restaurant_name": restaurant_name,
        "active_delivery_id": driver_delivery.id if driver_delivery else None,
        "active_order_id": active_order_id,
        "account_created": user.created_at.isoformat() if user.created_at else None,
    }


@router.get("/session-registry", response_model=List[dict])
async def get_session_registry(
    role: Optional[str] = None,
    session_status: Optional[str] = None,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Get a live registry of all users with their session status,
    associated restaurant/driver info, and last login timestamp.
    Admin only.
    """
    query = db.query(User)

    if role:
        try:
            role_enum = UserRole(role)
            query = query.filter(User.role == role_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {role}"
            )

    users = query.order_by(User.last_login.desc().nullslast()).all()
    registry = [_build_registry_entry(u, db) for u in users]

    # Filter by session status if requested
    if session_status in ("active", "inactive"):
        registry = [r for r in registry if r["session_status"] == session_status]

    return registry


@router.get("/session-registry/export")
async def export_session_registry(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Export the full session registry as a downloadable CSV file.
    Admin only.
    """
    users = db.query(User).order_by(User.last_login.desc().nullslast()).all()
    registry = [_build_registry_entry(u, db) for u in users]

    output = io.StringIO()
    fieldnames = [
        "user_id", "email", "full_name", "role", "is_active", "is_verified",
        "last_login", "session_status", "restaurant_id", "restaurant_name",
        "active_delivery_id", "active_order_id", "account_created"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(registry)

    output.seek(0)
    filename = f"session_registry_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """List all users with optional filtering. Admin only."""
    query = db.query(User)

    if role:
        try:
            role_enum = UserRole(role)
            query = query.filter(User.role == role_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    users = query.offset(skip).limit(limit).all()
    return users


@router.patch("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Activate or reactivate a user account. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    db.commit()
    return {"message": f"User {user.email} activated", "user_id": user_id}


@router.patch("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Deactivate a user account. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    user.is_active = False
    db.commit()
    return {"message": f"User {user.email} deactivated", "user_id": user_id}


@router.patch("/restaurants/{restaurant_id}/approve")
async def approve_restaurant(
    restaurant_id: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Approve a restaurant (set status to ACTIVE). Admin only."""
    from app.models.restaurant import Restaurant, RestaurantStatus
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant.status = RestaurantStatus.ACTIVE
    db.commit()
    return {
        "message": f"Restaurant '{restaurant.name}' approved",
        "restaurant_id": restaurant_id,
        "status": "active"
    }


@router.get("/restaurants", response_model=List[dict])
async def list_all_restaurants(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """List all restaurants with owner info. Admin only."""
    from app.models.restaurant import Restaurant
    restaurants = db.query(Restaurant).all()
    result = []
    for r in restaurants:
        result.append({
            "id": r.id,
            "name": r.name,
            "status": r.status.value,
            "owner_id": r.owner_id,
            "owner_email": r.owner.email if r.owner else None,
            "owner_name": f"{r.owner.first_name} {r.owner.last_name}" if r.owner else None,
            "cuisine_type": r.cuisine_type.value,
            "city": r.city,
            "rating": r.rating,
            "menu_item_count": len(r.menu_items),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return result
