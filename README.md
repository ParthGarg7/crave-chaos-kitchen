<div align="center">

# 🍔🔥 CRAVE Chaos Kitchen

### A Full-Stack Food Delivery Platform with a Built-In Chaos Lab

*Order food • Run a restaurant • Deliver as a driver • Break everything on purpose*

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![Release](https://img.shields.io/badge/Release-v2.1.0-22c55e?logo=github&logoColor=white)](https://github.com/ParthGarg7/crave-chaos-kitchen/releases/tag/v2.1.0)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Oracle%20Cloud-F80000?logo=oracle&logoColor=white)](https://crave-chaos-kitchen.duckdns.org)

---

</div>

## 🌐 Live Demo

> **Deployed on Oracle Cloud Free Tier** - Ampere A1 (Arm) VM · HTTPS via Caddy + Let's Encrypt · Docker Compose · DuckDNS domain

### 🔗 **[crave-chaos-kitchen.duckdns.org](https://crave-chaos-kitchen.duckdns.org)**

| Service | URL |
|---------|-----|
| 🖥️ **App** | [crave-chaos-kitchen.duckdns.org](https://crave-chaos-kitchen.duckdns.org) |
| ⚡ **Backend API** | [/api/v1/restaurants](https://crave-chaos-kitchen.duckdns.org/api/v1/restaurants) |
| 📚 **API Docs (Swagger)** | [/docs](https://crave-chaos-kitchen.duckdns.org/docs) |
| 🤖 **AI Project Guide** | [/how-it-works](https://crave-chaos-kitchen.duckdns.org/how-it-works) |

**Try the full loop yourself:** log in as the customer and place an order → log in as the restaurant owner and accept it → mark it ready → log in as the driver and deliver it → watch the customer's timeline update live. Credentials are in [Demo Credentials](#demo-credentials) below.

---

## 🌟 What is CRAVE Chaos Kitchen?

CRAVE is a **complete food delivery web application** - customers browse restaurants and place orders, restaurant owners accept and prepare them, drivers claim ready orders and deliver them, all tracked live on a real order timeline with validated state machines.

What makes it different from every other food delivery clone: **it ships with its own chaos engineering lab.** A built-in failure simulator injects 9 classes of realistic API failures (rate limits, timeouts, database errors, dependency outages, service overload) with configurable probability per endpoint, an auto-injector cycles failure scenarios while generating realistic traffic, and an observation layer records every request. Break it on purpose, watch how it behaves, and study real failure modes in a system you fully control.

1. 🛒 **Order** - full customer flow: browse → cart → pay (card/UPI/cash) → live tracking
2. 🍽️ **Manage** - restaurant dashboard: accept/reject, prepare, mark ready
3. 🛵 **Deliver** - driver dashboard: claim ready orders, advance delivery, get rated
4. 💥 **Break** - failure simulator + chaos engineer + auto-injector, all role-guarded
5. 🔭 **Observe** - every request logged with latency, status, and failure tags

---

## 🤖 Understand This Project With AI

Don't feel like reading docs? **Copy the prompt below and paste it into ChatGPT, Claude, Gemini, or any AI assistant** - it turns your AI into a personal guide to this project. It asks whether you're technical or brand new to tech, then explains everything at exactly your level. (Also available in the app: hit **HOW IT WORKS** on the homepage.)

<details>
<summary><strong>📋 Click to expand the prompt, then copy it</strong></summary>

```text
You are now my personal guide to a software project called **CRAVE Chaos Kitchen**. Read everything below carefully, then help me understand it.

FIRST, ask me one question: "Are you (a) new to tech, (b) a developer, or (c) somewhere in between?" Then adapt every explanation to my answer:
- If I'm NEW TO TECH: use everyday analogies (restaurants, post offices, traffic lights), avoid jargon, and explain any technical word the first time you use it. Teach me gently, one concept at a time.
- If I'm a DEVELOPER: be precise and technical. Reference the actual components, endpoints, and design patterns named below. Discuss trade-offs.
- If I'm IN BETWEEN: mix both - lead with the plain-English version, then show the technical detail underneath.

Always invite follow-up questions. If I ask something the text below doesn't answer, say so honestly instead of inventing details.

=== THE PROJECT ===

**CRAVE Chaos Kitchen** (github.com/ParthGarg7/crave-chaos-kitchen) is two things at once:

1. A complete, working **food delivery web application** - like a small Zomato/Swiggy/DoorDash. Customers browse restaurants and order food, restaurant owners accept and prepare orders, delivery drivers pick them up and deliver them, and everyone sees live status updates.

2. A built-in **chaos engineering lab**. Chaos engineering means deliberately breaking your own software in controlled ways to learn how it fails - like a fire drill for computer systems. CRAVE can inject 9 kinds of realistic failures into itself (server errors, timeouts, rate limits, fake outages of payment/maps providers) so you can watch how a real system misbehaves under stress.

That combination is the point: most portfolio apps only show the happy path. CRAVE also shows what happens when things go wrong.

=== WHO USES IT (5 ROLES) ===

- **Customer** - browses restaurants, fills a cart, pays (simulated card/UPI/cash), types a delivery address, tracks the order on a live 7-step timeline, can cancel while it is still pending, rates the delivery, and reviews the restaurant afterward.
- **Restaurant Owner** - sees new orders arrive on a dashboard, can Accept or Reject them, then advances them: Start Preparing → Mark Ready. Also manages the menu (items, prices, availability).
- **Driver** - goes online, sees orders that are READY for pickup (never earlier), claims one, then advances it: Arrived at Restaurant → Picked Up → En Route → Delivered. Earnings tally up.
- **Admin** - manages users (activate/deactivate), sees a session registry, can manually assign drivers.
- **Developer** - the chaos lab persona: toggles failure scenarios, runs chaos experiments, controls the auto-injector, and watches live observation logs of every request.

Demo accounts exist for each role (e.g. customer@example.com / password123).

=== THE ORDER LIFECYCLE (the heart of the app) ===

Every order moves through a strict **state machine** - a fixed set of allowed steps, like traffic lights that can only go green → yellow → red, never backwards:

pending → confirmed → preparing → ready → picked_up → in_transit → delivered

Rules the backend enforces (not just the UI):
- No skipping ahead and no going backwards. pending → delivered is rejected.
- Only the restaurant owner can confirm/prepare/ready an order; only the driver assigned to that specific delivery can advance pickup/transit/delivered.
- Drivers only ever SEE orders that are READY - they cannot claim food that isn't cooked yet.
- Cancelling an order also voids its delivery so drivers stop seeing it. Customers can cancel only while pending; restaurants until pickup.
- Timestamps are recorded at each step and shown on the customer's live timeline, along with an estimated delivery time computed when the restaurant confirms.
- Ratings flow one way: customers rate deliveries and restaurants; drivers cannot rate themselves.

There is a matching delivery state machine on the driver side (accepted → at_restaurant → picked_up → in_transit → delivered).

=== THE CHAOS LAB ===

A middleware chain sits in front of the API (middleware = a checkpoint every request passes through, like airport security lanes). It can:
- **Inject failures**: 9 configurable scenarios - rate_limiting (HTTP 429), auth_expiration (401), payment_timeout (408/504), database_error (500), validation_error (400), stripe_dependency and maps_dependency outages (502/503), config_error (500), service_overload (503). Each has its own probability and target endpoints.
- **Observe everything**: every request is logged with latency, status code, and failure tags into Redis, viewable live in the developer dashboard.
- **Auto-inject**: a separate container cycles failure scenarios on a timer while generating realistic logged-in traffic, so the system is constantly exercised.

There is also a dormant integration: observation logs CAN be shipped over RabbitMQ to an external self-healing system (Niramay) that detects anomalies and heals CRAVE automatically. It is off by default; CRAVE is fully standalone.

=== ARCHITECTURE & TECH STACK ===

Frontend (what you see in the browser):
- React 18 + TypeScript, built with Vite 8. A single-page app with a custom dark "Michelin Midnight" design, plus a global light/dark theme toggle (CSS variables + localStorage).
- Talks to the backend via a REST API using axios; live updates via polling every 15 seconds.

Backend (the server):
- FastAPI (Python 3.11) + SQLAlchemy ORM + Pydantic validation.
- JWT authentication (access + refresh tokens), bcrypt password hashing, role-based guards on every endpoint.
- Email flows: registration verification links and password reset links, using single-purpose signed tokens. Without an SMTP server the emails log to the console and DEBUG mode returns clickable dev links.
- Main API routers: auth, restaurants (incl. reviews), orders, payments, delivery, failure-simulator, chaos-engineer, observation-logs, admin.

Data:
- **PostgreSQL 15** - permanent data: users, restaurants, menus, orders, deliveries, reviews, payments.
- **Redis 7** - fast, temporary data: observation logs, injector state.

Packaging & deployment:
- Everything runs in **Docker** containers orchestrated by Docker Compose (think: each service in its own labeled shipping container, one command starts the whole fleet).
- Dev stack: postgres, redis, backend, frontend (hot reload), auto-injector.
- Production stack (docker-compose.prod.yml): adds **Caddy**, a reverse proxy that terminates HTTPS with automatic Let's Encrypt certificates and serves the compiled frontend; only Caddy is exposed to the internet. Deployed on an Oracle Cloud Free Tier ARM VM with a DuckDNS domain.

Quality:
- 30+ backend tests (state machines, tokens, payments, rate limiting), TypeScript strict builds, and the whole order flow was verified end-to-end in a browser against the running stack.

=== HOW TO EXPLORE IT ===

To run it: install Docker, clone the repo, run "docker compose up --build", open http://localhost:3001. Log in with the demo accounts and try the full loop: order as customer → accept as restaurant → deliver as driver → watch the timeline update.

Good things to ask me to explain next, depending on my level:
- What is a REST API? What is a state machine? What is Docker? (beginner)
- How does the failure-injection middleware decide when to fail a request? (intermediate)
- Why gate driver visibility on READY at the query level instead of the UI? Why JWT action tokens instead of DB reset tokens? Trade-offs of polling vs WebSockets? (advanced)

Now: greet me, ask the level question above, and give me a one-paragraph summary of this project in words matched to my answer.
```

</details>

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph USER["👤 Users"]
        BROWSER["Browser - React SPA<br/>Customer · Restaurant · Driver · Admin · Developer"]
    end

    subgraph STACK["Docker Compose (crave-network)"]
        subgraph BACKEND["FastAPI Backend"]
            MW["Middleware Chain<br/>Chaos → Failure Injection → Observation"]
            API["API Routers<br/>auth · restaurants · orders · payments · delivery<br/>failure-simulator · chaos-engineer · admin · developer"]
            SM["Order + Delivery<br/>State Machines"]
        end

        INJECTOR["Auto-Injector<br/>traffic gen + scenario cycling"]
        POSTGRES[("PostgreSQL 15")]
        REDIS[("Redis 7")]
        FRONTEND["React Frontend"]
    end

    BROWSER --> FRONTEND --> MW
    MW --> API --> SM
    API --> POSTGRES
    API --> REDIS
    INJECTOR -->|"enable/disable scenarios"| API
    INJECTOR -->|"synthetic traffic"| MW
    MW -->|"observation logs"| REDIS
```

---

## 🔄 Order Lifecycle

Every order flows through a **validated state machine** - no skipped states, no going backwards, and each transition is authorized per role:

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

## 💥 The Chaos Lab

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

Drive it three ways, all from the **developer dashboard** (role-guarded):

- **Failure Simulator** - toggle scenarios, tune probabilities, set a global failure rate, watch live metrics
- **Chaos Engineer** - targeted chaos experiments against specific endpoints
- **Auto-Injector** - a dedicated container that cycles scenarios on a schedule (`IDLE → ACTIVE → PAUSED` state machine) while generating realistic logged-in traffic

Every request that flows through the system is captured by the observation middleware with latency, status code, and failure tags - browsable live in the observation logs panel.

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
<a id="demo-credentials"></a>

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@example.com` | `password123` |
| Restaurant Owner | `restaurant@example.com` | `password123` |
| Driver | `driver@example.com` | `password123` |
| Developer | `developer@example.com` | `developer123` |

---

## 🚀 Quick Start

### Prerequisites

- **Docker** and **Docker Compose** - that's it

### Run it

```bash
git clone https://github.com/ParthGarg7/crave-chaos-kitchen.git
cd crave-chaos-kitchen
docker compose up --build
```

### Access

| Service | URL |
|---------|-----|
| 🖥️ **Frontend** | http://localhost:3001 |
| ⚡ **Backend API** | http://localhost:8001 |
| 📚 **API Docs (Swagger)** | http://localhost:8001/docs |

### Deploy to production

The [live demo](#-live-demo) runs exactly this way. A complete Oracle Cloud Free Tier guide (VM setup, both firewalls, DuckDNS domain, automatic HTTPS via Caddy) lives in [`deploy/DEPLOY.md`](deploy/DEPLOY.md):

```bash
cp deploy/.env.prod.example .env   # fill in real secrets
docker compose -f docker-compose.prod.yml up -d --build
```

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
| **Redis** | Observation logs (capped), injector state, traffic toggle | Ephemeral |

---

## 🧪 Testing

```bash
# Backend - 25 tests (state machines, payments, rate limiting, observation)
cd backend && python -m pytest tests/ -v

# Frontend - type-check + production build
cd frontend && npm run build
```

> Backend tests expect the pinned dependency set (`requirements.txt`) - run them inside the Docker container or a virtualenv on Python ≤3.12.

---

## 🛠️ Tech Stack

<table>
<tr><th>Layer</th><th>Technology</th></tr>
<tr><td><strong>Frontend</strong></td><td>React 18, TypeScript 5, Vite 8 (rolldown), TailwindCSS, Framer Motion, Zustand, TanStack Query</td></tr>
<tr><td><strong>Backend</strong></td><td>FastAPI, Python 3.11, SQLAlchemy 2, Pydantic 2, Uvicorn</td></tr>
<tr><td><strong>Databases</strong></td><td>PostgreSQL 15, Redis 7</td></tr>
<tr><td><strong>Auth</strong></td><td>JWT (python-jose), bcrypt, role-based guards</td></tr>
<tr><td><strong>Chaos</strong></td><td>Failure-injection middleware, chaos engineer, auto-injector, observation layer</td></tr>
<tr><td><strong>DevOps</strong></td><td>Docker Compose (dev + prod stacks), Caddy reverse proxy with automatic HTTPS</td></tr>
</table>

---

## 🌳 Project History

The road to v2.0.0, as merged into `main`:

```mermaid
gitGraph
    commit id: "initial platform"
    commit id: "Retro Y2K redesign"
    branch fix/security-deps
    commit id: "aiohttp + multipart CVEs"
    checkout main
    merge fix/security-deps
    branch fix/dependabot-alerts
    commit id: "16 Dependabot alerts fixed"
    checkout main
    merge fix/dependabot-alerts id: "PR #10" tag: "0 vulnerabilities"
    branch fix/ts-build-errors
    commit id: "dead code removed, tsc green"
    checkout main
    merge fix/ts-build-errors id: "PR #12"
    branch feat/order-lifecycle
    commit id: "order + delivery state machines"
    commit id: "real tracking, driver gating"
    checkout main
    merge feat/order-lifecycle id: "PR #13"
    branch fix/vite8-compat
    commit id: "vite 8 + plugin-react 6"
    checkout main
    merge fix/vite8-compat id: "PR #14"
    commit id: "README v2" tag: "v2.0.0"
```

---

## 🔇 Dormant: external observability hook

The observation middleware can additionally ship every request log to an external RabbitMQ queue for downstream analysis (originally built for a self-healing experiment). This is **off by default** and CRAVE is fully standalone without it. To enable it alongside a compatible consumer:

```bash
docker compose -f docker-compose.yml -f docker-compose.niramay.yml up --build
```
