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
  crave:injector:paused      — set by heal endpoint, TTL 300s
  crave:injector:current     — name of currently active scenario

Environment variables:
  CRAVE_BACKEND_URL          — http://crave-backend:8000
  CRAVE_DEVELOPER_EMAIL      — developer account email
  CRAVE_DEVELOPER_PASSWORD   — developer account password
  REDIS_HOST                 — redis host
  REDIS_PORT                 — redis port
  INJECT_INTERVAL_SECONDS    — seconds between scenario cycles
  SCENARIO_DURATION_SECONDS  — how long each scenario runs
"""

import os
import time
import logging
import redis
import requests
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [INJECTOR] %(levelname)s %(message)s"
)
log = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────
CRAVE_URL = os.getenv("CRAVE_BACKEND_URL", "http://crave-backend:8000")
DEV_EMAIL = os.getenv("CRAVE_DEVELOPER_EMAIL", "dev@crave-internal.com")
DEV_PASSWORD = os.getenv("CRAVE_DEVELOPER_PASSWORD", "testpass123")
REDIS_HOST = os.getenv("REDIS_HOST", "crave-redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
INJECT_INTERVAL = int(os.getenv("INJECT_INTERVAL_SECONDS", "120"))
SCENARIO_DURATION = int(os.getenv("SCENARIO_DURATION_SECONDS", "60"))

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

# ── Auth ─────────────────────────────────────────────────────
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

def is_paused(r) -> bool:
    return r.exists("crave:injector:paused") > 0

def get_state(r) -> str:
    return r.get("crave:injector:state") or "idle"

def set_state(r, state: str):
    r.set("crave:injector:state", state)
    log.info("Injector state: %s", state)

# ── Main loop ────────────────────────────────────────────────
def main():
    log.info("CRAVE Auto-Injector starting in IDLE state")
    log.info("CRAVE URL: %s", CRAVE_URL)
    log.info("Inject interval: %ss, Scenario duration: %ss",
             INJECT_INTERVAL, SCENARIO_DURATION)

    r = get_redis()
    set_state(r, "idle")
    get_token()

    scenario_index = 0

    while True:
        try:
            state = get_state(r)

            # ── PAUSED state ─────────────────────────────────
            if is_paused(r):
                if state != "paused":
                    set_state(r, "paused")
                    disable_all()
                    log.info(
                        "Injector paused — heal endpoint was called. "
                        "Will resume when crave:injector:paused TTL expires"
                    )
                time.sleep(10)
                continue

            # ── IDLE state ───────────────────────────────────
            if state == "idle":
                time.sleep(5)
                continue

            # ── ACTIVE state ─────────────────────────────────
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
                    # Hold scenario active for SCENARIO_DURATION
                    # checking for pause every 5 seconds
                    elapsed = 0
                    while elapsed < SCENARIO_DURATION:
                        if is_paused(r):
                            break
                        if get_state(r) == "idle":
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

                # Wait between scenarios checking for pause/idle
                elapsed = 0
                while elapsed < INJECT_INTERVAL:
                    if is_paused(r) or get_state(r) == "idle":
                        break
                    time.sleep(5)
                    elapsed += 5

        except Exception as e:
            log.error("Injector loop error: %s", e)
            time.sleep(10)

if __name__ == "__main__":
    main()
