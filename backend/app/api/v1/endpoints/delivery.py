"""
Delivery API Endpoints
"""
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db.base import get_db
from app.models.delivery import Delivery, DeliveryStatus, DriverLocation
from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole
from app.schemas.delivery import (
    DeliveryResponse, DeliveryListResponse, DeliveryAssign,
    DeliveryStatusUpdate, DriverLocationUpdate, DeliveryComplete
)
from app.api.v1.endpoints.auth import get_current_user, require_role

router = APIRouter(prefix="/delivery", tags=["Delivery"])


@router.get("/available", response_model=List[DeliveryListResponse])
async def get_available_deliveries(
    current_user: User = Depends(require_role(UserRole.DRIVER)),
    db: Session = Depends(get_db)
):
    """Get available deliveries for drivers"""
    deliveries = db.query(Delivery).options(
        joinedload(Delivery.order).joinedload(Order.restaurant),
        joinedload(Delivery.order).joinedload(Order.customer),
        joinedload(Delivery.order).joinedload(Order.items),
    ).filter(
        Delivery.status == DeliveryStatus.ASSIGNED,
        Delivery.driver_id == None
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
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    if delivery.driver_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery already assigned to another driver"
        )
    
    delivery.driver_id = current_user.id
    delivery.status = DeliveryStatus.ACCEPTED
    delivery.accepted_at = datetime.utcnow()
    
    db.commit()
    db.refresh(delivery)
    
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
    
    # Update delivery location
    delivery.driver_latitude = location.latitude
    delivery.driver_longitude = location.longitude
    delivery.location_updated_at = datetime.utcnow()
    
    # Also log to location history
    location_log = DriverLocation(
        driver_id=current_user.id,
        delivery_id=delivery_id,
        latitude=location.latitude,
        longitude=location.longitude
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
    
    # Customer and restaurant can track delivery
    if (delivery.order.customer_id != current_user.id and
        delivery.order.restaurant.owner_id != current_user.id and
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
    
    new_status = status_update.status
    delivery.status = new_status
    
    # Update timestamps
    if new_status == DeliveryStatus.PICKED_UP:
        delivery.picked_up_at = datetime.utcnow()
        # Also update order status
        delivery.order.status = OrderStatus.PICKED_UP
    elif new_status == DeliveryStatus.IN_TRANSIT:
        delivery.order.status = OrderStatus.IN_TRANSIT
    elif new_status == DeliveryStatus.DELIVERED:
        delivery.delivered_at = datetime.utcnow()
        delivery.order.status = OrderStatus.DELIVERED
        delivery.order.delivered_at = datetime.utcnow()
    
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
    
    delivery.status = DeliveryStatus.DELIVERED
    delivery.delivered_at = datetime.utcnow()
    delivery.delivery_notes = complete_data.delivery_notes
    delivery.customer_rating = complete_data.customer_rating
    delivery.customer_feedback = complete_data.customer_feedback
    
    # Update order
    delivery.order.status = OrderStatus.DELIVERED
    delivery.order.delivered_at = datetime.utcnow()
    delivery.order.payment_status = "completed"
    
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
    
    # Create delivery record
    delivery = Delivery(
        order_id=order_id,
        driver_id=driver_id,
        status=DeliveryStatus.ASSIGNED,
        estimated_distance_km=5.0,  # Mock value
        estimated_duration_min=20   # Mock value
    )
    
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    
    return delivery
