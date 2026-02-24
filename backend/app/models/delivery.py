"""
Delivery Model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base


class DeliveryStatus(str, enum.Enum):
    ASSIGNED = "assigned"           # Driver assigned
    ACCEPTED = "accepted"           # Driver accepted
    AT_RESTAURANT = "at_restaurant" # Driver at restaurant
    PICKED_UP = "picked_up"         # Order picked up
    IN_TRANSIT = "in_transit"       # En route to customer
    NEARBY = "nearby"               # Driver nearby
    ARRIVED = "arrived"             # Driver arrived
    DELIVERED = "delivered"         # Successfully delivered
    FAILED = "failed"               # Delivery failed


class Delivery(Base):
    """Delivery model for tracking driver assignments and delivery progress"""
    __tablename__ = "deliveries"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Relationships
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, unique=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Status
    status = Column(Enum(DeliveryStatus), default=DeliveryStatus.ASSIGNED)
    
    # Location tracking (last known position)
    driver_latitude = Column(String(20), nullable=True)
    driver_longitude = Column(String(20), nullable=True)
    location_updated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Route information
    estimated_distance_km = Column(Float, nullable=True)
    estimated_duration_min = Column(Integer, nullable=True)
    
    # Timestamps
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    picked_up_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    # Delivery confirmation
    delivery_photo_url = Column(String(500), nullable=True)
    customer_signature_url = Column(String(500), nullable=True)
    delivery_notes = Column(Text, nullable=True)
    
    # Ratings
    customer_rating = Column(Integer, nullable=True)  # 1-5
    customer_feedback = Column(Text, nullable=True)
    
    # Relationships
    order = relationship("Order", back_populates="delivery")
    driver = relationship("User", back_populates="driver_deliveries", foreign_keys=[driver_id])
    
    def __repr__(self):
        return f"<Delivery(id={self.id}, order_id={self.order_id}, status={self.status})>"


class DriverLocation(Base):
    """Driver location history for tracking"""
    __tablename__ = "driver_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    latitude = Column(String(20), nullable=False)
    longitude = Column(String(20), nullable=False)
    
    # Optional: associated delivery
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=True)
    
    # Timestamp
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<DriverLocation(driver_id={self.driver_id}, lat={self.latitude}, lng={self.longitude})>"
