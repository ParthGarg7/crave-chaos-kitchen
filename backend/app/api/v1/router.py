"""
API Router Configuration
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    restaurants,
    orders,
    payments,
    delivery,
    failure_simulator
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router)
api_router.include_router(restaurants.router)
api_router.include_router(orders.router)
api_router.include_router(payments.router)
api_router.include_router(delivery.router)
api_router.include_router(failure_simulator.router)
