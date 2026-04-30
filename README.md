# CRAVE — Self-Healing Cloud · Component C

> A full-featured food delivery web application purpose-built as a **controlled failure environment** for the Self-Healing Cloud platform. CRAVE generates realistic API traffic, injects configurable failures, and ships observation logs to **Niramay** (the self-healing orchestrator) via RabbitMQ.

---

## System Architecture

```
┌─────────────────────────── selfhealing-network ───────────────────────────┐
│                                                                           │
│  ┌─────────────┐   ┌──────────────┐   ┌───────────────┐                  │
│  │crave-frontend│   │ crave-backend │   │crave-injector │                  │
│  │  :3001→3000  │──▶│  :8001→8000  │◀──│  (no port)    │                  │
│  └─────────────┘   └──────┬───────┘   └───────┬───────┘                  │
│                           │                     │                          │
│              ┌────────────┼─────────────────────┘                          │
│              ▼            ▼                                                │
│  ┌─────────────┐   ┌──────────────┐                                       │
│  │crave-postgres│   │  crave-redis  │                                       │
│  │  :5433→5432  │   │  :6380→6379  │                                       │
│  └─────────────┘   └──────────────┘                                       │
│                                                                           │
│  ┌─────────────────┐   ┌──────────────────┐                               │
│  │niramay-rabbitmq  │   │ niramay-backend   │  ← Niramay containers        │
│  │     :5672        │   │ (Component A)     │                               │
│  └─────────────────┘   └──────────────────┘                               │
└───────────────────────────────────────────────────────────────────────────┘
```

All containers share the **`selfhealing-network`** Docker network, enabling cross-system DNS resolution between CRAVE and Niramay.

### Container Overview

| Container | Technology | Port | Role |
|---|---|---|---|
| `crave-frontend` | Vite + React 18 + TypeScript | `3001 → 3000` | SPA with role-based dashboards |
| `crave-backend` | FastAPI + Uvicorn + SQLAlchemy | `8001 → 8000` | REST API, failure injection, observation |
| `crave-postgres` | PostgreSQL 15 Alpine | `5433 → 5432` | Persistent data store |
| `crave-redis` | Redis 7 Alpine | `6380 → 6379` | Observation logs, injector state, RabbitMQ toggle |
| `crave-injector` | Python (requests + redis) | — | Automated failure injection + traffic generation |

---

## Features

### Core Food Delivery Platform
- **Multi-role user system** — Customer, Restaurant Owner, Driver, Developer, Admin
- **Restaurant management** — Browse, search, CRUD, menu management
- **Order lifecycle** — Create → Confirm → Prepare → Pickup → Deliver
- **Payment processing** — Simulated card & UPI gateway with configurable success rates
- **Delivery tracking** — Driver assignment, location updates, completion flow

### Failure Injection Engine (Two Layers)

#### Layer 1: Failure Simulator (9 scenarios)
Probability-based, broad failure injection via middleware:

| Scenario | HTTP Status | Description |
|---|---|---|
| `rate_limiting` | 429 | Token-bucket rate limit enforcement |
| `auth_expiration` | 401 | Simulated session/token expiry |
| `payment_timeout` | 504 | Payment gateway timeout with delay |
| `database_error` | 500 | Database connection failures |
| `validation_error` | 400 | Request validation errors |
| `stripe_dependency` | 502/503/504 | External payment service failure |
| `maps_dependency` | 502/503/504 | Location service failure |
| `config_error` | 500 | Missing environment/configuration |
| `service_overload` | 503 | Service capacity exhaustion |

#### Layer 2: Chaos Engineer (23 experiments, 6 categories)
Surgical, experiment-level injection for research:

| Category | Count | Behavior |
|---|---|---|
| **A — Kill Switches** | 5 | Immediate 503 return, endpoint completely unavailable |
| **B — Latency** | 4 | Artificial delays (2s–10s) before processing |
| **C — Error Injection** | 4 | Status code replacement (500, 401, 429, 404) |
| **D — Data Corruption** | 4 | Response body mutation (empty arrays, zeroed totals, null fields, malformed JSON) |
| **E — Resource Exhaustion** | 3 | CPU spike, 50MB memory pressure, DB connection hold |
| **F — Cascading Failures** | 3 | Multi-experiment combinations |

### Observation & Logging Pipeline
- **Triple-write architecture**: Redis (real-time) + PostgreSQL (persistence) + RabbitMQ (export to Niramay)
- **Service registry** maps URL prefixes to 11 logical microservice names
- **Log shipping** to Niramay's RabbitMQ queue `component-c-logs` with runtime enable/disable

### Auto-Injector System
- **State machine**: `IDLE → ACTIVE → PAUSED` controlled via Redis
- **Traffic generator**: 8-request cycles hitting realistic API paths every second
- **Scenario cycling**: Rotates through 3 healable failure scenarios (database_error, service_overload, config_error)
- **Heal integration**: Niramay's `/heal` endpoint pauses injector permanently until developer clears it

---

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy 2.x with PostgreSQL
- **Cache/State**: Redis (async via `redis-py`)
- **Auth**: JWT (access + refresh tokens via `python-jose`)
- **Message Queue**: RabbitMQ (`pika`)
- **Docs**: Auto-generated OpenAPI/Swagger at `/docs`

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS + Vanilla CSS (dark theme)
- **State Management**: Zustand (persisted to localStorage)
- **HTTP Client**: Axios (with interceptors for auto-auth, token refresh, global error handling)
- **Animations**: Framer Motion
- **Routing**: React Router v6

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Networking**: Shared external Docker network (`selfhealing-network`)
- **Coordination**: Redis pub/sub keys for inter-container state

---

## Quick Start

### Prerequisites
- Docker and Docker Compose
- An external Docker network named `selfhealing-network`

### Setup & Run

```bash
# 1. Create the shared network (if not already created by Niramay)
docker network create selfhealing-network

# 2. Clone and start all services
git clone <repository-url>
cd CRAVE
docker-compose up --build

# 3. Access the application
#    Frontend:  http://localhost:3001
#    Backend:   http://localhost:8001
#    API Docs:  http://localhost:8001/docs
```

### Local Development (without Docker)

#### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
cp .env.example .env           # Edit with your local DB/Redis settings
python init_db.py
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev                    # Starts on http://localhost:3000
```

> **Note**: The Vite dev server proxies `/api/*` to `http://localhost:8000` automatically.

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@example.com | password123 |
| Restaurant Owner | restaurant@example.com | password123 |
| Driver | driver@example.com | password123 |
| Developer | developer@example.com | developer123 |
| Admin | admin@example.com | admin123 |

---

## Middleware Pipeline

Every API request passes through a 4-layer middleware stack (in order):

```
Request → CORS → ObservationMiddleware → ApiTrackerMiddleware → ChaosMiddleware → FailureSimulationMiddleware → Route Handler
```

| # | Middleware | Purpose |
|---|---|---|
| 1 | **ObservationMiddleware** | Captures request/response timing, resolves logical service name, persists to Redis + PostgreSQL + RabbitMQ |
| 2 | **ApiTrackerMiddleware** | Tracks in-flight requests for the developer dashboard |
| 3 | **ChaosMiddleware** | Executes 23 chaos experiments (kill switches, latency, error injection, data corruption, resource exhaustion) |
| 4 | **FailureSimulationMiddleware** | Applies 9 probability-based failure scenarios |

### Protected Endpoints
These prefixes are **immune** to failure injection:
- `/api/v1/failure-simulator`, `/api/v1/chaos`, `/api/v1/observation`, `/api/v1/developer`
- `/health`, `/docs`, `/redoc`, `/openapi.json`

---

## API Reference

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/auth/register` | Public | Register new user |
| POST | `/api/v1/auth/login` | Public | Login, returns JWT tokens |
| GET | `/api/v1/auth/me` | Auth | Get current user profile |
| POST | `/api/v1/auth/refresh` | Auth | Refresh access token |
| POST | `/api/v1/auth/logout` | Auth | Logout |

### Restaurants
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/restaurants` | Public | List all restaurants |
| GET | `/api/v1/restaurants/{id}` | Public | Get restaurant details |
| GET | `/api/v1/restaurants/{id}/menu` | Public | Get restaurant menu |
| POST | `/api/v1/restaurants` | Owner | Create restaurant |
| GET | `/api/v1/restaurants/my-restaurant` | Owner | Get own restaurant |

### Orders
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/orders` | Customer | Create new order |
| GET | `/api/v1/orders/my-orders` | Customer | List customer's orders |
| GET | `/api/v1/orders/{id}` | Auth | Get order details |
| PATCH | `/api/v1/orders/{id}/status` | Owner | Update order status |
| POST | `/api/v1/orders/{id}/cancel` | Customer | Cancel order |

### Payments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/payments/process` | Customer | Process payment (card/UPI) |
| GET | `/api/v1/payments/methods` | Auth | List payment methods |

### Delivery
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/delivery/available` | Driver | List available deliveries |
| POST | `/api/v1/delivery/{id}/accept` | Driver | Accept delivery |
| POST | `/api/v1/delivery/{id}/location` | Driver | Update driver location |
| POST | `/api/v1/delivery/{id}/complete` | Driver | Complete delivery |

### Failure Simulator (Developer only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/failure-simulator/status` | Simulator status & metrics |
| GET | `/api/v1/failure-simulator/scenarios` | List all scenarios |
| POST | `/api/v1/failure-simulator/scenarios/{name}/enable` | Enable scenario |
| POST | `/api/v1/failure-simulator/scenarios/{name}/disable` | Disable scenario |
| POST | `/api/v1/failure-simulator/reset` | Reset all scenarios |
| POST | `/api/v1/failure-simulator/heal` | **Heal endpoint** (called by Niramay) |
| POST | `/api/v1/failure-simulator/presets/{name}/apply` | Apply failure preset |
| POST | `/api/v1/failure-simulator/payment-config` | Configure payment success rates |

### Injector Control (Developer only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/failure-simulator/injector/state` | Get injector & traffic state |
| POST | `/api/v1/failure-simulator/injector/state` | Set injector state (idle/active) |
| POST | `/api/v1/failure-simulator/injector/traffic` | Enable/disable traffic generator |
| POST | `/api/v1/failure-simulator/injector/clear-pause` | Clear heal-triggered pause |

### RabbitMQ Publishing Control (Developer only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/failure-simulator/rabbitmq/state` | Publishing status |
| POST | `/api/v1/failure-simulator/rabbitmq/state` | Enable/disable log shipping |

### Chaos Engineer (Developer only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/chaos/experiments` | List all 23 experiments |
| POST | `/api/v1/chaos/experiments/{id}/toggle` | Toggle experiment |
| POST | `/api/v1/chaos/reset` | Reset all experiments |
| GET | `/api/v1/chaos/impact-log` | Get chaos impact log |

### Observation (Developer only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/observation/logs` | Retrieve observation logs from Redis |

---

## Service Registry

CRAVE maps URL prefixes to logical microservice names, enabling per-service healing when integrated with Niramay:

| Path Prefix | Service Name | Domain |
|---|---|---|
| `/api/v1/auth` | `crave-auth` | Authentication & sessions |
| `/api/v1/restaurants` | `crave-restaurant` | Restaurant & menu management |
| `/api/v1/orders` | `crave-orders` | Order lifecycle |
| `/api/v1/payments` | `crave-payments` | Payment processing |
| `/api/v1/delivery` | `crave-delivery` | Delivery tracking |
| `/api/v1/admin` | `crave-admin` | Admin operations |
| `/api/v1/contact` | `crave-notification` | Support notifications |
| `/api/v1/developer` | `crave-developer` | Developer dashboard |
| `/api/v1/chaos` | `crave-chaos` | Chaos experiments |
| `/api/v1/failure-simulator` | `crave-simulator` | Failure injection |
| `/api/v1/observation` | `crave-observation` | Log retrieval |
| *(fallback)* | `crave-gateway` | Health, root, unknown paths |

---

## Database Schema

### Tables

| Table | Description |
|---|---|
| `users` | Multi-role users (customer, restaurant_owner, driver, developer, admin) |
| `restaurants` | Restaurant profiles with cuisine, address, delivery settings |
| `menu_items` | Menu items with pricing, dietary flags, availability |
| `orders` | Full order lifecycle with payment and delivery tracking |
| `order_items` | Line items within orders (snapshot of menu item at order time) |
| `deliveries` | Delivery assignments with driver, status, location |
| `driver_locations` | Real-time driver GPS coordinates |
| `api_call_logs` | Observation data — every API call with service name, failure type, timing |

---

## Self-Healing Integration

### Data Flow: CRAVE → Niramay

```
crave-injector                crave-backend                  Niramay
      │                            │                            │
      │── enable scenario ────────▶│                            │
      │── HTTP traffic ───────────▶│                            │
      │                            │── observation log ────────▶│ (via RabbitMQ)
      │                            │                            │
      │                            │                            │── detect failure
      │                            │◀── POST /heal ────────────│
      │                            │── disable all + pause ───▶│
      │◀── reads "paused" ────────│                            │
      │   (stops injecting)        │                            │── verify recovery
```

### Observation Log Schema (Niramay-compatible)

```json
{
    "timestamp": "2026-04-30T18:49:37+00:00",
    "service": "crave-orders",
    "endpoint": "/api/v1/orders/my-orders",
    "method": "GET",
    "status_code": 500,
    "response_time_ms": 12.3,
    "failure_tag": "database_error",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Redis Coordination Keys

| Key | Values | Purpose |
|---|---|---|
| `crave:injector:state` | `idle` / `active` / `paused` | Injector state machine |
| `crave:injector:paused` | `"1"` or absent | Permanent heal marker (no TTL) |
| `crave:injector:current` | scenario name | Currently active scenario |
| `crave:traffic:enabled` | `"0"` / `"1"` | Traffic generator toggle |
| `crave:rabbitmq:enabled` | `"0"` / `"1"` | RabbitMQ publishing toggle |
| `observation:logs` | Redis list | Capped log store (1000 entries) |

---

## Frontend Route Map

| Route | Component | Role Guard | Description |
|---|---|---|---|
| `/` | HeroPage | — | Landing page |
| `/browse` | BrowsePage | — | Restaurant listing |
| `/menu/:id` | MenuPage | — | Restaurant menu & cart |
| `/login` | LoginPage | — | Authentication |
| `/register` | RegisterPage | — | User registration |
| `/tracking` | TrackingPage | Auth | Order tracking |
| `/restaurant-dashboard` | RestaurantDashboard | Owner | Kitchen management |
| `/setup-restaurant` | SetupRestaurantPage | Owner | Restaurant onboarding |
| `/driver-dashboard` | DriverDashboard | Driver | Delivery management |
| `/admin` | AdminPanel | Admin | User & restaurant admin |
| `/developer` | DeveloperDashboard | Developer | Dev tools hub |
| `/developer/failure-simulator` | FailureSimulatorPage | Developer | Scenario control panel |
| `/developer/chaos-engineer` | ChaosEngineer | Developer | 23 experiment toggles |
| `/developer/dual-view` | DualView | Developer | Side-by-side customer + observation |
| `/developer/observation-logs` | ObservationLogsPage | Developer | Live log stream |
| `/developer/analysis` | AnalysisPage | Developer | Metrics & analytics |
| `/developer/injector-control` | InjectorControlPage | Developer | Injector + traffic + RabbitMQ control |

---

## Configuration

### Environment Variables (Backend)

```env
# App
DEBUG=true
FAILURE_SIMULATOR_ENABLED=true

# PostgreSQL
POSTGRES_SERVER=crave-postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=food_delivery

# Redis
REDIS_HOST=crave-redis
REDIS_PORT=6379

# JWT
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM=HS256

# CORS
CORS_ORIGINS=["http://localhost:3001"]

# RabbitMQ (Niramay integration)
RABBITMQ_HOST=niramay-rabbitmq
RABBITMQ_PORT=5672
NIRAMAY_PUBLISH_ENABLED=true
```

### Environment Variables (Injector)

```env
CRAVE_BACKEND_URL=http://crave-backend:8000
CRAVE_DEVELOPER_EMAIL=developer@example.com
CRAVE_DEVELOPER_PASSWORD=developer123
CRAVE_CUSTOMER_EMAIL=customer@example.com
CRAVE_CUSTOMER_PASSWORD=password123
REDIS_HOST=crave-redis
REDIS_PORT=6379
INJECT_INTERVAL_SECONDS=45
SCENARIO_DURATION_SECONDS=40
TRAFFIC_INTERVAL_SECONDS=1
```

---

## Testing

```bash
# Backend tests
cd backend
pytest

# Manual API testing
# Visit http://localhost:8001/docs for interactive Swagger UI
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Monolith with service registry** | Single FastAPI app simulates microservices via path-prefix mapping. Simplifies deployment while enabling per-service healing actions. |
| **Two failure layers** | Simulator for broad scenario-based failures; Chaos Engineer for surgical, experiment-level injection. |
| **Protected control endpoints** | Failure simulator, chaos, and observation endpoints are immune to injection — prevents recursive failure loops. |
| **Triple-write observation** | Redis for real-time dashboards, PostgreSQL for persistence, RabbitMQ for external export to Niramay. |
| **Injector starts in IDLE** | Failures never auto-inject on container startup — requires explicit developer action via UI. |
| **Heal pauses permanently** | After Niramay heals, the injector stays paused (no TTL) until manually cleared — prevents re-injection before verification. |
| **Redis as coordination bus** | Injector, backend, and frontend share state via Redis keys for real-time synchronization without tight coupling. |

---

## License

This project is licensed under the MIT License.

---

**Built for the Self-Healing Cloud Platform** 🔥
