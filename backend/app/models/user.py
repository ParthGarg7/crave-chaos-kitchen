"""
User Model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    RESTAURANT_OWNER = "restaurant_owner"
    DRIVER = "driver"
    ADMIN = "admin"


class User(Base):
    """User model for customers, restaurant owners, drivers, and admins"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    
    # Role
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Address (for customers)
    address = Column(Text, nullable=True)
    latitude = Column(String(20), nullable=True)
    longitude = Column(String(20), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    orders = relationship("Order", back_populates="customer", foreign_keys="Order.customer_id")
    restaurant = relationship("Restaurant", back_populates="owner", uselist=False)
    driver_deliveries = relationship("Delivery", back_populates="driver", foreign_keys="Delivery.driver_id")
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
