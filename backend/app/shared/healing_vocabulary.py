"""
Healing Vocabulary — Single Source of Truth

All valid healing action strings used across the system.
Every strategy, every causal engine output, every test
must reference this set. Adding a new action requires:
  1. Add to VALID_ACTIONS below
  2. Create a strategy class
  3. Register in executor.py
  4. Add mapping in causal_engine client.py
"""

VALID_ACTIONS = {
    "restart_service",
    "scale_up",
    "rollback_deployment",
    "throttle_requests",
    "circuit_breaker",
    "flush_cache",
    "escalate_only",
    "none",
}
