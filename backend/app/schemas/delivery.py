"""
Delivery Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
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
    id: int
    order_id: int
    order_number: str
    customer_name: str
    delivery_address: str
    status: DeliveryStatus
    estimated_duration_min: Optional[int] = None
    
    class Config:
        from_attributes = True


class DeliveryComplete(BaseModel):
    delivery_notes: Optional[str] = None
    customer_rating: Optional[int] = Field(None, ge=1, le=5)
    customer_feedback: Optional[str] = None
