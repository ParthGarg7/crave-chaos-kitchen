from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.api.v1.endpoints import failure_simulator, payments
from app.api.v1.endpoints.auth import get_current_user
from app.core.failure_config import failure_simulator as simulator_state
from app.db.base import Base, get_db
from app.models.order import Order, PaymentMethod, PaymentStatus
from app.models.restaurant import CuisineType, Restaurant, RestaurantStatus
from app.models.user import User, UserRole


def _build_test_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    return SessionLocal


def _seed_base_records(db):
    customer = User(
        email="customer@test.com",
        hashed_password="hashed",
        first_name="Cust",
        last_name="User",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    owner = User(
        email="owner@test.com",
        hashed_password="hashed",
        first_name="Owner",
        last_name="User",
        role=UserRole.RESTAURANT_OWNER,
        is_active=True,
    )
    admin = User(
        email="admin@test.com",
        hashed_password="hashed",
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add_all([customer, owner, admin])
    db.flush()

    restaurant = Restaurant(
        name="Test Resto",
        owner_id=owner.id,
        phone="+91-9999999999",
        email="resto@test.com",
        address="Addr",
        city="City",
        state="State",
        zip_code="000000",
        cuisine_type=CuisineType.INDIAN,
        status=RestaurantStatus.ACTIVE,
        delivery_fee=10.0,
        min_order_amount=50.0,
    )
    db.add(restaurant)
    db.flush()
    return customer, admin, restaurant


def test_payment_gateway_config_controls_upi_and_card_flows(monkeypatch):
    SessionLocal = _build_test_db()
    db = SessionLocal()
    customer, admin, restaurant = _seed_base_records(db)

    upi_order = Order(
        order_number="ORD-UPI-1",
        customer_id=customer.id,
        restaurant_id=restaurant.id,
        delivery_address="Addr",
        payment_method=PaymentMethod.UPI,
        payment_status=PaymentStatus.PENDING,
        subtotal=100.0,
        delivery_fee=10.0,
        tax=5.0,
        tip=0.0,
        total=115.0,
    )
    card_order = Order(
        order_number="ORD-CARD-1",
        customer_id=customer.id,
        restaurant_id=restaurant.id,
        delivery_address="Addr",
        payment_method=PaymentMethod.CARD,
        payment_status=PaymentStatus.PENDING,
        subtotal=100.0,
        delivery_fee=10.0,
        tax=5.0,
        tip=0.0,
        total=115.0,
    )
    db.add_all([upi_order, card_order])
    db.commit()

    app = FastAPI()
    app.include_router(payments.router, prefix="/api/v1")
    app.include_router(failure_simulator.router, prefix="/api/v1")

    def override_get_db():
        test_db = SessionLocal()
        try:
            yield test_db
        finally:
            test_db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    # Admin config: force UPI failures and card success
    app.dependency_overrides[get_current_user] = lambda: admin
    config_resp = client.post(
        "/api/v1/failure-simulator/payment-config?card_success_rate=1.0&upi_success_rate=0.0"
    )
    assert config_resp.status_code == 200

    # UPI payment should fail with UPI-specific decline code
    app.dependency_overrides[get_current_user] = lambda: customer
    monkeypatch.setattr("app.api.v1.endpoints.payments.random.choice", lambda rows: rows[0])
    upi_resp = client.post(
        "/api/v1/payments/process",
        json={"order_id": upi_order.id, "upi_id": "user@okaxis"},
    )
    assert upi_resp.status_code == 402
    assert upi_resp.json()["detail"]["decline_code"].startswith("upi_")

    # Card payment should succeed under card_success_rate=1.0
    card_resp = client.post(
        "/api/v1/payments/process",
        json={
            "order_id": card_order.id,
            "card_number": "4111111111111111",
            "expiry_month": "12",
            "expiry_year": "2030",
            "cvv": "123",
        },
    )
    assert card_resp.status_code == 200
    assert card_resp.json()["status"] == "completed"

    db.close()
    simulator_state.state.payment_success_rate_card = 0.9
    simulator_state.state.payment_success_rate_upi = 0.82
