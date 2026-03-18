"""
Order Models
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base


class OrderStatus(str, enum.Enum):
    PENDING = "pending"           # Order created, waiting for restaurant
    CONFIRMED = "confirmed"       # Restaurant accepted
    PREPARING = "preparing"       # Restaurant preparing food
    READY = "ready"               # Food ready for pickup
    PICKED_UP = "picked_up"       # Driver picked up
    IN_TRANSIT = "in_transit"     # Driver on the way
    DELIVERED = "delivered"       # Order delivered
    CANCELLED = "cancelled"       # Order cancelled
    REFUNDED = "refunded"         # Order refunded


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    CARD = "card"       # Frontend shorthand for credit/debit card
    UPI = "upi"         # UPI / QR Code payment
    PAYPAL = "paypal"
    CASH = "cash"


class Order(Base):
    """Order model"""
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(20), unique=True, index=True, nullable=False)
    
    # Relationships
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    
    # Status
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    
    # Delivery Address
    delivery_address = Column(Text, nullable=False)
    delivery_latitude = Column(String(20), nullable=True)
    delivery_longitude = Column(String(20), nullable=True)
    delivery_instructions = Column(Text, nullable=True)
    
    # Financial
    subtotal = Column(Float, nullable=False)
    delivery_fee = Column(Float, nullable=False)
    tax = Column(Float, nullable=False)
    tip = Column(Float, default=0.0)
    total = Column(Float, nullable=False)
    
    # Payment
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    payment_transaction_id = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    prepared_at = Column(DateTime(timezone=True), nullable=True)
    picked_up_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    # Estimated times
    estimated_delivery_time = Column(DateTime(timezone=True), nullable=True)
    actual_delivery_time = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    customer = relationship("User", back_populates="orders", foreign_keys=[customer_id])
    restaurant = relationship("Restaurant", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    delivery = relationship("Delivery", back_populates="order", uselist=False)
    
    def __repr__(self):
        return f"<Order(id={self.id}, order_number={self.order_number}, status={self.status})>"


class OrderItem(Base):
    """Order item model (items within an order)"""
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    
    # Item details (snapshot at time of order)
    item_name = Column(String(200), nullable=False)
    item_price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    
    # Special instructions
    special_instructions = Column(Text, nullable=True)
    
    # Calculated
    subtotal = Column(Float, nullable=False)
    
    # Relationships
    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem", back_populates="order_items")
    
    def __repr__(self):
        return f"<OrderItem(id={self.id}, item={self.item_name}, qty={self.quantity})>"
