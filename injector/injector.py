"""
CRAVE Auto-Injector
===================
Automatically injects failure scenarios into CRAVE on a
schedule to drive the self-healing pipeline.

State machine:
  IDLE     — waiting for manual trigger, injecting nothing
  ACTIVE   — cycling through scenarios on schedule
  PAUSED   — healing endpoint called, waiting before resuming

The injector starts in IDLE state and requires a manual
trigger via the CRAVE failure simulator API or a future
control endpoint. This is intentional — failures should not
start automatically on container startup.

Redis keys used:
  crave:injector:state       — current state (idle/active/paused)
  crave:injector:paused      — marker set by heal endpoint (no TTL, permanent until cleared)
  crave:injector:current     — name of currently active scenario
  crave:traffic:enabled      — "0" to pause traffic gen, "1"/absent to run

Environment variables:
  CRAVE_BACKEND_URL          — http://crave-backend:8000
  CRAVE_DEVELOPER_EMAIL      — developer account email
  CRAVE_DEVELOPER_PASSWORD   — developer account password
  CRAVE_CUSTOMER_EMAIL       — customer account email (traffic gen)
  CRAVE_CUSTOMER_PASSWORD    — customer account password (traffic gen)
  REDIS_HOST                 — redis host
  REDIS_PORT                 — redis port
  INJECT_INTERVAL_SECONDS    — seconds between scenario cycles
  SCENARIO_DURATION_SECONDS  — how long each scenario runs
  TRAFFIC_INTERVAL_SECONDS   — seconds between traffic gen requests
"""

import os
import time
import random
import logging
import threading
import redis
import requests
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [INJECTOR] %(levelname)s %(message)s"
)
log = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────
CRAVE_URL = os.getenv("CRAVE_BACKEND_URL", "http://crave-backend:8000")
DEV_EMAIL = os.getenv("CRAVE_DEVELOPER_EMAIL", "dev@crave-internal.com")
DEV_PASSWORD = os.getenv("CRAVE_DEVELOPER_PASSWORD", "testpass123")
CUST_EMAIL = os.getenv("CRAVE_CUSTOMER_EMAIL", "customer@example.com")
CUST_PASSWORD = os.getenv("CRAVE_CUSTOMER_PASSWORD", "password123")
REDIS_HOST = os.getenv("REDIS_HOST", "crave-redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
INJECT_INTERVAL = int(os.getenv("INJECT_INTERVAL_SECONDS", "45"))
SCENARIO_DURATION = int(os.getenv("SCENARIO_DURATION_SECONDS", "40"))
TRAFFIC_INTERVAL = float(os.getenv("TRAFFIC_INTERVAL_SECONDS", "1"))

# Scenarios the injector cycles through.
# These are the failures that are genuinely healable by
# restarting the service — memory leak, corrupted state,
# database connection exhaustion, service overload.
# Rate limiting, auth, and dependency failures are excluded
# because they are not healed by restart in real life.
INJECTABLE_SCENARIOS = [
    "database_error",
    "service_overload",
    "config_error",
]

# ── Redis client ─────────────────────────────────────────────
def get_redis():
    return redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=0,
        decode_responses=True
    )

# ── Developer session (injector) ─────────────────────────────
_token = None

def get_token():
    global _token
    try:
        resp = requests.post(
            f"{CRAVE_URL}/api/v1/auth/login",
            json={"email": DEV_EMAIL, "password": DEV_PASSWORD},
            timeout=10
        )
        if resp.status_code == 200:
            _token = resp.json()["access_token"]
            log.info("Authenticated with CRAVE backend")
            return _token
        else:
            log.error("Auth failed: %s", resp.text)
            return None
    except Exception as e:
        log.error("Auth error: %s", e)
        return None

def auth_headers():
    global _token
    if not _token:
        get_token()
    return {"Authorization": f"Bearer {_token}"}

# ── Customer session (traffic generator) ─────────────────────
_customer_token = None

def get_customer_token():
    global _customer_token
    try:
        resp = requests.post(
            f"{CRAVE_URL}/api/v1/auth/login",
            json={"email": CUST_EMAIL, "password": CUST_PASSWORD},
            timeout=10
        )
        if resp.status_code == 200:
            _customer_token = resp.json()["access_token"]
            log.info("Traffic gen: customer session authenticated")
            return _customer_token
        else:
            log.debug("Traffic gen: customer auth failed: %s", resp.text)
            return None
    except Exception as e:
        log.debug("Traffic gen: customer auth error: %s", e)
        return None

def customer_headers():
    global _customer_token
    if not _customer_token:
        get_customer_token()
    return {"Authorization": f"Bearer {_customer_token}"}

# ── CRAVE API calls ──────────────────────────────────────────
def enable_scenario(name: str) -> bool:
    try:
        resp = requests.post(
            f"{CRAVE_URL}/api/v1/failure-simulator/scenarios/{name}/enable",
            headers=auth_headers(),
            timeout=10
        )
        if resp.status_code == 401:
            get_token()
            resp = requests.post(
                f"{CRAVE_URL}/api/v1/failure-simulator/scenarios/{name}/enable",
                headers=auth_headers(),
                timeout=10
            )
        if resp.status_code == 200:
            log.info("Enabled scenario: %s", name)
            return True
        log.error("Failed to enable %s: %s", name, resp.text)
        return False
    except Exception as e:
        log.error("Error enabling %s: %s", name, e)
        return False

def disable_all() -> bool:
    try:
        resp = requests.post(
            f"{CRAVE_URL}/api/v1/failure-simulator/reset",
            headers=auth_headers(),
            timeout=10
        )
        if resp.status_code == 401:
            get_token()
            resp = requests.post(
                f"{CRAVE_URL}/api/v1/failure-simulator/reset",
                headers=auth_headers(),
                timeout=10
            )
        return resp.status_code == 200
    except Exception as e:
        log.error("Error disabling all: %s", e)
        return False

def get_state(r) -> str:
    return r.get("crave:injector:state") or "idle"

def set_state(r, state: str):
    r.set("crave:injector:state", state)
    log.info("Injector state: %s", state)

# ── Traffic generator ────────────────────────────────────────
def traffic_generator():
    """Daemon thread — continuously drives real HTTP traffic through CRAVE."""
    log.info("Traffic generator started")
    r = get_redis()
    get_customer_token()

    while True:
        try:
            # Respect the injector state and traffic-enabled flag
            state = get_state(r)
            if state == "paused":
                time.sleep(5)
                continue

            enabled = r.get("crave:traffic:enabled")
            if enabled == "0":
                time.sleep(5)
                continue

            # Build one cycle of 8 requests with fresh random IDs
            r1 = random.randint(1, 50)
            r2 = random.randint(1, 50)
            r3 = random.randint(1, 50)
            r4 = random.randint(1, 50)

            cycle = [
                ("GET", f"{CRAVE_URL}/api/v1/restaurants?limit=100",   None),
                ("GET", f"{CRAVE_URL}/api/v1/restaurants/{r1}",         None),
                ("GET", f"{CRAVE_URL}/api/v1/restaurants/{r2}/menu",    None),
                ("GET", f"{CRAVE_URL}/api/v1/auth/me",                  "customer"),
                ("GET", f"{CRAVE_URL}/api/v1/orders/my-orders",         "customer"),
                ("GET", f"{CRAVE_URL}/api/v1/restaurants?limit=100",   None),
                ("GET", f"{CRAVE_URL}/api/v1/restaurants/{r3}",         None),
                ("GET", f"{CRAVE_URL}/api/v1/restaurants/{r4}/menu",    None),
            ]

            for method, url, session in cycle:
                # Re-check state and traffic flag before each individual request
                if get_state(r) == "paused" or r.get("crave:traffic:enabled") == "0":
                    break

                try:
                    headers = customer_headers() if session == "customer" else {}
                    resp = requests.request(method, url, headers=headers, timeout=10)

                    # 401 → refresh token and retry once
                    if resp.status_code == 401 and session == "customer":
                        log.info("Traffic gen: refreshing customer token")
                        get_customer_token()
                        headers = customer_headers()
                        resp = requests.request(method, url, headers=headers, timeout=10)

                    path = url.replace(CRAVE_URL, "")
                    log.debug("Traffic gen: %s %s -> %s", method, path, resp.status_code)

                except requests.exceptions.ConnectionError:
                    log.debug("Traffic gen: backend unreachable, waiting 10s")
                    time.sleep(10)
                    break
                except Exception as e:
                    log.debug("Traffic gen: request error: %s", e)

                time.sleep(TRAFFIC_INTERVAL)

        except redis.RedisError as e:
            log.debug("Traffic gen: Redis error: %s", e)
            time.sleep(10)
        except Exception as e:
            log.debug("Traffic gen: unexpected error: %s", e)
            time.sleep(5)

# ── Main loop ────────────────────────────────────────────────
def main():
    log.info("CRAVE Auto-Injector starting in IDLE state")
    log.info("CRAVE URL: %s", CRAVE_URL)
    log.info("Inject interval: %ss, Scenario duration: %ss",
             INJECT_INTERVAL, SCENARIO_DURATION)

    r = get_redis()
    set_state(r, "idle")
    get_token()

    # Start traffic generator as an independent daemon thread
    traffic_thread = threading.Thread(target=traffic_generator, daemon=True, name="traffic-gen")
    traffic_thread.start()

    scenario_index = 0

    while True:
        try:
            state = get_state(r)

            # ── PAUSED state — heal endpoint wrote this, stay until cleared ──
            if state == "paused":
                time.sleep(5)
                continue

            # ── IDLE state ───────────────────────────────────────────────────
            if state == "idle":
                time.sleep(5)
                continue

            # ── ACTIVE state ─────────────────────────────────────────────────
            if state == "active":
                # Pick next scenario
                scenario = INJECTABLE_SCENARIOS[
                    scenario_index % len(INJECTABLE_SCENARIOS)
                ]
                scenario_index += 1

                # Disable previous before enabling new one
                disable_all()
                time.sleep(2)

                # Enable current scenario
                success = enable_scenario(scenario)
                if success:
                    r.set("crave:injector:current", scenario)
                    log.info(
                        "Injecting scenario: %s for %ss",
                        scenario, SCENARIO_DURATION
                    )
                    # Hold scenario active for SCENARIO_DURATION,
                    # bailing early if state changes
                    elapsed = 0
                    while elapsed < SCENARIO_DURATION:
                        current = get_state(r)
                        if current in ("paused", "idle"):
                            break
                        time.sleep(5)
                        elapsed += 5

                # Clean up after scenario duration
                disable_all()
                r.delete("crave:injector:current")
                log.info(
                    "Scenario %s complete. Waiting %ss before next",
                    scenario, INJECT_INTERVAL
                )

                # Wait between scenarios, bail if state changes
                elapsed = 0
                while elapsed < INJECT_INTERVAL:
                    if get_state(r) in ("paused", "idle"):
                        break
                    time.sleep(5)
                    elapsed += 5

        except Exception as e:
            log.error("Injector loop error: %s", e)
            time.sleep(10)

if __name__ == "__main__":
    main()
