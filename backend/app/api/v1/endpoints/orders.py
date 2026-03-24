"""
Order API Endpoints
"""
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
import random
import string

from app.db.base import get_db
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus, PaymentMethod
from app.models.restaurant import Restaurant, MenuItem
from app.models.user import User, UserRole
from app.models.delivery import Delivery, DeliveryStatus
from app.schemas.order import (

    OrderCreate, OrderResponse, OrderListResponse, OrderUpdate,
    OrderItemCreate, CartItem, CartResponse, OrderStatusUpdate
)
from app.api.v1.endpoints.auth import get_current_user, require_role

router = APIRouter(prefix="/orders", tags=["Orders"])


def generate_order_number() -> str:
    """Generate a unique order number"""
    timestamp = datetime.utcnow().strftime("%Y%m%d")
    random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"ORD-{timestamp}-{random_suffix}"


@router.get("/my-orders", response_model=List[OrderListResponse])
async def get_my_orders(
    order_status: OrderStatus = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's orders"""
    query = db.query(Order).filter(Order.customer_id == current_user.id)
    
    if order_status:
        query = query.filter(Order.status == order_status)
    
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    # Add restaurant name to each order
    result = []
    for order in orders:
        order.restaurant_name = order.restaurant.name if order.restaurant else "Unknown"
        result.append(order)
    
    return result


@router.get("/restaurant-orders", response_model=List[OrderResponse])
async def get_restaurant_orders(
    restaurant_id: int = Query(None, description="Filter by specific restaurant ID (optional for owners with multiple restaurants)"),
    order_status: OrderStatus = Query(None, alias="status"),
    current_user: User = Depends(require_role(UserRole.RESTAURANT_OWNER)),
    db: Session = Depends(get_db)
):
    """Get orders for the restaurant owner's restaurants (all or filtered by ID)"""
    # Get all restaurants owned by this user
    owned_restaurants = db.query(Restaurant).filter(Restaurant.owner_id == current_user.id).all()

    if not owned_restaurants:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No restaurants found for this owner"
        )

    # If a specific restaurant_id is requested, verify ownership
    if restaurant_id:
        owned_ids = [r.id for r in owned_restaurants]
        if restaurant_id not in owned_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not own this restaurant"
            )
        target_ids = [restaurant_id]
    else:
        target_ids = [r.id for r in owned_restaurants]

    query = db.query(Order).filter(Order.restaurant_id.in_(target_ids))

    if order_status:
        query = query.filter(Order.status == order_status)

    orders = query.order_by(Order.created_at.desc()).all()
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get order details by ID"""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check authorization
    if (order.customer_id != current_user.id and 
        order.restaurant.owner_id != current_user.id and
        current_user.role != UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this order"
        )
    
    return order


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new order"""
    # Verify restaurant exists and is active
    restaurant = db.query(Restaurant).filter(Restaurant.id == order_data.restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )
    
    if restaurant.status.value != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restaurant is not currently accepting orders"
        )
    
    # Validate and calculate order items
    subtotal = 0.0
    order_items = []
    
    for item_data in order_data.items:
        menu_item = db.query(MenuItem).filter(
            MenuItem.id == item_data.menu_item_id,
            MenuItem.restaurant_id == restaurant.id
        ).first()
        
        if not menu_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Menu item {item_data.menu_item_id} not found"
            )
        
        if not menu_item.is_available:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Menu item '{menu_item.name}' is currently unavailable"
            )
        
        item_subtotal = menu_item.price * item_data.quantity
        subtotal += item_subtotal
        
        order_items.append({
            "menu_item_id": menu_item.id,
            "item_name": menu_item.name,
            "item_price": menu_item.price,
            "quantity": item_data.quantity,
            "special_instructions": item_data.special_instructions,
            "subtotal": item_subtotal
        })
    
    # Calculate totals
    delivery_fee = restaurant.delivery_fee
    tax_rate = 0.08  # 8% tax
    tax = round(subtotal * tax_rate, 2)
    total = round(subtotal + delivery_fee + tax + order_data.tip, 2)
    
    # Check minimum order
    if subtotal < restaurant.min_order_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order amount is ₹{restaurant.min_order_amount:.0f}"
        )
    
    # Create order
    order = Order(
        order_number=generate_order_number(),
        customer_id=current_user.id,
        restaurant_id=restaurant.id,
        status=OrderStatus.PENDING,
        delivery_address=order_data.delivery_address,
        delivery_instructions=order_data.delivery_instructions,
        payment_method=order_data.payment_method,
        payment_status=PaymentStatus.PENDING,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        tax=tax,
        tip=order_data.tip,
        total=total
    )
    
    db.add(order)
    db.flush()  # Get order ID
    
    # Create order items
    for item_data in order_items:
        order_item = OrderItem(order_id=order.id, **item_data)
        db.add(order_item)
    
    db.commit()
    db.refresh(order)

    # ── Auto-create Delivery record so drivers can see and accept this order ──
    # Without this, the delivery queue stays empty and drivers see nothing.
    delivery = Delivery(
        order_id=order.id,
        driver_id=None,  # Unassigned — first driver to accept claims it
        status=DeliveryStatus.ASSIGNED,
        estimated_distance_km=round(3.0 + (order.id % 7), 1),  # Mock 3-9 km range
        estimated_duration_min=15 + (order.id % 20),            # Mock 15-35 min
    )
    db.add(delivery)
    db.commit()

    return order


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update order status (restaurant owner, driver, or admin)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check authorization based on status change
    new_status = status_update.status
    
    # Restaurant owner can: CONFIRMED, PREPARING, READY, CANCELLED
    if new_status in [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY]:
        if order.restaurant.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only restaurant owner can update to this status"
            )
    
    # Driver can: PICKED_UP, IN_TRANSIT, DELIVERED
    elif new_status in [OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED]:
        if current_user.role not in [UserRole.DRIVER, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only drivers can update to this status"
            )
    
    # Customer can: CANCELLED (only if PENDING)
    elif new_status == OrderStatus.CANCELLED:
        if order.customer_id != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to cancel this order"
            )
        if order.status != OrderStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only cancel pending orders"
            )
    
    # Update status
    order.status = new_status
    
    # Update timestamps based on status
    if new_status == OrderStatus.CONFIRMED:
        order.confirmed_at = datetime.utcnow()
    elif new_status == OrderStatus.PREPARING:
        order.prepared_at = datetime.utcnow()
    elif new_status == OrderStatus.PICKED_UP:
        order.picked_up_at = datetime.utcnow()
    elif new_status == OrderStatus.DELIVERED:
        order.delivered_at = datetime.utcnow()
        order.payment_status = PaymentStatus.COMPLETED
    
    db.commit()
    db.refresh(order)
    
    return order


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    reason: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check authorization
    if (order.customer_id != current_user.id and 
        order.restaurant.owner_id != current_user.id and
        current_user.role != UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this order"
        )
    
    # Can only cancel if not already delivered or cancelled
    if order.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order with status: {order.status.value}"
        )
    
    order.status = OrderStatus.CANCELLED
    order.payment_status = PaymentStatus.REFUNDED
    
    db.commit()
    
    return {"message": "Order cancelled successfully", "order_id": order_id}
