"""
Delivery API Endpoints
"""
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import update

from app.db.base import get_db
from app.models.delivery import Delivery, DeliveryStatus, DriverLocation
from app.models.order import Order, OrderStatus, PaymentStatus
from app.models.user import User, UserRole
from app.schemas.delivery import (
    DeliveryResponse, DeliveryListResponse, DeliveryAssign,
    DeliveryStatusUpdate, DriverLocationUpdate, DeliveryComplete,
    DeliveryRate,
)
from app.api.v1.endpoints.auth import get_current_user, require_role

router = APIRouter(prefix="/delivery", tags=["Delivery"])


# Valid forward transitions for a delivery once a driver has accepted it.
# AT_RESTAURANT may be skipped (driver taps "Picked Up" directly).
DELIVERY_TRANSITIONS = {
    DeliveryStatus.ACCEPTED: {DeliveryStatus.AT_RESTAURANT, DeliveryStatus.PICKED_UP},
    DeliveryStatus.AT_RESTAURANT: {DeliveryStatus.PICKED_UP},
    DeliveryStatus.PICKED_UP: {DeliveryStatus.IN_TRANSIT},
    DeliveryStatus.IN_TRANSIT: {DeliveryStatus.NEARBY, DeliveryStatus.ARRIVED, DeliveryStatus.DELIVERED},
    DeliveryStatus.NEARBY: {DeliveryStatus.ARRIVED, DeliveryStatus.DELIVERED},
    DeliveryStatus.ARRIVED: {DeliveryStatus.DELIVERED},
    DeliveryStatus.DELIVERED: set(),
    DeliveryStatus.FAILED: set(),
}


@router.get("/available", response_model=List[DeliveryListResponse])
async def get_available_deliveries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available deliveries for drivers (also accessible by DEVELOPER role)"""
    if current_user.role not in (UserRole.DRIVER, UserRole.DEVELOPER, UserRole.ADMIN):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires driver or developer role"
        )
    # Only orders the restaurant has marked READY are claimable by drivers —
    # never pending/unconfirmed orders, and never cancelled ones.
    deliveries = db.query(Delivery).join(Delivery.order).options(
        joinedload(Delivery.order).joinedload(Order.restaurant),
        joinedload(Delivery.order).joinedload(Order.customer),
        joinedload(Delivery.order).joinedload(Order.items),
    ).filter(
        Delivery.status == DeliveryStatus.ASSIGNED,
        Delivery.driver_id == None,
        Order.status == OrderStatus.READY,
    ).all()

    return deliveries


@router.get("/my-deliveries", response_model=List[DeliveryListResponse])
async def get_my_deliveries(
    status: DeliveryStatus = None,
    current_user: User = Depends(require_role(UserRole.DRIVER)),
    db: Session = Depends(get_db)
):
    """Get current driver's assigned deliveries"""
    query = db.query(Delivery).options(
        joinedload(Delivery.order).joinedload(Order.restaurant),
        joinedload(Delivery.order).joinedload(Order.customer),
        joinedload(Delivery.order).joinedload(Order.items),
    ).filter(Delivery.driver_id == current_user.id)

    if status:
        query = query.filter(Delivery.status == status)

    deliveries = query.order_by(Delivery.assigned_at.desc()).all()
    return deliveries


@router.get("/{delivery_id}", response_model=DeliveryResponse)
async def get_delivery(
    delivery_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get delivery details"""
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    # Check authorization
    if (delivery.driver_id != current_user.id and 
        delivery.order.customer_id != current_user.id and
        delivery.order.restaurant.owner_id != current_user.id and
        current_user.role != UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this delivery"
        )
    
    return delivery


@router.post("/{delivery_id}/accept", response_model=DeliveryResponse)
async def accept_delivery(
    delivery_id: int,
    current_user: User = Depends(require_role(UserRole.DRIVER)),
    db: Session = Depends(get_db)
):
    """Accept a delivery assignment"""
    existing_delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not existing_delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )

    # Only READY orders are claimable — mirrors the /available listing
    order_status = existing_delivery.order.status
    if order_status == OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This order has been cancelled"
        )
    if order_status != OrderStatus.READY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is not ready for pickup yet"
        )

    updated_rows = db.execute(
        update(Delivery)
        .where(Delivery.id == delivery_id, Delivery.driver_id.is_(None))
        .values(
            driver_id=current_user.id,
            status=DeliveryStatus.ACCEPTED,
            accepted_at=datetime.now(timezone.utc),
        )
    ).rowcount

    if updated_rows == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery already assigned to another driver"
        )

    db.commit()
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    return delivery


@router.post("/{delivery_id}/location")
async def update_location(
    delivery_id: int,
    location: DriverLocationUpdate,
    current_user: User = Depends(require_role(UserRole.DRIVER)),
    db: Session = Depends(get_db)
):
    """Update driver location"""
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    if delivery.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not assigned to this delivery"
        )
    
    # Update delivery location (schema validates as float; model column is String)
    delivery.driver_latitude = str(location.latitude)
    delivery.driver_longitude = str(location.longitude)
    delivery.location_updated_at = datetime.now(timezone.utc)
    
    # Also log to location history
    location_log = DriverLocation(
        driver_id=current_user.id,
        delivery_id=delivery_id,
        latitude=str(location.latitude),
        longitude=str(location.longitude)
    )
    db.add(location_log)
    db.commit()
    
    return {"message": "Location updated"}


@router.get("/{delivery_id}/location")
async def get_delivery_location(
    delivery_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current delivery location"""
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    # Customer, restaurant owner, assigned driver, or admin can track delivery
    if (delivery.order.customer_id != current_user.id and
        delivery.order.restaurant.owner_id != current_user.id and
        delivery.driver_id != current_user.id and
        current_user.role != UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to track this delivery"
        )
    
    return {
        "latitude": delivery.driver_latitude,
        "longitude": delivery.driver_longitude,
        "updated_at": delivery.location_updated_at,
        "status": delivery.status.value
    }


@router.post("/{delivery_id}/status", response_model=DeliveryResponse)
async def update_delivery_status(
    delivery_id: int,
    status_update: DeliveryStatusUpdate,
    current_user: User = Depends(require_role(UserRole.DRIVER)),
    db: Session = Depends(get_db)
):
    """Update delivery status"""
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    if delivery.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not assigned to this delivery"
        )
    
    # A cancelled order can never progress — fail the delivery instead of
    # letting the driver resurrect it.
    if delivery.order.status == OrderStatus.CANCELLED:
        if delivery.status not in (DeliveryStatus.DELIVERED, DeliveryStatus.FAILED):
            delivery.status = DeliveryStatus.FAILED
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Order was cancelled — delivery voided"
        )

    new_status = status_update.status

    # Validate the transition against the delivery state machine
    if new_status not in DELIVERY_TRANSITIONS.get(delivery.status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid delivery transition: {delivery.status.value} → {new_status.value}"
        )

    delivery.status = new_status

    # Update timestamps
    now = datetime.now(timezone.utc)
    if new_status == DeliveryStatus.PICKED_UP:
        delivery.picked_up_at = now
        # Also update order status
        delivery.order.status = OrderStatus.PICKED_UP
        delivery.order.picked_up_at = now
    elif new_status == DeliveryStatus.IN_TRANSIT:
        delivery.order.status = OrderStatus.IN_TRANSIT
    elif new_status == DeliveryStatus.DELIVERED:
        delivery.delivered_at = now
        delivery.order.status = OrderStatus.DELIVERED
        delivery.order.delivered_at = now
        delivery.order.actual_delivery_time = now
        # Align with complete_delivery: mark paid when delivery completes (COD / pending).
        if delivery.order.payment_status == PaymentStatus.PENDING:
            delivery.order.payment_status = PaymentStatus.COMPLETED

    db.commit()
    db.refresh(delivery)

    return delivery


@router.post("/{delivery_id}/complete", response_model=DeliveryResponse)
async def complete_delivery(
    delivery_id: int,
    complete_data: DeliveryComplete,
    current_user: User = Depends(require_role(UserRole.DRIVER)),
    db: Session = Depends(get_db)
):
    """Complete a delivery"""
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    if delivery.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not assigned to this delivery"
        )
    
    if delivery.order.status == OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Order was cancelled — delivery cannot be completed"
        )
    if delivery.status == DeliveryStatus.DELIVERED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery already completed"
        )

    now = datetime.now(timezone.utc)
    delivery.status = DeliveryStatus.DELIVERED
    delivery.delivered_at = now
    # Ratings/feedback belong to the customer (POST /{id}/rate), not the driver
    delivery.delivery_notes = complete_data.delivery_notes

    # Update order
    delivery.order.status = OrderStatus.DELIVERED
    delivery.order.delivered_at = now
    delivery.order.actual_delivery_time = now
    if delivery.order.payment_status in (PaymentStatus.PENDING, PaymentStatus.PROCESSING):
        delivery.order.payment_status = PaymentStatus.COMPLETED

    db.commit()
    db.refresh(delivery)

    return delivery


@router.post("/{delivery_id}/rate", response_model=DeliveryResponse)
async def rate_delivery(
    delivery_id: int,
    rating_data: DeliveryRate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rate a completed delivery (customer of the order only)"""
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()

    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )

    if delivery.order.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the customer who placed the order can rate this delivery"
        )

    if delivery.status != DeliveryStatus.DELIVERED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only rate a completed delivery"
        )

    delivery.customer_rating = rating_data.rating
    delivery.customer_feedback = rating_data.feedback

    db.commit()
    db.refresh(delivery)

    return delivery


# ========== ADMIN ENDPOINTS ==========

@router.post("/assign-driver", response_model=DeliveryResponse)
async def assign_driver(
    order_id: int,
    driver_id: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """Manually assign a driver to an order (admin only)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    driver = db.query(User).filter(
        User.id == driver_id,
        User.role == UserRole.DRIVER
    ).first()
    
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )

    existing = db.query(Delivery).filter(Delivery.order_id == order_id).first()
    if existing:
        existing.driver_id = driver_id
        existing.status = DeliveryStatus.ASSIGNED
        existing.estimated_distance_km = existing.estimated_distance_km or 5.0
        existing.estimated_duration_min = existing.estimated_duration_min or 20
        db.commit()
        db.refresh(existing)
        return existing

    delivery = Delivery(
        order_id=order_id,
        driver_id=driver_id,
        status=DeliveryStatus.ASSIGNED,
        estimated_distance_km=5.0,
        estimated_duration_min=20,
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)

    return delivery
