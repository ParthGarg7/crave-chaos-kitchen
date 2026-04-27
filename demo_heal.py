# Requirements: pip install requests docker
# Run from CRAVE project root: python demo_heal.py
# Make sure CRAVE is running: docker compose up -d

"""
demo_heal.py - CRAVE Self-Healing Demo Script

Simulates exactly what Niramay's Component A does in Phase 1:
  1. Detect failures in CRAVE traffic
  2. Call the CRAVE heal endpoint
  3. Restart the backend container
  4. Verify the system recovered

Run this script while the injector is active (started from Injector
Control page) to see the full healing loop end-to-end.
"""

import sys
import time

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests docker")
    sys.exit(1)

try:
    import docker
except ImportError:
    print("ERROR: 'docker' not installed. Run: pip install requests docker")
    sys.exit(1)

# -- Configuration -------------------------------------------------------------

CRAVE_URL             = "http://localhost:8001"
DEV_EMAIL             = "developer@example.com"
DEV_PASSWORD          = "developer123"
BACKEND_CONTAINER     = "crave-backend"
HEALTH_CHECK_URL      = "http://localhost:8001/health"
HEALTH_CHECK_TIMEOUT  = 60   # seconds

# -- Helpers -------------------------------------------------------------------

def _ask(prompt):
    """Prompt the user for y/n. Returns True for y, False for n."""
    while True:
        ans = input(prompt).strip().lower()
        if ans in ("y", "yes"):
            return True
        if ans in ("n", "no"):
            return False
        print("  Please enter y or n.")


def _calc_failure_rate(logs):
    """Return (failed_count, total_count, rate_pct) from observation log list."""
    total  = len(logs)
    failed = sum(1 for l in logs if l.get("failure_type", "none") != "none")
    rate   = (failed / total * 100) if total else 0.0
    return failed, total, rate


# -- Main ----------------------------------------------------------------------

def main():
    print()
    print("+========================================================+")
    print("|     CRAVE Self-Healing Demo  (Component A Simulation)  |")
    print("+========================================================+")
    print()

    # Track summary data for final box
    summary = {
        "heal_called":         False,
        "scenarios_disabled":  0,
        "container_restarted": False,
        "recovery_time":       None,
        "rate_before":         None,
        "rate_after":          None,
    }

    # -- STEP 1: Authenticate --------------------------------------------------
    try:
        resp = requests.post(
            f"{CRAVE_URL}/api/v1/auth/login",
            json={"email": DEV_EMAIL, "password": DEV_PASSWORD},
            timeout=10,
        )
        resp.raise_for_status()
        token = resp.json()["access_token"]
    except requests.exceptions.ConnectionError:
        print(f"ERROR: Cannot connect to CRAVE at {CRAVE_URL}")
        print("       Make sure containers are running: docker compose up -d")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Authentication failed - {e}")
        sys.exit(1)

    headers = {"Authorization": f"Bearer {token}"}
    print("[1/6] Authenticated with CRAVE backend")

    # -- STEP 2: Check injector state ------------------------------------------
    try:
        resp = requests.get(
            f"{CRAVE_URL}/api/v1/failure-simulator/injector/state",
            headers=headers,
            timeout=10,
        )
        resp.raise_for_status()
        state_data = resp.json()
    except Exception as e:
        print(f"ERROR: Could not fetch injector state - {e}")
        sys.exit(1)

    injector_state   = state_data.get("injector_state", "unknown")
    traffic_enabled  = state_data.get("traffic_enabled", True)
    current_scenario = state_data.get("current_scenario") or "none"

    print()
    print(f"       Injector state:    {injector_state}")
    print(f"       Traffic enabled:   {traffic_enabled}")
    print(f"       Current scenario:  {current_scenario}")

    if injector_state == "idle":
        print()
        print("  WARNING: Injector is idle. No failures are being injected.")
        print("           Run this script after starting the injector from")
        print("           the Injector Control page.")
        if not _ask("  Continue anyway? (y/n): "):
            print("Exiting. Start the injector first, then re-run this script.")
            sys.exit(0)

    # -- STEP 3: Check current failure rate ------------------------------------
    try:
        resp = requests.get(
            f"{CRAVE_URL}/api/v1/observation/logs",
            headers=headers,
            params={"limit": 100},
            timeout=15,
        )
        resp.raise_for_status()
        logs_before = resp.json()
    except Exception as e:
        print(f"ERROR: Could not fetch observation logs - {e}")
        sys.exit(1)

    failed_before, total_before, rate_before = _calc_failure_rate(logs_before)
    summary["rate_before"] = rate_before
    print()
    print(f"[2/6] Current failure rate: {rate_before:.1f}%  "
          f"({failed_before} failed / {total_before} total)")

    if rate_before == 0.0:
        print()
        print("  WARNING: No failures detected in recent logs.")
        print("           Make sure the injector is active and wait for")
        print("           failures to appear before running this script.")

    if not _ask("  Continue with healing? (y/n): "):
        print("Exiting. Re-run when failures are visible.")
        sys.exit(0)

    # -- STEP 4: Call heal endpoint --------------------------------------------
    print()
    print("[3/6] Calling CRAVE heal endpoint...")
    try:
        resp = requests.post(
            f"{CRAVE_URL}/api/v1/failure-simulator/heal",
            headers=headers,
            timeout=15,
        )
        resp.raise_for_status()
        heal_data = resp.json()
    except Exception as e:
        print(f"ERROR: Heal endpoint failed - {e}")
        sys.exit(1)

    scenarios_disabled             = heal_data.get("scenarios_disabled", [])
    summary["heal_called"]         = True
    summary["scenarios_disabled"]  = len(scenarios_disabled)
    print(f"       Scenarios disabled: {scenarios_disabled if scenarios_disabled else '(none were active)'}")
    print(f"       Injector paused:    True")
    print(f"       Heal endpoint confirmed.")

    # -- STEP 5: Restart crave-backend container -------------------------------
    print()
    try:
        client    = docker.from_env()
        container = client.containers.get(BACKEND_CONTAINER)
    except docker.errors.DockerException as e:
        print(f"ERROR: Docker SDK not available - {e}")
        print("       Make sure Docker Desktop is running and accessible.")
        sys.exit(1)
    except docker.errors.NotFound:
        print(f"ERROR: Container '{BACKEND_CONTAINER}' not found.")
        print("       Make sure CRAVE is running: docker compose up -d")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Unexpected Docker error - {e}")
        sys.exit(1)

    print(f"[4/6] Restarting {BACKEND_CONTAINER}...")
    try:
        container.restart()
        summary["container_restarted"] = True
        print(f"       Container restart initiated.")
    except Exception as e:
        print(f"ERROR: Could not restart container - {e}")
        sys.exit(1)

    # -- STEP 6: Wait for backend healthy --------------------------------------
    print()
    print(f"[5/6] Waiting for backend to come back healthy  "
          f"(timeout {HEALTH_CHECK_TIMEOUT}s)...")
    print("       ", end="", flush=True)

    t_start   = time.time()
    recovered = False

    while time.time() - t_start < HEALTH_CHECK_TIMEOUT:
        try:
            r = requests.get(HEALTH_CHECK_URL, timeout=3)
            if r.status_code == 200:
                recovered = True
                break
        except requests.exceptions.RequestException:
            pass  # Normal during restart window
        print(".", end="", flush=True)
        time.sleep(3)

    print()  # newline after dots

    elapsed = int(time.time() - t_start)
    summary["recovery_time"] = elapsed

    if recovered:
        print(f"       Backend is healthy again.")
        print(f"       Recovery time: {elapsed}s")
    else:
        print(f"FAILED: Backend did not recover within {HEALTH_CHECK_TIMEOUT}s.")
        print(f"        Check docker logs crave-backend for errors.")
        _print_summary(summary)
        sys.exit(1)

    # -- STEP 7: Verify failure rate dropped -----------------------------------
    print()
    print("[6/6] Waiting 5s for new logs to arrive...")
    time.sleep(5)

    try:
        resp = requests.get(
            f"{CRAVE_URL}/api/v1/observation/logs",
            headers=headers,
            params={"limit": 100},
            timeout=15,
        )
        resp.raise_for_status()
        logs_after = resp.json()
    except Exception as e:
        print(f"ERROR: Could not fetch post-heal logs - {e}")
        sys.exit(1)

    failed_after, total_after, rate_after = _calc_failure_rate(logs_after)
    summary["rate_after"] = rate_after

    print(f"       Post-healing failure rate: {rate_after:.1f}%")
    print(f"       Before: {rate_before:.1f}%  |  After: {rate_after:.1f}%")
    print()

    if rate_after < rate_before:
        print("  [OK] HEALING SUCCESSFUL")
        print("       The self-healing pipeline worked end to end.")
        print("       Failures stopped after Component A intervention.")
    else:
        print("  [i]  NOTE: Failure rate unchanged. This may be because:")
        print("       - Not enough new logs yet (wait 10s and recheck)")
        print("       - Failures were already disabled before healing")
        print()
        print("       To verify manually:")
        print("       1. Open the Observation Logs page in the CRAVE UI")
        print("       2. Check that recent entries show 'none' failure_type")
        print("       3. Confirm crave:injector:state = paused in Redis")

    # -- STEP 8: Summary -------------------------------------------------------
    _print_summary(summary)


def _print_summary(s):
    rate_before_str = f"{s['rate_before']:.1f}%" if s["rate_before"]  is not None else "N/A"
    rate_after_str  = f"{s['rate_after']:.1f}%"  if s["rate_after"]   is not None else "N/A"
    recovery_str    = f"{s['recovery_time']}s"   if s["recovery_time"] is not None else "N/A"
    heal_str        = "YES" if s["heal_called"]         else "NO"
    restart_str     = "YES" if s["container_restarted"] else "NO"
    scenarios_str   = str(s["scenarios_disabled"])

    print()
    print("+==========================================+")
    print("|         HEALING DEMO COMPLETE            |")
    print("+==========================================+")
    print(f"|  Heal endpoint called:    {heal_str:<15}  |")
    print(f"|  Scenarios disabled:      {scenarios_str:<15}  |")
    print(f"|  Container restarted:     {restart_str:<15}  |")
    print(f"|  Recovery time:           {recovery_str:<15}  |")
    print(f"|  Failure rate before:     {rate_before_str:<15}  |")
    print(f"|  Failure rate after:      {rate_after_str:<15}  |")
    print("+==========================================+")
    print("|  Next steps:                             |")
    print("|  1. Open Observation Logs to verify      |")
    print("|  2. Go to Injector Control to restart    |")
    print("|     injection for another demo round     |")
    print("+==========================================+")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user. Exiting cleanly.")
        sys.exit(0)
    except Exception as e:
        print(f"\nUNEXPECTED ERROR: {e}")
        print("Please report this error with the full traceback below.")
        import traceback
        traceback.print_exc()
        sys.exit(1)
