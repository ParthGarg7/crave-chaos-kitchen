"""
Database Initialization Script
Creates tables and seeds sample data
"""
import sys
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base, get_engine, init_db as initialize_engine
from app.models.user import User, UserRole
from app.models.restaurant import Restaurant, MenuItem, RestaurantStatus, CuisineType
from app.core.config import settings
from app.api.v1.endpoints.auth import get_password_hash


def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    initialize_engine()  # Ensure engine is initialised before use
    Base.metadata.create_all(bind=get_engine())
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
        },
        {
            "email": "developer@example.com",
            "password": "developer123",
            "first_name": "Dev",
            "last_name": "Ops",
            "phone": "+1-555-0104",
            "role": UserRole.DEVELOPER,
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
        },
        # ── New 45 restaurants ──────────────────────────────────────────────────
        # Delhi (4)
        {
            "name": "Pasta Point",
            "description": "Handcrafted Italian pastas and wood-fired dishes in the heart of Delhi",
            "phone": "+91-98765-00206",
            "email": "hello@pastapoint.in",
            "address": "7, Janpath Road",
            "city": "Delhi",
            "state": "Delhi",
            "zip_code": "110001",
            "cuisine_type": CuisineType.ITALIAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 35.0,
            "min_order_amount": 200.0,
            "delivery_time_min": 25,
            "delivery_time_max": 45,
            "rating": 4.3,
            "review_count": 112
        },
        {
            "name": "Waffle Works",
            "description": "American brunch classics, loaded waffles and hearty sandwiches all day",
            "phone": "+91-98765-00207",
            "email": "orders@waffleworks.in",
            "address": "18, Karol Bagh Market",
            "city": "Delhi",
            "state": "Delhi",
            "zip_code": "110005",
            "cuisine_type": CuisineType.AMERICAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 30.0,
            "min_order_amount": 150.0,
            "delivery_time_min": 20,
            "delivery_time_max": 40,
            "rating": 4.1,
            "review_count": 87
        },
        {
            "name": "Banh Bay",
            "description": "Japanese-inspired small plates, ramen bowls and sushi with a modern twist",
            "phone": "+91-98765-00208",
            "email": "contact@banhbay.in",
            "address": "31, Lajpat Nagar",
            "city": "Delhi",
            "state": "Delhi",
            "zip_code": "110024",
            "cuisine_type": CuisineType.JAPANESE,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 40.0,
            "min_order_amount": 250.0,
            "delivery_time_min": 30,
            "delivery_time_max": 50,
            "rating": 4.4,
            "review_count": 95
        },
        {
            "name": "Dal Dhaba",
            "description": "Rustic Thai street food and aromatic curries served highway-dhaba style",
            "phone": "+91-98765-00209",
            "email": "info@daldhaba.in",
            "address": "54, Rohini Sector 7",
            "city": "Delhi",
            "state": "Delhi",
            "zip_code": "110085",
            "cuisine_type": CuisineType.THAI,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 25.0,
            "min_order_amount": 120.0,
            "delivery_time_min": 20,
            "delivery_time_max": 42,
            "rating": 4.0,
            "review_count": 74
        },
        # Mumbai (4)
        {
            "name": "Pierogi Point",
            "description": "Italian comfort food — filled pastas, risottos and classic antipasti",
            "phone": "+91-98765-00210",
            "email": "hello@pierogipoint.in",
            "address": "22, Bandra West",
            "city": "Mumbai",
            "state": "Maharashtra",
            "zip_code": "400050",
            "cuisine_type": CuisineType.ITALIAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 45.0,
            "min_order_amount": 280.0,
            "delivery_time_min": 30,
            "delivery_time_max": 50,
            "rating": 4.2,
            "review_count": 103
        },
        {
            "name": "Tandoor Trail",
            "description": "Smoky tandoor-grilled meats, dal makhani and fresh naans baked daily",
            "phone": "+91-98765-00211",
            "email": "info@tandoortrail.in",
            "address": "9, Andheri East",
            "city": "Mumbai",
            "state": "Maharashtra",
            "zip_code": "400069",
            "cuisine_type": CuisineType.INDIAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 30.0,
            "min_order_amount": 200.0,
            "delivery_time_min": 25,
            "delivery_time_max": 45,
            "rating": 4.5,
            "review_count": 189
        },
        {
            "name": "Momo Mountain",
            "description": "Steamed and fried Japanese dumplings, gyoza and bao in every flavour",
            "phone": "+91-98765-00212",
            "email": "orders@momomountain.in",
            "address": "14, Fort Area",
            "city": "Mumbai",
            "state": "Maharashtra",
            "zip_code": "400001",
            "cuisine_type": CuisineType.JAPANESE,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 35.0,
            "min_order_amount": 180.0,
            "delivery_time_min": 25,
            "delivery_time_max": 45,
            "rating": 4.3,
            "review_count": 141
        },
        {
            "name": "Kebab Kitchen",
            "description": "Middle-Eastern kebabs, mezze platters and freshly baked pita all day",
            "phone": "+91-98765-00213",
            "email": "contact@kebabkitchen.in",
            "address": "5, Juhu Tara Road",
            "city": "Mumbai",
            "state": "Maharashtra",
            "zip_code": "400049",
            "cuisine_type": CuisineType.MEDITERRANEAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 40.0,
            "min_order_amount": 220.0,
            "delivery_time_min": 28,
            "delivery_time_max": 48,
            "rating": 4.6,
            "review_count": 162
        },
        # Bangalore (4)
        {
            "name": "Bao Barn",
            "description": "Steamed Chinese bao buns, dim sum and noodle soups made fresh",
            "phone": "+91-98765-00214",
            "email": "hello@baobarn.in",
            "address": "25, MG Road",
            "city": "Bangalore",
            "state": "Karnataka",
            "zip_code": "560001",
            "cuisine_type": CuisineType.CHINESE,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 35.0,
            "min_order_amount": 180.0,
            "delivery_time_min": 22,
            "delivery_time_max": 42,
            "rating": 4.2,
            "review_count": 98
        },
        {
            "name": "Ceviche Cove",
            "description": "Vibrant Mexican street food, fresh ceviche and margarita-worthy tacos",
            "phone": "+91-98765-00215",
            "email": "orders@cevichecove.in",
            "address": "7, Koramangala 5th Block",
            "city": "Bangalore",
            "state": "Karnataka",
            "zip_code": "560095",
            "cuisine_type": CuisineType.MEXICAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 40.0,
            "min_order_amount": 200.0,
            "delivery_time_min": 25,
            "delivery_time_max": 45,
            "rating": 4.4,
            "review_count": 115
        },
        {
            "name": "Shawarma Station",
            "description": "Rotating shawarma spits, crispy falafels and fresh mezze since 2018",
            "phone": "+91-98765-00216",
            "email": "contact@shawarmastation.in",
            "address": "12, Indiranagar 100 Feet Road",
            "city": "Bangalore",
            "state": "Karnataka",
            "zip_code": "560038",
            "cuisine_type": CuisineType.MEDITERRANEAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 30.0,
            "min_order_amount": 150.0,
            "delivery_time_min": 20,
            "delivery_time_max": 40,
            "rating": 4.5,
            "review_count": 210
        },
        {
            "name": "Chaat Chart",
            "description": "Korean fusion street bowls, bibimbap and spicy fried chicken in Bangalore",
            "phone": "+91-98765-00217",
            "email": "info@chaatchart.in",
            "address": "3, Jayanagar 4th Block",
            "city": "Bangalore",
            "state": "Karnataka",
            "zip_code": "560011",
            "cuisine_type": CuisineType.KOREAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 35.0,
            "min_order_amount": 175.0,
            "delivery_time_min": 25,
            "delivery_time_max": 45,
            "rating": 4.1,
            "review_count": 79
        },
        # Chennai (4)
        {
            "name": "Grill Grove",
            "description": "Flame-grilled American burgers, BBQ ribs and loaded fries in Chennai",
            "phone": "+91-98765-00218",
            "email": "orders@grillgrove.in",
            "address": "14, Anna Salai",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "zip_code": "600002",
            "cuisine_type": CuisineType.AMERICAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 45.0,
            "min_order_amount": 200.0,
            "delivery_time_min": 25,
            "delivery_time_max": 48,
            "rating": 4.0,
            "review_count": 134
        },
        {
            "name": "Empanada End",
            "description": "Stuffed Mexican empanadas, burritos and street-style nachos to go",
            "phone": "+91-98765-00219",
            "email": "hello@empanada-end.in",
            "address": "8, T Nagar",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "zip_code": "600017",
            "cuisine_type": CuisineType.MEXICAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 30.0,
            "min_order_amount": 130.0,
            "delivery_time_min": 22,
            "delivery_time_max": 42,
            "rating": 4.2,
            "review_count": 88
        },
        {
            "name": "Falafel Fort",
            "description": "Golden-fried falafels, hummus bowls and Mediterranean grain salads",
            "phone": "+91-98765-00220",
            "email": "contact@falafelfort.in",
            "address": "21, Adyar",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "zip_code": "600020",
            "cuisine_type": CuisineType.MEDITERRANEAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 35.0,
            "min_order_amount": 160.0,
            "delivery_time_min": 25,
            "delivery_time_max": 45,
            "rating": 4.4,
            "review_count": 97
        },
        {
            "name": "Bobotie Base",
            "description": "Soulful Korean comfort food — bulgogi, stews and rice bowls with kimchi",
            "phone": "+91-98765-00221",
            "email": "info@bobotiebase.in",
            "address": "6, Velachery Main Road",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "zip_code": "600042",
            "cuisine_type": CuisineType.KOREAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 40.0,
            "min_order_amount": 190.0,
            "delivery_time_min": 28,
            "delivery_time_max": 50,
            "rating": 4.3,
            "review_count": 72
        },
        # Kolkata (4)
        {
            "name": "Biryani Bowl",
            "description": "Slow-cooked dum biryanis, kebabs and Indian gravies with royal richness",
            "phone": "+91-98765-00222",
            "email": "orders@biryanibowl.in",
            "address": "33, Ballygunge",
            "city": "Kolkata",
            "state": "West Bengal",
            "zip_code": "700019",
            "cuisine_type": CuisineType.INDIAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 30.0,
            "min_order_amount": 220.0,
            "delivery_time_min": 30,
            "delivery_time_max": 55,
            "rating": 4.6,
            "review_count": 201
        },
        {
            "name": "Nacho Nest",
            "description": "Loaded nachos, quesadillas and spicy Mexican bowls perfect for sharing",
            "phone": "+91-98765-00223",
            "email": "hello@nachonest.in",
            "address": "11, Salt Lake Sector V",
            "city": "Kolkata",
            "state": "West Bengal",
            "zip_code": "700091",
            "cuisine_type": CuisineType.MEXICAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 25.0,
            "min_order_amount": 120.0,
            "delivery_time_min": 20,
            "delivery_time_max": 42,
            "rating": 4.0,
            "review_count": 65
        },
        {
            "name": "Rendang Ridge",
            "description": "Rich Thai curries and Southeast Asian stir-fries bursting with coconut flavour",
            "phone": "+91-98765-00224",
            "email": "contact@rendangridge.in",
            "address": "44, New Town Action Area",
            "city": "Kolkata",
            "state": "West Bengal",
            "zip_code": "700156",
            "cuisine_type": CuisineType.THAI,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 35.0,
            "min_order_amount": 170.0,
            "delivery_time_min": 28,
            "delivery_time_max": 50,
            "rating": 4.2,
            "review_count": 83
        },
        {
            "name": "Sorrel Square",
            "description": "Classic French bistro cooking — soups, braises and elegant patisserie",
            "phone": "+91-98765-00225",
            "email": "info@sorrelsquare.in",
            "address": "17, Camac Street",
            "city": "Kolkata",
            "state": "West Bengal",
            "zip_code": "700016",
            "cuisine_type": CuisineType.FRENCH,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 50.0,
            "min_order_amount": 280.0,
            "delivery_time_min": 35,
            "delivery_time_max": 60,
            "rating": 4.5,
            "review_count": 119
        },
        # Hyderabad (5)
        {
            "name": "Schnitzel Shack",
            "description": "Italian breaded cutlets, pasta bakes and antipasti in rustic surroundings",
            "phone": "+91-98765-00226",
            "email": "orders@schnitzelshack.in",
            "address": "9, Banjara Hills Road 12",
            "city": "Hyderabad",
            "state": "Telangana",
            "zip_code": "500034",
            "cuisine_type": CuisineType.ITALIAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 40.0,
            "min_order_amount": 230.0,
            "delivery_time_min": 30,
            "delivery_time_max": 50,
            "rating": 4.1,
            "review_count": 91
        },
        {
            "name": "Jerk Junction",
            "description": "Smoky American BBQ, slow-cooked ribs and spiced jerk chicken done right",
            "phone": "+91-98765-00227",
            "email": "hello@jerkjunction.in",
            "address": "4, Jubilee Hills",
            "city": "Hyderabad",
            "state": "Telangana",
            "zip_code": "500033",
            "cuisine_type": CuisineType.AMERICAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 45.0,
            "min_order_amount": 200.0,
            "delivery_time_min": 25,
            "delivery_time_max": 48,
            "rating": 4.3,
            "review_count": 147
        },
        {
            "name": "Idli Inn",
            "description": "Japanese udon, soba noodles and warming miso soups in a serene setting",
            "phone": "+91-98765-00228",
            "email": "contact@idliinn.in",
            "address": "30, Madhapur",
            "city": "Hyderabad",
            "state": "Telangana",
            "zip_code": "500081",
            "cuisine_type": CuisineType.JAPANESE,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 35.0,
            "min_order_amount": 200.0,
            "delivery_time_min": 28,
            "delivery_time_max": 50,
            "rating": 4.2,
            "review_count": 106
        },
        {
            "name": "Pita Palace",
            "description": "Fluffy pita breads, grilled meats and colourful Mediterranean spreads",
            "phone": "+91-98765-00229",
            "email": "info@pitapalace.in",
            "address": "7, HITEC City",
            "city": "Hyderabad",
            "state": "Telangana",
            "zip_code": "500081",
            "cuisine_type": CuisineType.MEDITERRANEAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 30.0,
            "min_order_amount": 160.0,
            "delivery_time_min": 22,
            "delivery_time_max": 44,
            "rating": 4.4,
            "review_count": 176
        },
        {
            "name": "Tagine Tower",
            "description": "Fragrant North African tagines and French-inspired couscous dishes",
            "phone": "+91-98765-00230",
            "email": "orders@taginetower.in",
            "address": "22, Gachibowli",
            "city": "Hyderabad",
            "state": "Telangana",
            "zip_code": "500032",
            "cuisine_type": CuisineType.FRENCH,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 45.0,
            "min_order_amount": 250.0,
            "delivery_time_min": 32,
            "delivery_time_max": 55,
            "rating": 4.3,
            "review_count": 88
        },
        # Pune (5)
        {
            "name": "Pretzel Post",
            "description": "Italian street-food classics, bruschetta, thin-crust pizzas and gelato",
            "phone": "+91-98765-00231",
            "email": "hello@pretzelpost.in",
            "address": "6, FC Road",
            "city": "Pune",
            "state": "Maharashtra",
            "zip_code": "411004",
            "cuisine_type": CuisineType.ITALIAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 30.0,
            "min_order_amount": 180.0,
            "delivery_time_min": 25,
            "delivery_time_max": 45,
            "rating": 4.2,
            "review_count": 93
        },
        {
            "name": "Plantain Place",
            "description": "Caribbean-American fusion with plantain chips, po boys and BBQ bowls",
            "phone": "+91-98765-00232",
            "email": "contact@plantainplace.in",
            "address": "14, MG Road Camp",
            "city": "Pune",
            "state": "Maharashtra",
            "zip_code": "411001",
            "cuisine_type": CuisineType.AMERICAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 35.0,
            "min_order_amount": 160.0,
            "delivery_time_min": 22,
            "delivery_time_max": 45,
            "rating": 4.1,
            "review_count": 77
        },
        {
            "name": "Dosa Den",
            "description": "Crispy dosas, fluffy uttapams and hearty South Indian meals on banana leaf",
            "phone": "+91-98765-00233",
            "email": "info@dosaden.in",
            "address": "8, Koregaon Park",
            "city": "Pune",
            "state": "Maharashtra",
            "zip_code": "411001",
            "cuisine_type": CuisineType.INDIAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 20.0,
            "min_order_amount": 100.0,
            "delivery_time_min": 20,
            "delivery_time_max": 40,
            "rating": 4.5,
            "review_count": 218
        },
        {
            "name": "Taco Tower",
            "description": "Tower-tall tacos, sizzling fajitas and frozen margarita treats in Pune",
            "phone": "+91-98765-00234",
            "email": "orders@tacotower.in",
            "address": "19, Kalyani Nagar",
            "city": "Pune",
            "state": "Maharashtra",
            "zip_code": "411006",
            "cuisine_type": CuisineType.MEXICAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 30.0,
            "min_order_amount": 140.0,
            "delivery_time_min": 20,
            "delivery_time_max": 40,
            "rating": 4.3,
            "review_count": 122
        },
        {
            "name": "Mezze Manor",
            "description": "Elegant Mediterranean spreads, mezze boards and slow-roasted lamb",
            "phone": "+91-98765-00235",
            "email": "hello@mezzemanor.in",
            "address": "3, Baner Road",
            "city": "Pune",
            "state": "Maharashtra",
            "zip_code": "411045",
            "cuisine_type": CuisineType.MEDITERRANEAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 40.0,
            "min_order_amount": 240.0,
            "delivery_time_min": 30,
            "delivery_time_max": 52,
            "rating": 4.5,
            "review_count": 145
        },
        # Ahmedabad (5)
        {
            "name": "Dim Sum Den",
            "description": "Bamboo-steamed dim sum, wonton soups and Cantonese favourites daily",
            "phone": "+91-98765-00236",
            "email": "contact@dimsumden.in",
            "address": "22, CG Road",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "zip_code": "380006",
            "cuisine_type": CuisineType.CHINESE,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 35.0,
            "min_order_amount": 170.0,
            "delivery_time_min": 25,
            "delivery_time_max": 45,
            "rating": 4.3,
            "review_count": 108
        },
        {
            "name": "Thali Town",
            "description": "Authentic Gujarati and North Indian thali meals with unlimited refills",
            "phone": "+91-98765-00237",
            "email": "info@thalitown.in",
            "address": "7, Law Garden",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "zip_code": "380006",
            "cuisine_type": CuisineType.INDIAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 20.0,
            "min_order_amount": 100.0,
            "delivery_time_min": 25,
            "delivery_time_max": 45,
            "rating": 4.7,
            "review_count": 265
        },
        {
            "name": "Laksa Lane",
            "description": "Spicy Thai laksa, coconut curries and fresh spring rolls to brighten your day",
            "phone": "+91-98765-00238",
            "email": "orders@laksalane.in",
            "address": "15, Navrangpura",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "zip_code": "380009",
            "cuisine_type": CuisineType.THAI,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 30.0,
            "min_order_amount": 150.0,
            "delivery_time_min": 22,
            "delivery_time_max": 44,
            "rating": 4.2,
            "review_count": 81
        },
        {
            "name": "Wrap World",
            "description": "Korean lettuce wraps, doenjang stews and veggie-forward bibimbap bowls",
            "phone": "+91-98765-00239",
            "email": "hello@wrapworld.in",
            "address": "11, Satellite Road",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "zip_code": "380015",
            "cuisine_type": CuisineType.KOREAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 35.0,
            "min_order_amount": 175.0,
            "delivery_time_min": 25,
            "delivery_time_max": 47,
            "rating": 4.1,
            "review_count": 69
        },
        {
            "name": "Crepe Corner",
            "description": "Sweet and savoury French crêpes, galettes and light café fare all day",
            "phone": "+91-98765-00240",
            "email": "contact@crepecorner.in",
            "address": "4, Prahlad Nagar",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "zip_code": "380015",
            "cuisine_type": CuisineType.FRENCH,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 35.0,
            "min_order_amount": 160.0,
            "delivery_time_min": 25,
            "delivery_time_max": 45,
            "rating": 4.4,
            "review_count": 136
        },
        # Jaipur (5)
        {
            "name": "Noodle Nest",
            "description": "Steaming Chinese noodle soups, stir-fries and hand-pulled noodles",
            "phone": "+91-98765-00241",
            "email": "info@noodlenest.in",
            "address": "8, MI Road",
            "city": "Jaipur",
            "state": "Rajasthan",
            "zip_code": "302001",
            "cuisine_type": CuisineType.CHINESE,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 30.0,
            "min_order_amount": 150.0,
            "delivery_time_min": 25,
            "delivery_time_max": 45,
            "rating": 4.1,
            "review_count": 77
        },
        {
            "name": "Ramen Rack",
            "description": "Japanese tonkotsu and shoyu ramen, gyoza and matcha desserts in Jaipur",
            "phone": "+91-98765-00242",
            "email": "orders@ramenrack.in",
            "address": "3, Vaishali Nagar",
            "city": "Jaipur",
            "state": "Rajasthan",
            "zip_code": "302021",
            "cuisine_type": CuisineType.JAPANESE,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 40.0,
            "min_order_amount": 220.0,
            "delivery_time_min": 30,
            "delivery_time_max": 52,
            "rating": 4.4,
            "review_count": 99
        },
        {
            "name": "Chimichanga Chase",
            "description": "Deep-fried chimichangas, beef enchiladas and vibrant Mexican street flavours",
            "phone": "+91-98765-00243",
            "email": "hello@chimichangachase.in",
            "address": "17, Malviya Nagar",
            "city": "Jaipur",
            "state": "Rajasthan",
            "zip_code": "302017",
            "cuisine_type": CuisineType.MEXICAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 25.0,
            "min_order_amount": 130.0,
            "delivery_time_min": 22,
            "delivery_time_max": 43,
            "rating": 4.0,
            "review_count": 61
        },
        {
            "name": "Pav Pavilion",
            "description": "Authentic Thai pavilion dining — curries, satays and herbed sticky rice",
            "phone": "+91-98765-00244",
            "email": "contact@pavpavilion.in",
            "address": "11, C-Scheme",
            "city": "Jaipur",
            "state": "Rajasthan",
            "zip_code": "302001",
            "cuisine_type": CuisineType.THAI,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 30.0,
            "min_order_amount": 160.0,
            "delivery_time_min": 25,
            "delivery_time_max": 47,
            "rating": 4.2,
            "review_count": 84
        },
        {
            "name": "Salad Square",
            "description": "Parisian-style salads, quiches and French-pressed coffee in Jaipur",
            "phone": "+91-98765-00245",
            "email": "info@saladsquare.in",
            "address": "6, Mansarovar Sector 3",
            "city": "Jaipur",
            "state": "Rajasthan",
            "zip_code": "302020",
            "cuisine_type": CuisineType.FRENCH,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 40.0,
            "min_order_amount": 200.0,
            "delivery_time_min": 28,
            "delivery_time_max": 50,
            "rating": 4.3,
            "review_count": 102
        },
        # Surat (5)
        {
            "name": "Wok Walk",
            "description": "Walk-in Chinese wok bar — fresh stir-fries, noodles and fried rice to order",
            "phone": "+91-98765-00246",
            "email": "orders@wokwalk.in",
            "address": "14, Adajan Road",
            "city": "Surat",
            "state": "Gujarat",
            "zip_code": "395009",
            "cuisine_type": CuisineType.CHINESE,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 25.0,
            "min_order_amount": 130.0,
            "delivery_time_min": 20,
            "delivery_time_max": 40,
            "rating": 4.1,
            "review_count": 86
        },
        {
            "name": "Satay Street",
            "description": "Chargrilled Thai satay skewers, som tam salad and sweet coconut desserts",
            "phone": "+91-98765-00247",
            "email": "hello@sataystreet.in",
            "address": "8, Vesu",
            "city": "Surat",
            "state": "Gujarat",
            "zip_code": "395007",
            "cuisine_type": CuisineType.THAI,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 30.0,
            "min_order_amount": 150.0,
            "delivery_time_min": 25,
            "delivery_time_max": 45,
            "rating": 4.3,
            "review_count": 93
        },
        {
            "name": "Gyro Grove",
            "description": "Korean-style spiced meats, pickled vegetables and warming gochujang broths",
            "phone": "+91-98765-00248",
            "email": "contact@gyrogrove.in",
            "address": "21, Piplod",
            "city": "Surat",
            "state": "Gujarat",
            "zip_code": "395007",
            "cuisine_type": CuisineType.KOREAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 35.0,
            "min_order_amount": 170.0,
            "delivery_time_min": 25,
            "delivery_time_max": 47,
            "rating": 4.2,
            "review_count": 71
        },
        {
            "name": "Arepa Arc",
            "description": "Korean BBQ and street-food-inspired arc bowls with bold fermented flavours",
            "phone": "+91-98765-00249",
            "email": "info@arepaarc.in",
            "address": "5, Bhulka Bhavan Lane",
            "city": "Surat",
            "state": "Gujarat",
            "zip_code": "395001",
            "cuisine_type": CuisineType.KOREAN,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 30.0,
            "min_order_amount": 160.0,
            "delivery_time_min": 22,
            "delivery_time_max": 44,
            "rating": 4.0,
            "review_count": 58
        },
        {
            "name": "Injera Inn",
            "description": "French-influenced slow-cooked braises, warm baguettes and silky pâtés",
            "phone": "+91-98765-00250",
            "email": "orders@injerainn.in",
            "address": "19, Ring Road",
            "city": "Surat",
            "state": "Gujarat",
            "zip_code": "395002",
            "cuisine_type": CuisineType.FRENCH,
            "status": RestaurantStatus.ACTIVE,
            "delivery_fee": 45.0,
            "min_order_amount": 230.0,
            "delivery_time_min": 30,
            "delivery_time_max": 55,
            "rating": 4.2,
            "review_count": 67
        },
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
        CuisineType.MEXICAN: [
            {"name": "Chicken Tacos", "description": "Soft tortillas with grilled chicken, fresh salsa and cheese", "price": 279.0, "category": "Tacos"},
            {"name": "Veggie Quesadilla", "description": "Flour tortilla stuffed with peppers, onions and melted cheese", "price": 229.0, "category": "Quesadillas", "is_vegetarian": True},
            {"name": "Guacamole and Nachos", "description": "Fresh avocado dip served with crispy tortilla chips", "price": 199.0, "category": "Appetizers", "is_vegetarian": True, "is_vegan": True},
            {"name": "Bean Burrito", "description": "Loaded flour burrito with refried beans, rice and salsa", "price": 249.0, "category": "Burritos", "is_vegetarian": True},
            {"name": "Carne Asada Platter", "description": "Grilled seasoned beef served with rice and black beans", "price": 349.0, "category": "Mains"},
            {"name": "Churros with Chocolate", "description": "Crispy fried dough sticks served with warm chocolate dip", "price": 149.0, "category": "Desserts", "is_vegetarian": True},
        ],
        CuisineType.THAI: [
            {"name": "Pad Thai Noodles", "description": "Stir-fried rice noodles with egg, bean sprouts and roasted peanuts", "price": 299.0, "category": "Noodles", "is_vegetarian": True},
            {"name": "Green Curry Chicken", "description": "Coconut milk green curry with chicken and jasmine rice", "price": 329.0, "category": "Curry"},
            {"name": "Tom Yum Soup", "description": "Hot and sour lemongrass soup with mushrooms and lime", "price": 199.0, "category": "Soups", "is_vegetarian": True, "is_spicy": True},
            {"name": "Green Papaya Salad", "description": "Shredded papaya with chilli, lime juice and crushed peanuts", "price": 179.0, "category": "Salads", "is_vegan": True, "is_spicy": True},
            {"name": "Chicken Satay", "description": "Grilled chicken skewers served with a rich peanut dipping sauce", "price": 269.0, "category": "Appetizers"},
            {"name": "Mango Sticky Rice", "description": "Sweet glutinous rice with fresh mango and coconut cream", "price": 169.0, "category": "Desserts", "is_vegetarian": True, "is_vegan": True},
        ],
        CuisineType.MEDITERRANEAN: [
            {"name": "Chicken Shawarma", "description": "Marinated rotisserie chicken wrapped in pita with garlic sauce", "price": 289.0, "category": "Wraps"},
            {"name": "Falafel Wrap", "description": "Crispy chickpea falafels in pita bread with hummus and pickles", "price": 219.0, "category": "Wraps", "is_vegetarian": True, "is_vegan": True},
            {"name": "Hummus and Pita", "description": "Creamy chickpea hummus drizzled with olive oil and warm pita", "price": 159.0, "category": "Appetizers", "is_vegetarian": True, "is_vegan": True},
            {"name": "Lamb Shish Kebab", "description": "Minced lamb on skewers with herbs, served with saffron rice", "price": 369.0, "category": "Grills"},
            {"name": "Greek Salad", "description": "Cucumber, tomato, olives and feta cheese with extra-virgin olive oil", "price": 199.0, "category": "Salads", "is_vegetarian": True, "is_gluten_free": True},
            {"name": "Baklava", "description": "Layers of crisp phyllo pastry filled with nuts and honey syrup", "price": 129.0, "category": "Desserts", "is_vegetarian": True},
        ],
        CuisineType.KOREAN: [
            {"name": "Bibimbap", "description": "Mixed rice bowl with seasoned vegetables, soft egg and gochujang sauce", "price": 299.0, "category": "Rice Bowls", "is_vegetarian": True, "is_spicy": True},
            {"name": "Bulgogi Beef", "description": "Marinated grilled beef slices served with steamed rice and kimchi", "price": 379.0, "category": "Grills"},
            {"name": "Kimchi Fried Rice", "description": "Wok-fried rice with tangy kimchi, sesame oil and spring onions", "price": 249.0, "category": "Rice", "is_vegetarian": True, "is_spicy": True},
            {"name": "Korean Fried Chicken", "description": "Double-fried crispy chicken wings glazed with sweet gochujang sauce", "price": 349.0, "category": "Chicken", "is_spicy": True},
            {"name": "Japchae Noodles", "description": "Stir-fried glass noodles with colourful vegetables and sesame oil", "price": 279.0, "category": "Noodles", "is_vegetarian": True},
            {"name": "Mandu Dumplings", "description": "Steamed pork and vegetable dumplings served with soy dipping sauce", "price": 199.0, "category": "Appetizers"},
        ],
        CuisineType.FRENCH: [
            {"name": "French Onion Soup", "description": "Slow-cooked caramelized onion broth topped with a gruyere crouton", "price": 229.0, "category": "Soups", "is_vegetarian": True},
            {"name": "Croque Monsieur", "description": "Classic French toasted sandwich with ham, béchamel and melted cheese", "price": 259.0, "category": "Sandwiches"},
            {"name": "Beef Bourguignon", "description": "Slow-braised beef in Burgundy wine with mushrooms and pearl onions", "price": 429.0, "category": "Mains"},
            {"name": "Ratatouille", "description": "Provençal slow-cooked vegetable stew with herbes de Provence", "price": 279.0, "category": "Mains", "is_vegetarian": True, "is_vegan": True},
            {"name": "Crème Brûlée", "description": "Classic vanilla custard with a perfectly caramelized sugar crust", "price": 199.0, "category": "Desserts", "is_vegetarian": True},
            {"name": "Quiche Lorraine", "description": "Buttery shortcrust tart with smoked bacon, egg and cream filling", "price": 269.0, "category": "Baked"},
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

    # Build a session factory from the (now-initialised) engine
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
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
        print("  Developer: developer@example.com / developer123")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
