"""
Restaurant and Menu Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.restaurant import RestaurantStatus, CuisineType


# Menu Item Schemas
class MenuItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    category: str = Field(..., min_length=1, max_length=100)
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_gluten_free: bool = False
    is_spicy: bool = False
    is_available: bool = True
    image_url: Optional[str] = None


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    is_vegetarian: Optional[bool] = None
    is_vegan: Optional[bool] = None
    is_gluten_free: Optional[bool] = None
    is_spicy: Optional[bool] = None
    is_available: Optional[bool] = None
    image_url: Optional[str] = None


class MenuItemResponse(MenuItemBase):
    id: int
    restaurant_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Restaurant Schemas
class RestaurantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    phone: str = Field(..., min_length=5, max_length=20)
    email: Optional[str] = None
    address: str
    city: str
    state: str
    zip_code: str
    cuisine_type: CuisineType = CuisineType.OTHER
    opening_time: str = "09:00"
    closing_time: str = "22:00"
    delivery_fee: float = 2.99
    min_order_amount: float = 10.0
    delivery_time_min: int = 30
    delivery_time_max: int = 60


class RestaurantCreate(RestaurantBase):
    pass


class RestaurantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    phone: Optional[str] = Field(None, min_length=5, max_length=20)
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    cuisine_type: Optional[CuisineType] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    delivery_fee: Optional[float] = None
    min_order_amount: Optional[float] = None
    delivery_time_min: Optional[int] = None
    delivery_time_max: Optional[int] = None
    status: Optional[RestaurantStatus] = None


class RestaurantResponse(RestaurantBase):
    id: int
    owner_id: int
    status: RestaurantStatus
    rating: float
    review_count: int
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    menu_items: Optional[List[MenuItemResponse]] = []
    
    class Config:
        from_attributes = True


class RestaurantListResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    cuisine_type: CuisineType
    status: RestaurantStatus
    rating: float
    delivery_time_min: int
    delivery_time_max: int
    delivery_fee: float
    min_order_amount: float
    city: Optional[str] = None

    class Config:
        from_attributes = True


# Search/Filter Schemas
class RestaurantSearchParams(BaseModel):
    query: Optional[str] = None
    cuisine_type: Optional[CuisineType] = None
    city: Optional[str] = None
    min_rating: Optional[float] = Field(None, ge=0, le=5)
    max_delivery_time: Optional[int] = None
