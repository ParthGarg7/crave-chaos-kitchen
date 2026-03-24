"""
Delivery Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.delivery import DeliveryStatus


class DriverLocationUpdate(BaseModel):
    latitude: str
    longitude: str


class DriverLocationResponse(BaseModel):
    latitude: str
    longitude: str
    recorded_at: datetime

    class Config:
        from_attributes = True


class DeliveryAssign(BaseModel):
    driver_id: int


class DeliveryStatusUpdate(BaseModel):
    status: DeliveryStatus
    notes: Optional[str] = None


# ── Nested helpers for list responses ────────────────────────────────────────

class _Restaurant(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None

    class Config:
        from_attributes = True


class _Customer(BaseModel):
    first_name: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class _OrderItem(BaseModel):
    item_name: str
    quantity: int

    class Config:
        from_attributes = True


class _OrderSummary(BaseModel):
    order_number: Optional[str] = None
    total: Optional[float] = None
    delivery_address: Optional[str] = None
    restaurant: Optional[_Restaurant] = None
    customer: Optional[_Customer] = None
    items: Optional[List[_OrderItem]] = None

    class Config:
        from_attributes = True


class DeliveryResponse(BaseModel):
    id: int
    order_id: int
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    status: DeliveryStatus

    driver_latitude: Optional[str] = None
    driver_longitude: Optional[str] = None
    location_updated_at: Optional[datetime] = None

    estimated_distance_km: Optional[float] = None
    estimated_duration_min: Optional[int] = None

    assigned_at: datetime
    accepted_at: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

    delivery_photo_url: Optional[str] = None
    delivery_notes: Optional[str] = None

    class Config:
        from_attributes = True


class DeliveryListResponse(BaseModel):
    """Schema for listing deliveries - all order details nested under `order`."""
    id: int
    order_id: int
    status: DeliveryStatus
    estimated_distance_km: Optional[float] = None
    estimated_duration_min: Optional[int] = None
    assigned_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

    # Full order data — loaded via SQLAlchemy relationship
    order: Optional[_OrderSummary] = None

    class Config:
        from_attributes = True


class DeliveryComplete(BaseModel):
    delivery_notes: Optional[str] = None
    customer_rating: Optional[int] = Field(None, ge=1, le=5)
    customer_feedback: Optional[str] = None
