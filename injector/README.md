# CRAVE Auto-Injector

> Automated failure injection daemon that cycles through healable failure scenarios in CRAVE to drive the self-healing pipeline.

---

## Overview

The injector is a Python service that runs alongside the CRAVE backend, automatically enabling and cycling through failure scenarios on a configurable schedule. It also includes a **traffic generator** that continuously drives realistic HTTP requests through CRAVE, ensuring observation logs are produced even without real users.

---

## State Machine

The injector operates as a three-state machine:

```
  ┌────────────────────┐
  │       IDLE         │  ← Default on startup
  │  (waiting for      │     No failures injected
  │   manual trigger)  │     Traffic gen respects enabled flag
  └────────┬───────────┘
           │ Developer activates via UI
           ▼
  ┌────────────────────┐
  │      ACTIVE        │  ← Cycling through scenarios
  │  database_error    │     Each scenario runs for
  │  → service_overload│     SCENARIO_DURATION_SECONDS
  │  → config_error    │     then rotates to next
  └────────┬───────────┘
           │ Niramay calls /heal endpoint
           ▼
  ┌────────────────────┐
  │      PAUSED        │  ← Permanent until developer clears
  │  (heal-triggered)  │     All scenarios disabled
  │                    │     Injector stops cycling
  └────────────────────┘
```

### Design Decisions

- **Starts in IDLE** — Failures never auto-inject on container startup. Requires explicit developer action.
- **Heal pauses permanently** — After Niramay heals, the injector stays paused (no TTL) until manually cleared, preventing re-injection before verification.
- **Only healable scenarios** — The injector only cycles through `database_error`, `service_overload`, and `config_error` — failures genuinely remediated by service restart.

---

## Traffic Generator

A daemon thread runs independently of the injection cycle, generating realistic API traffic:

- **8 requests per cycle** — Hits restaurant listing, detail pages, menu views, auth checks, and order history
- **Authenticated** — Uses a customer session for auth-required endpoints
- **Respects state** — Pauses when injector is paused or traffic is disabled
- **Auto-retry** — Refreshes tokens on 401, waits on connection errors

---

## Redis Coordination Keys

| Key | Values | Purpose |
|-----|--------|---------|
| `crave:injector:state` | `idle` / `active` / `paused` | State machine control |
| `crave:injector:paused` | `"1"` or absent | Permanent heal marker |
| `crave:injector:current` | scenario name | Currently active scenario |
| `crave:traffic:enabled` | `"0"` / `"1"` | Traffic generator toggle |

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CRAVE_BACKEND_URL` | `http://crave-backend:8000` | CRAVE API base URL |
| `CRAVE_DEVELOPER_EMAIL` | `dev@crave-internal.com` | Developer account for API auth |
| `CRAVE_DEVELOPER_PASSWORD` | `testpass123` | Developer account password |
| `CRAVE_CUSTOMER_EMAIL` | `customer@example.com` | Customer account for traffic gen |
| `CRAVE_CUSTOMER_PASSWORD` | `password123` | Customer account password |
| `REDIS_HOST` | `crave-redis` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `INJECT_INTERVAL_SECONDS` | `45` | Seconds between scenario rotations |
| `SCENARIO_DURATION_SECONDS` | `40` | How long each scenario runs |
| `TRAFFIC_INTERVAL_SECONDS` | `1` | Seconds between traffic gen requests |

---

## Files

| File | Description |
|------|-------------|
| `injector.py` | Main injector daemon with state machine and traffic generator |
| `requirements.txt` | Python dependencies (`requests`, `redis`) |
| `Dockerfile` | Container image definition |

---

## Running

### With Docker Compose (recommended)

The injector starts automatically as part of `docker-compose up` from the CRAVE root.

### Standalone

```bash
pip install -r requirements.txt
python injector.py
```

> **Note**: Requires a running CRAVE backend and Redis instance. Set environment variables accordingly.
