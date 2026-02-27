"""
Restaurant API Endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.base import get_db
from app.models.restaurant import Restaurant, MenuItem, RestaurantStatus, CuisineType
from app.models.user import User, UserRole
from app.schemas.restaurant import (
    RestaurantCreate, RestaurantUpdate, RestaurantResponse, RestaurantListResponse,
    MenuItemCreate, MenuItemUpdate, MenuItemResponse, RestaurantSearchParams
)
from app.api.v1.endpoints.auth import get_current_user, require_role

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])


@router.get("", response_model=List[RestaurantListResponse])
async def list_restaurants(
    query: Optional[str] = Query(None, description="Search query"),
    cuisine_type: Optional[CuisineType] = Query(None),
    city: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List all active restaurants with optional filtering"""
    db_query = db.query(Restaurant).filter(Restaurant.status == RestaurantStatus.ACTIVE)
    
    if query:
        db_query = db_query.filter(
            Restaurant.name.ilike(f"%{query}%") | 
            Restaurant.description.ilike(f"%{query}%")
        )
    
    if cuisine_type:
        db_query = db_query.filter(Restaurant.cuisine_type == cuisine_type)
    
    if city:
        db_query = db_query.filter(Restaurant.city.ilike(f"%{city}%"))
    
    if min_rating:
        db_query = db_query.filter(Restaurant.rating >= min_rating)
    
    restaurants = db_query.offset(skip).limit(limit).all()
    return restaurants


@router.get("/cuisines", response_model=List[dict])
async def list_cuisine_types():
    """List available cuisine types"""
    return [{"value": c.value, "label": c.value.replace("_", " ").title()} for c in CuisineType]


@router.get("/my-restaurants", response_model=List[RestaurantResponse])
async def get_my_restaurants(
    current_user: User = Depends(require_role(UserRole.RESTAURANT_OWNER)),
    db: Session = Depends(get_db)
):
    """Get all restaurants owned by the authenticated restaurant owner"""
    restaurants = db.query(Restaurant).filter(Restaurant.owner_id == current_user.id).all()
    return restaurants


@router.get("/my-restaurant", response_model=RestaurantResponse)
async def get_my_restaurant(
    current_user: User = Depends(require_role(UserRole.RESTAURANT_OWNER)),
    db: Session = Depends(get_db)
):
    """Get the first restaurant owned by the authenticated restaurant owner (legacy)"""
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == current_user.id).first()
    
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You do not have a restaurant yet. Please create one."
        )
    
    return restaurant


@router.get("/{restaurant_id}", response_model=RestaurantResponse)
async def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    """Get restaurant details by ID"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )
    
    return restaurant


@router.post("", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED)
async def create_restaurant(
    restaurant_data: RestaurantCreate,
    current_user: User = Depends(require_role(UserRole.RESTAURANT_OWNER)),
    db: Session = Depends(get_db)
):
    """Create a new restaurant (restaurant owners only — multiple allowed)"""
    restaurant = Restaurant(
        **restaurant_data.model_dump(),
        owner_id=current_user.id,
        status=RestaurantStatus.ACTIVE  # Auto-activate for now; admin approval can be added later
    )
    
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    
    return restaurant


@router.put("/{restaurant_id}", response_model=RestaurantResponse)
async def update_restaurant(
    restaurant_id: int,
    restaurant_data: RestaurantUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update restaurant details (owner or admin only)"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )
    
    # Check ownership
    if restaurant.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this restaurant"
        )
    
    # Update fields
    for field, value in restaurant_data.model_dump(exclude_unset=True).items():
        setattr(restaurant, field, value)
    
    db.commit()
    db.refresh(restaurant)
    
    return restaurant


# ========== MENU ITEM ENDPOINTS ==========

@router.get("/{restaurant_id}/menu", response_model=List[MenuItemResponse])
async def get_menu(
    restaurant_id: int,
    category: Optional[str] = Query(None),
    available_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get menu items for a restaurant"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )
    
    query = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id)
    
    if category:
        query = query.filter(MenuItem.category == category)
    
    if available_only:
        query = query.filter(MenuItem.is_available == True)
    
    items = query.all()
    return items


@router.post("/{restaurant_id}/menu", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
async def add_menu_item(
    restaurant_id: int,
    item_data: MenuItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a menu item to a restaurant (owner only)"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )
    
    # Check ownership
    if restaurant.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this menu"
        )
    
    item = MenuItem(**item_data.model_dump(), restaurant_id=restaurant_id)
    
    db.add(item)
    db.commit()
    db.refresh(item)
    
    return item


@router.put("/{restaurant_id}/menu/{item_id}", response_model=MenuItemResponse)
async def update_menu_item(
    restaurant_id: int,
    item_id: int,
    item_data: MenuItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a menu item (owner only)"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )
    
    # Check ownership
    if restaurant.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this menu"
        )
    
    item = db.query(MenuItem).filter(
        MenuItem.id == item_id,
        MenuItem.restaurant_id == restaurant_id
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found"
        )
    
    # Update fields
    for field, value in item_data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    
    return item


@router.delete("/{restaurant_id}/menu/{item_id}")
async def delete_menu_item(
    restaurant_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a menu item (owner only)"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )
    
    # Check ownership
    if restaurant.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this menu"
        )
    
    item = db.query(MenuItem).filter(
        MenuItem.id == item_id,
        MenuItem.restaurant_id == restaurant_id
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found"
        )
    
    db.delete(item)
    db.commit()
    
    return {"message": "Menu item deleted successfully"}
