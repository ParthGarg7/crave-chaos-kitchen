<div align="center">

# 🍔 CRAVE

### Full-Stack Food Delivery Platform with a Built-In Chaos Lab

*Order food • Run a restaurant • Deliver as a driver • Inject failures • Watch it heal*

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![Release](https://img.shields.io/badge/Release-v2.0.0-22c55e?logo=github&logoColor=white)](https://github.com/Self-healing-cloud-simulater/Crave_Food_Delivery_webapp/releases/tag/v2.0.0)

---

</div>

## 🌟 What is CRAVE?

CRAVE is a **complete food delivery web application** — customers browse restaurants and place orders, restaurant owners accept and prepare them, drivers claim ready orders and deliver them, all tracked live on a real order timeline.

It is also a **controlled failure environment**: a built-in failure simulator can inject 9 classes of realistic API failures (rate limits, timeouts, database errors, dependency outages…) on demand, and every request is observed and shipped to [**Niramay**](https://github.com/Self-healing-cloud-simulater/Niramay_AI_Based_healing_webapp) — the self-healing orchestrator — over RabbitMQ. That makes CRAVE both a real product and a test bench for automated incident detection and remediation.

1. 🛒 **Order** — full customer flow: browse → cart → pay (card/UPI/cash) → live tracking
2. 🍽️ **Manage** — restaurant dashboard: accept/reject, prepare, mark ready
3. 🛵 **Deliver** — driver dashboard: claim ready orders, advance delivery, get rated
4. 💥 **Break** — failure simulator + auto-injector cycle failures through the API
5. 🔭 **Observe** — every request logged to Redis and streamed to Niramay for healing

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph USER["👤 Users"]
        BROWSER["Browser — React SPA<br/>Customer · Restaurant · Driver · Admin · Developer"]
    end

    subgraph CRAVE["CRAVE — Docker (selfhealing-network)"]
        subgraph BACKEND["FastAPI Backend :8001"]
            MW["Middleware Chain<br/>Chaos → Failure Injection → Observation"]
            API["API Routers<br/>auth · restaurants · orders · payments · delivery<br/>failure-simulator · chaos-engineer · admin · developer"]
            SM["Order + Delivery<br/>State Machines"]
        end

        INJECTOR["Auto-Injector<br/>traffic gen + scenario cycling"]
        POSTGRES[("PostgreSQL 15<br/>:5433")]
        REDIS[("Redis 7<br/>:6380")]
        FRONTEND["React Frontend :3001"]
    end

    subgraph NIRAMAY["Niramay — Self-Healing Orchestrator"]
        RABBIT["RabbitMQ<br/>component-c-logs"]
        HEALER["Detection → RCA → Healing"]
    end

    BROWSER --> FRONTEND --> MW
    MW --> API --> SM
    API --> POSTGRES
    API --> REDIS
    INJECTOR -->|"enable/disable scenarios"| API
    INJECTOR -->|"synthetic traffic"| MW
    MW -->|"observation logs"| REDIS
    MW -->|"ship logs"| RABBIT --> HEALER
    HEALER -.->|"heal / restart / pause injector"| CRAVE
```

---

## 🔄 Order Lifecycle

Every order flows through a **validated state machine** — no skipped states, no going backwards, and each transition is authorized per role:

```mermaid
stateDiagram-v2
    [*] --> pending : customer places order
    pending --> confirmed : 🍽️ restaurant accepts
    pending --> cancelled : customer / restaurant
    confirmed --> preparing : 🍽️ start cooking
    confirmed --> cancelled : restaurant
    preparing --> ready : 🍽️ packed & waiting
    preparing --> cancelled : restaurant
    ready --> picked_up : 🛵 assigned driver only
    ready --> cancelled : restaurant
    picked_up --> in_transit : 🛵 en route
    in_transit --> delivered : 🛵 handed over
    delivered --> [*]
    cancelled --> [*]
```

| Rule | Enforcement |
|------|-------------|
| Drivers only see orders marked **Ready** | `/delivery/available` gated on order status |
| Only the **assigned** driver can advance pickup → delivered | driver ↔ delivery match checked per request |
| Cancelling an order **voids its delivery** | delivery marked `failed`, disappears from driver queues |
| Customer cancels while **pending**; restaurant until **pickup** | role-based cancellation matrix |
| ETA computed at confirmation | prep time + route estimate → `estimated_delivery_time` |
| Ratings come from **customers**, not drivers | `POST /delivery/{id}/rate` after delivery |

---

## 🧑‍🤝‍🧑 Roles & Dashboards

| Role | Landing | What they can do |
|------|---------|------------------|
| 🛒 **Customer** | `/browse`, `/orders` | Browse restaurants, order, pay, track live timeline, cancel while pending, rate delivery |
| 🍽️ **Restaurant Owner** | `/restaurant-dashboard` | Accept/Reject incoming orders, advance Preparing → Ready, manage menu & availability |
| 🛵 **Driver** | `/driver-dashboard` | Go online, claim ready orders, advance delivery states, share location |
| ⚙️ **Admin** | `/admin` | User registry, activate/deactivate accounts, assign drivers manually |
| 🛠️ **Developer** | `/developer` | Failure simulator, chaos engineer, injector control, observation logs, dual-view panels |

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@example.com` | `password123` |
| Restaurant Owner | `restaurant@example.com` | `password123` |
| Driver | `driver@example.com` | `password123` |
| Developer | `developer@example.com` | `developer123` |

---

## 💥 Failure Simulator

Nine configurable failure scenarios, each with its own probability, target endpoints, and error semantics:

| Scenario | Failure Type | HTTP | Simulates |
|----------|--------------|:----:|-----------|
| `rate_limiting` | Rate limit | 429 | Traffic exceeding API quotas |
| `auth_expiration` | Authentication | 401 | Expired sessions/tokens |
| `payment_timeout` | Timeout | 408/504 | Slow payment gateway |
| `database_error` | Server error | 500 | Connection pool exhaustion |
| `validation_error` | Bad request | 400 | Malformed client data |
| `stripe_dependency` | Dependency | 502/503 | Payment provider outage |
| `maps_dependency` | Dependency | 502/503 | Location service outage |
| `config_error` | Configuration | 500 | Bad config deployment |
| `service_overload` | Unavailable | 503 | Global overload (all endpoints) |

The **auto-injector** container cycles scenarios on a schedule (`IDLE → ACTIVE → PAUSED` state machine) while generating realistic logged-in traffic — and pauses automatically when Niramay heals the system.

---

## 🚀 Quick Start

### Prerequisites

- **Docker** and **Docker Compose**
- Ports free: `3001` (frontend), `8001` (backend), `5433` (postgres), `6380` (redis)

### 1. Clone & network

```bash
git clone https://github.com/Self-healing-cloud-simulater/Crave_Food_Delivery_webapp.git
cd Crave_Food_Delivery_webapp
docker network create selfhealing-network   # shared with Niramay
```

### 2. Launch

```bash
docker compose up --build
```

### 3. Access

| Service | URL |
|---------|-----|
| 🖥️ **Frontend** | http://localhost:3001 |
| ⚡ **Backend API** | http://localhost:8001 |
| 📚 **API Docs (Swagger)** | http://localhost:8001/docs |

> **Standalone mode:** CRAVE runs fully without Niramay — log shipping simply no-ops if RabbitMQ is unreachable. To enable self-healing, start [Niramay](https://github.com/Self-healing-cloud-simulater/Niramay_AI_Based_healing_webapp) on the same Docker network.

---

## 🔌 API Overview

| Router | Prefix | Highlights |
|--------|--------|-----------|
| Auth | `/api/v1/auth` | JWT register/login/refresh, role-based access |
| Restaurants | `/api/v1/restaurants` | CRUD, menu management, search |
| Orders | `/api/v1/orders` | Create, list, **state-machine status updates**, cancel |
| Payments | `/api/v1/payments` | Card / UPI / cash processing |
| Delivery | `/api/v1/delivery` | Available (READY-gated), accept, advance, location, **rate** |
| Failure Simulator | `/api/v1/failure-simulator` | Enable/disable scenarios, global failure rate, metrics |
| Chaos Engineer | `/api/v1/chaos-engineer` | Targeted chaos experiments |
| Observation Logs | `/api/v1/observation-logs` | Request observation feed (Redis-backed) |
| Admin | `/api/v1/admin` | Session registry, user activation, CSV export |

---

## 🗄️ Data Storage

| Storage | Purpose | Lifetime |
|---------|---------|----------|
| **PostgreSQL** | Users, restaurants, menus, orders, deliveries, payments, API call logs | Permanent |
| **Redis** | Observation logs (capped), injector state, traffic toggle, RabbitMQ switch | Ephemeral |
| **RabbitMQ** *(Niramay)* | `component-c-logs` queue — observation stream to the healing pipeline | Transport |

---

## 🧪 Testing

```bash
# Backend — 25 tests (state machines, payments, rate limiting, observation)
cd backend && python -m pytest tests/ -v

# Frontend — type-check + production build
cd frontend && npm run build
```

> Backend tests expect the pinned dependency set (`requirements.txt`) — run them inside the Docker container or a virtualenv on Python ≤3.12.

---

## 🛠️ Tech Stack

<table>
<tr><th>Layer</th><th>Technology</th></tr>
<tr><td><strong>Frontend</strong></td><td>React 18, TypeScript 5, Vite 8 (rolldown), TailwindCSS, Framer Motion, Zustand, TanStack Query</td></tr>
<tr><td><strong>Backend</strong></td><td>FastAPI, Python 3.11, SQLAlchemy 2, Pydantic 2, Uvicorn</td></tr>
<tr><td><strong>Databases</strong></td><td>PostgreSQL 15, Redis 7</td></tr>
<tr><td><strong>Auth</strong></td><td>JWT (python-jose), bcrypt, role-based guards</td></tr>
<tr><td><strong>Observability</strong></td><td>Structured request observation → Redis + RabbitMQ (Niramay pipeline)</td></tr>
<tr><td><strong>DevOps</strong></td><td>Docker Compose (5 containers), shared external network with Niramay</td></tr>
</table>

---

## 🔗 Related Repositories

| Repository | Description |
|-----------|-------------|
| [**Niramay**](https://github.com/Self-healing-cloud-simulater/Niramay_AI_Based_healing_webapp) | AI-based self-healing orchestrator — consumes CRAVE's logs, detects anomalies, executes remediation |
