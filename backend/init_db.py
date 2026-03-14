"""
Database Initialization Script
Creates tables and seeds sample data
"""
import sys
from sqlalchemy.orm import Session

from app.db.base import Base, engine, SessionLocal
from app.models.user import User, UserRole
from app.models.restaurant import Restaurant, MenuItem, RestaurantStatus, CuisineType
from app.core.config import settings
from app.api.v1.endpoints.auth import get_password_hash


def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully")


def seed_users(db: Session):
    """Seed sample users"""
    print("Seeding users...")
    
    users = [
        {
            "email": "customer@example.com",
            "password": "password123",
            "first_name": "John",
            "last_name": "Doe",
            "phone": "+1-555-0101",
            "role": UserRole.CUSTOMER,
            "address": "123 Main St, New York, NY 10001",
            "is_active": True,
            "is_verified": True
        },
        {
            "email": "restaurant@example.com",
            "password": "password123",
            "first_name": "Maria",
            "last_name": "Garcia",
            "phone": "+1-555-0102",
            "role": UserRole.RESTAURANT_OWNER,
            "is_active": True,
            "is_verified": True
        },
        {
            "email": "driver@example.com",
            "password": "password123",
            "first_name": "Mike",
            "last_name": "Johnson",
            "phone": "+1-555-0103",
            "role": UserRole.DRIVER,
            "is_active": True,
            "is_verified": True
        },
        {
            "email": "admin@example.com",
            "password": "admin123",
            "first_name": "Admin",
            "last_name": "User",
            "phone": "+1-555-0100",
            "role": UserRole.ADMIN,
            "is_active": True,
            "is_verified": True
        }
    ]
    
    for user_data in users:
        # Check if user already exists
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if existing:
            print(f"  User {user_data['email']} already exists, skipping")
            continue
        
        user = User(
            email=user_data["email"],
            hashed_password=get_password_hash(user_data["password"]),
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            phone=user_data["phone"],
            role=user_data["role"],
            address=user_data.get("address"),
            is_active=user_data["is_active"],
            is_verified=user_data["is_verified"]
        )
        db.add(user)
        print(f"  Created user: {user_data['email']} ({user_data['role'].value})")
    
    db.commit()
    print("✅ Users seeded successfully")


def seed_restaurants(db: Session):
    """Seed sample restaurants"""
    print("Seeding restaurants...")
    
    # Get restaurant owner
    owner = db.query(User).filter(User.role == UserRole.RESTAURANT_OWNER).first()
    if not owner:
        print("  No restaurant owner found, skipping restaurant seeding")
        return
    
    restaurants = [
        {
            "name": "Pizza Palace",
            "description": "Authentic Italian pizza with fresh ingredients and a wood-fired crust",
            "phone": "+91-98765-00201",
            "email": "contact@pizzapalace.in",
            "address": "42, Connaught Place",
            "city": "New Delhi",
            "state": "Delhi",
            "zip_code": "110001",
            "cuisine_type": CuisineType.ITALIAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 49.0,
            "min_order_amount": 299.0,
            "delivery_time_min": 25,
            "delivery_time_max": 45,
            "rating": 4.5,
            "review_count": 128
        },
        {
            "name": "Dragon Wok",
            "description": "Delicious Chinese cuisine delivered fast — woks blazing since 2015",
            "phone": "+91-98765-00202",
            "email": "hello@dragonwok.in",
            "address": "15, Linking Road",
            "city": "Mumbai",
            "state": "Maharashtra",
            "zip_code": "400050",
            "cuisine_type": CuisineType.CHINESE,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 39.0,
            "min_order_amount": 199.0,
            "delivery_time_min": 20,
            "delivery_time_max": 40,
            "rating": 4.2,
            "review_count": 89
        },
        {
            "name": "Burger Barn",
            "description": "Juicy smash burgers and crispy fries made fresh every day",
            "phone": "+91-98765-00203",
            "email": "orders@burgerbarn.in",
            "address": "8, Brigade Road",
            "city": "Bangalore",
            "state": "Karnataka",
            "zip_code": "560025",
            "cuisine_type": CuisineType.AMERICAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 49.0,
            "min_order_amount": 149.0,
            "delivery_time_min": 15,
            "delivery_time_max": 30,
            "rating": 4.0,
            "review_count": 256
        },
        {
            "name": "Curry House",
            "description": "Authentic Indian curries, tandoori and biryanis made with house-ground spices",
            "phone": "+91-98765-00204",
            "email": "info@curryhouse.in",
            "address": "22, Park Street",
            "city": "Kolkata",
            "state": "West Bengal",
            "zip_code": "700016",
            "cuisine_type": CuisineType.INDIAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 29.0,
            "min_order_amount": 249.0,
            "delivery_time_min": 30,
            "delivery_time_max": 50,
            "rating": 4.7,
            "review_count": 167
        },
        {
            "name": "Sushi Spot",
            "description": "Premium sushi and Japanese specialties crafted by expert chefs",
            "phone": "+91-98765-00205",
            "email": "reservations@sushispot.in",
            "address": "3, Nungambakkam High Road",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "zip_code": "600034",
            "cuisine_type": CuisineType.JAPANESE,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 59.0,
            "min_order_amount": 399.0,
            "delivery_time_min": 35,
            "delivery_time_max": 55,
            "rating": 4.8,
            "review_count": 203
        }
    ]
    
    for rest_data in restaurants:
        # Check if restaurant already exists
        existing = db.query(Restaurant).filter(Restaurant.name == rest_data["name"]).first()
        if existing:
            print(f"  Restaurant {rest_data['name']} already exists, skipping")
            continue
        
        restaurant = Restaurant(
            **rest_data,
            owner_id=owner.id
        )
        db.add(restaurant)
        db.flush()  # Get restaurant ID
        
        # Add menu items for this restaurant
        seed_menu_items(db, restaurant)
        
        print(f"  Created restaurant: {rest_data['name']}")
    
    db.commit()
    print("✅ Restaurants seeded successfully")


def seed_menu_items(db: Session, restaurant: Restaurant):
    """Seed menu items for a restaurant"""
    
    menu_items_by_cuisine = {
        CuisineType.ITALIAN: [
            {"name": "Margherita Pizza", "description": "Fresh mozzarella, tomato sauce, basil", "price": 399.0, "category": "Pizza", "is_vegetarian": True},
            {"name": "Pepperoni Pizza", "description": "Classic pepperoni with mozzarella", "price": 499.0, "category": "Pizza"},
            {"name": "Caesar Salad", "description": "Romaine lettuce, croutons, parmesan", "price": 249.0, "category": "Salads"},
            {"name": "Garlic Bread", "description": "Toasted bread with garlic butter", "price": 149.0, "category": "Sides", "is_vegetarian": True},
            {"name": "Tiramisu", "description": "Classic Italian coffee dessert", "price": 219.0, "category": "Desserts", "is_vegetarian": True},
        ],
        CuisineType.CHINESE: [
            {"name": "Kung Pao Chicken", "description": "Spicy chicken with peanuts and vegetables", "price": 349.0, "category": "Main Course", "is_spicy": True},
            {"name": "Vegetable Fried Rice", "description": "Rice with mixed vegetables", "price": 249.0, "category": "Rice & Noodles", "is_vegetarian": True},
            {"name": "Sweet & Sour Pork", "description": "Crispy pork in sweet and sour sauce", "price": 329.0, "category": "Main Course"},
            {"name": "Spring Rolls (4pcs)", "description": "Crispy vegetable spring rolls", "price": 179.0, "category": "Appetizers", "is_vegetarian": True},
            {"name": "Hot & Sour Soup", "description": "Traditional Chinese soup", "price": 149.0, "category": "Soups", "is_spicy": True},
        ],
        CuisineType.AMERICAN: [
            {"name": "Classic Cheeseburger", "description": "Beef patty with cheddar cheese", "price": 299.0, "category": "Burgers"},
            {"name": "Bacon Burger", "description": "Beef patty with crispy bacon", "price": 349.0, "category": "Burgers"},
            {"name": "French Fries", "description": "Crispy golden fries", "price": 99.0, "category": "Sides", "is_vegan": True, "is_gluten_free": True},
            {"name": "Onion Rings", "description": "Crispy battered onion rings", "price": 129.0, "category": "Sides", "is_vegetarian": True},
            {"name": "Chocolate Milkshake", "description": "Rich and creamy milkshake", "price": 179.0, "category": "Beverages", "is_vegetarian": True},
        ],
        CuisineType.INDIAN: [
            {"name": "Butter Chicken", "description": "Creamy tomato curry with chicken", "price": 379.0, "category": "Curry"},
            {"name": "Vegetable Biryani", "description": "Fragrant rice with vegetables", "price": 299.0, "category": "Rice", "is_vegetarian": True, "is_vegan": True},
            {"name": "Naan Bread", "description": "Freshly baked Indian bread", "price": 59.0, "category": "Bread", "is_vegetarian": True},
            {"name": "Samosas (2pcs)", "description": "Crispy pastries with potato filling", "price": 99.0, "category": "Appetizers", "is_vegetarian": True},
            {"name": "Mango Lassi", "description": "Refreshing yogurt drink", "price": 89.0, "category": "Beverages", "is_vegetarian": True},
        ],
        CuisineType.JAPANESE: [
            {"name": "California Roll", "description": "Crab, avocado, cucumber", "price": 349.0, "category": "Sushi Rolls"},
            {"name": "Salmon Nigiri (2pcs)", "description": "Fresh salmon on rice", "price": 299.0, "category": "Nigiri"},
            {"name": "Spicy Tuna Roll", "description": "Spicy tuna with cucumber", "price": 379.0, "category": "Sushi Rolls", "is_spicy": True},
            {"name": "Miso Soup", "description": "Traditional Japanese soup", "price": 99.0, "category": "Soups", "is_vegetarian": True},
            {"name": "Edamame", "description": "Steamed soybeans with salt", "price": 149.0, "category": "Appetizers", "is_vegan": True, "is_gluten_free": True},
        ],
    }
    
    items = menu_items_by_cuisine.get(restaurant.cuisine_type, [])
    
    for item_data in items:
        menu_item = MenuItem(
            **item_data,
            restaurant_id=restaurant.id,
            is_available=True
        )
        db.add(menu_item)


def init_database():
    """Initialize database with tables and seed data"""
    print("=" * 50)
    print("Database Initialization")
    print("=" * 50)
    
    # Create tables
    create_tables()
    
    # Create session
    db = SessionLocal()
    
    try:
        # Seed data
        seed_users(db)
        seed_restaurants(db)
        
        print("=" * 50)
        print("✅ Database initialization complete!")
        print("=" * 50)
        print("\nSample login credentials:")
        print("  Customer: customer@example.com / password123")
        print("  Restaurant: restaurant@example.com / password123")
        print("  Driver: driver@example.com / password123")
        print("  Admin: admin@example.com / admin123")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
