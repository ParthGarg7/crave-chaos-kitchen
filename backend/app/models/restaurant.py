"""
Restaurant and Menu Models
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base


class RestaurantStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CLOSED = "closed"


class CuisineType(str, enum.Enum):
    ITALIAN = "italian"
    CHINESE = "chinese"
    INDIAN = "indian"
    MEXICAN = "mexican"
    AMERICAN = "american"
    JAPANESE = "japanese"
    THAI = "thai"
    FAST_FOOD = "fast_food"
    OTHER = "other"


class Restaurant(Base):
    """Restaurant model"""
    __tablename__ = "restaurants"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Owner
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Contact
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=True)
    
    # Address
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    zip_code = Column(String(20), nullable=False)
    latitude = Column(String(20), nullable=True)
    longitude = Column(String(20), nullable=True)
    
    # Details
    cuisine_type = Column(Enum(CuisineType), default=CuisineType.OTHER)
    status = Column(Enum(RestaurantStatus), default=RestaurantStatus.PENDING)
    
    # Business hours
    opening_time = Column(String(10), default="09:00")  # 24-hour format
    closing_time = Column(String(10), default="22:00")
    
    # Ratings
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    
    # Delivery
    delivery_fee = Column(Float, default=2.99)
    min_order_amount = Column(Float, default=10.0)
    delivery_time_min = Column(Integer, default=30)
    delivery_time_max = Column(Integer, default=60)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="restaurant")
    menu_items = relationship("MenuItem", back_populates="restaurant", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="restaurant")
    
    def __repr__(self):
        return f"<Restaurant(id={self.id}, name={self.name})>"


class MenuItem(Base):
    """Menu item model"""
    __tablename__ = "menu_items"
    
    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    
    # Category
    category = Column(String(100), nullable=False)  # e.g., "Appetizers", "Main Course", "Desserts"
    
    # Options
    is_vegetarian = Column(Boolean, default=False)
    is_vegan = Column(Boolean, default=False)
    is_gluten_free = Column(Boolean, default=False)
    is_spicy = Column(Boolean, default=False)
    
    # Availability
    is_available = Column(Boolean, default=True)
    
    # Image
    image_url = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    restaurant = relationship("Restaurant", back_populates="menu_items")
    order_items = relationship("OrderItem", back_populates="menu_item")
    
    def __repr__(self):
        return f"<MenuItem(id={self.id}, name={self.name}, price={self.price})>"
