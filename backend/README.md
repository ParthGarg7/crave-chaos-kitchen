# CRAVE Backend

> FastAPI-based REST API powering the CRAVE food delivery platform with built-in failure injection, chaos engineering, and observation logging for the Self-Healing Cloud pipeline.

---

## Overview

The backend is a **monolithic FastAPI application** that simulates a microservice architecture through URL-prefix-based service routing. It serves as both a fully functional food delivery API and a controlled failure environment for Niramay's self-healing system.

### Key Capabilities

- **Multi-role authentication** — JWT-based auth with 5 user roles (Customer, Restaurant Owner, Driver, Developer, Admin)
- **Complete food delivery lifecycle** — Restaurant browsing, order placement, payment processing, delivery tracking
- **Failure Simulator** — 9 probability-based failure scenarios injected via middleware
- **Chaos Engineer** — 23 surgical experiments across 6 categories (kill switches, latency, error injection, data corruption, resource exhaustion, cascading failures)
- **Observation Pipeline** — Triple-write architecture logging every API call to Redis + PostgreSQL + RabbitMQ

---

## Project Structure

```
backend/
├── app/
│   ├── api/                    # Route handlers
│   │   ├── auth.py             # Authentication endpoints
│   │   ├── restaurants.py      # Restaurant & menu CRUD
│   │   ├── orders.py           # Order lifecycle
│   │   ├── payments.py         # Payment processing
│   │   ├── delivery.py         # Driver delivery flow
│   │   ├── failure_simulator.py # Failure scenario control
│   │   ├── chaos.py            # Chaos experiment control
│   │   ├── observation.py      # Log retrieval
│   │   └── developer.py        # Developer dashboard data
│   ├── core/                   # Configuration & shared clients
│   │   ├── config.py           # Environment-based settings
│   │   ├── security.py         # JWT token utilities
│   │   └── redis_client.py     # Redis connection
│   ├── db/                     # Database layer
│   │   ├── session.py          # SQLAlchemy session factory
│   │   └── base.py             # Base model
│   ├── middleware/              # Request processing pipeline
│   │   ├── observation.py      # Triple-write observation logging
│   │   ├── api_tracker.py      # In-flight request tracking
│   │   ├── chaos.py            # 23 chaos experiments
│   │   └── failure_simulator.py # 9 failure scenarios
│   ├── models/                 # SQLAlchemy ORM models
│   ├── schemas/                # Pydantic request/response schemas
│   ├── services/               # Business logic layer
│   ├── utils/                  # Shared utilities
│   └── main.py                 # FastAPI app factory & middleware registration
├── tests/                      # Pytest test suite
├── init_db.py                  # Database initialization & seed data
├── patch_db_payment_enums.py   # DB migration: payment enum types
├── patch_db_user_role_developer.py # DB migration: developer role
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Container image definition
└── .env.example                # Environment variable template
```

---

## Middleware Pipeline

Every API request passes through a 4-layer middleware stack:

```
Request → CORS → Observation → ApiTracker → Chaos → FailureSimulator → Route Handler
```

| Layer | Middleware | Purpose |
|-------|-----------|---------|
| 1 | **ObservationMiddleware** | Captures timing, resolves service name, writes to Redis + PostgreSQL + RabbitMQ |
| 2 | **ApiTrackerMiddleware** | Tracks in-flight requests for developer dashboard |
| 3 | **ChaosMiddleware** | Executes 23 chaos experiments (kill switches, latency, error injection, etc.) |
| 4 | **FailureSimulationMiddleware** | Applies 9 probability-based failure scenarios |

### Protected Endpoints

Control endpoints are immune to failure injection to prevent recursive failure loops:
- `/api/v1/failure-simulator`, `/api/v1/chaos`, `/api/v1/observation`, `/api/v1/developer`
- `/health`, `/docs`, `/redoc`, `/openapi.json`

---

## Service Registry

URL prefixes map to logical microservice names for per-service healing:

| Path Prefix | Service Name |
|-------------|-------------|
| `/api/v1/auth` | `crave-auth` |
| `/api/v1/restaurants` | `crave-restaurant` |
| `/api/v1/orders` | `crave-orders` |
| `/api/v1/payments` | `crave-payments` |
| `/api/v1/delivery` | `crave-delivery` |
| `/api/v1/admin` | `crave-admin` |
| `/api/v1/contact` | `crave-notification` |
| *(fallback)* | `crave-gateway` |

---

## Setup

### With Docker (recommended)

```bash
# From the Crave root directory
docker-compose up --build
# Backend available at http://localhost:8001
# API docs at http://localhost:8001/docs
```

### Local development

```bash
# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your local PostgreSQL and Redis connection details

# 4. Initialize database with seed data
python init_db.py

# 5. Start the server
uvicorn app.main:app --reload --port 8000
```

### Running tests

```bash
pytest
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_SERVER` | `crave-postgres` | PostgreSQL hostname |
| `POSTGRES_DB` | `food_delivery` | Database name |
| `REDIS_HOST` | `crave-redis` | Redis hostname |
| `SECRET_KEY` | — | JWT signing secret |
| `FAILURE_SIMULATOR_ENABLED` | `true` | Enable/disable failure injection |
| `RABBITMQ_HOST` | `niramay-rabbitmq` | RabbitMQ hostname for Niramay integration |
| `NIRAMAY_PUBLISH_ENABLED` | `true` | Enable/disable log shipping to Niramay |

---

## Database Schema

| Table | Description |
|-------|-------------|
| `users` | Multi-role users (customer, restaurant_owner, driver, developer, admin) |
| `restaurants` | Restaurant profiles with cuisine, address, delivery settings |
| `menu_items` | Menu items with pricing, dietary flags, availability |
| `orders` | Full order lifecycle with payment and delivery tracking |
| `order_items` | Line items within orders |
| `deliveries` | Delivery assignments with driver, status, location |
| `driver_locations` | Real-time driver GPS coordinates |
| `api_call_logs` | Observation data — every API call with service name, failure type, timing |

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@example.com | password123 |
| Restaurant Owner | restaurant@example.com | password123 |
| Driver | driver@example.com | password123 |
| Developer | developer@example.com | developer123 |
| Admin | admin@example.com | admin123 |
