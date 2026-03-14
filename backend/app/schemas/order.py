"""
Order Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.order import OrderStatus, PaymentStatus, PaymentMethod


# Order Item Schemas
class OrderItemBase(BaseModel):
    menu_item_id: int
    quantity: int = Field(..., gt=0)
    special_instructions: Optional[str] = None


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemResponse(BaseModel):
    id: int
    menu_item_id: int
    item_name: str
    item_price: float
    quantity: int
    special_instructions: Optional[str] = None
    subtotal: float
    
    class Config:
        from_attributes = True


# Cart Schemas
class CartItem(BaseModel):
    menu_item_id: int
    quantity: int = Field(..., gt=0)
    special_instructions: Optional[str] = None


class CartResponse(BaseModel):
    items: List[OrderItemResponse]
    subtotal: float
    delivery_fee: float
    tax: float
    total: float
    restaurant_id: Optional[int] = None


# Order Schemas
class OrderBase(BaseModel):
    restaurant_id: int
    delivery_address: str
    delivery_instructions: Optional[str] = None
    payment_method: PaymentMethod
    tip: float = 0.0


class OrderCreate(OrderBase):
    items: List[OrderItemCreate] = Field(..., min_length=1)


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    delivery_instructions: Optional[str] = None
    tip: Optional[float] = Field(None, ge=0)


class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer_id: int
    restaurant_id: int
    status: OrderStatus
    
    delivery_address: str
    delivery_instructions: Optional[str] = None
    
    items: List[OrderItemResponse]
    
    subtotal: float
    delivery_fee: float
    tax: float
    tip: float
    total: float
    
    payment_status: PaymentStatus
    payment_method: PaymentMethod
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    estimated_delivery_time: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    id: int
    order_number: str
    restaurant_name: str
    status: OrderStatus
    total: float
    created_at: datetime
    
    class Config:
        from_attributes = True


# Payment Schemas
class PaymentCreate(BaseModel):
    order_id: int
    card_number: Optional[str] = None  # In production, use tokenization
    expiry_month: Optional[str] = None
    expiry_year: Optional[str] = None
    cvv: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    order_id: int
    status: PaymentStatus
    amount: float
    transaction_id: Optional[str] = None
    message: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Order Status Update (for restaurant/delivery)
class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    notes: Optional[str] = None
