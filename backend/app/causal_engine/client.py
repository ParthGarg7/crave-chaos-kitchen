"""
Causal Engine Client

Maps CRAVE failure signals to healing actions using a 3-priority system:
  1. failure_tag (most precise — from CRAVE's exception handler)
  2. Multi-engine detection (3+ engines = cascading failure)
  3. Single anomaly reason (least precise fallback)

All returned suggested_action values are validated against VALID_ACTIONS.
"""
import structlog
from typing import Dict, Any

from app.shared.healing_vocabulary import VALID_ACTIONS

logger = structlog.get_logger(__name__)


class CausalEngine:
    """
    Rule-based causal engine for mapping failure signals to healing actions.
    In Phase 2, this replaces the LLM-based engine as the primary mapper
    since failure_tag provides deterministic signal quality.
    """

    def analyze(self, log: dict) -> dict:
        """
        Main entry point. Attempts rule-based mapping first.
        Returns a dict with root_cause, confidence, suggested_action.
        """
        return self._rule_based_fallback(log)

    def _rule_based_fallback(self, log: dict) -> dict:
        """
        Maps CRAVE failure signals to healing actions.

        Priority order:
        1. failure_tag — most precise, comes directly
           from CRAVE's exception handler or injector
        2. Multi-engine — 3+ engines firing together
           indicates cascading/system-wide failure
        3. Single anomaly reason — least precise,
           used when failure_tag is absent
        """
        failure_tag = log.get("failure_tag", "none")
        reasons = log.get("anomaly_reasons", [])
        engines = log.get("engines_triggered", [])

        # ── Priority 1: failure_tag mapping ──────────
        TAG_MAP = {
            "database_error": (
                "restart_service",
                "Database connection failure or query error. "
                "Service restart will re-establish pool.",
                0.88,
            ),
            "service_unavailable": (
                "scale_up",
                "Service overloaded — current replica count "
                "insufficient for traffic volume.",
                0.85,
            ),
            "config_error": (
                "rollback_deployment",
                "Bad configuration deployed. "
                "Previous version was stable.",
                0.90,
            ),
            "rate_limiting": (
                "throttle_requests",
                "Request rate exceeding configured limits. "
                "Client-side rate reduction needed.",
                0.82,
            ),
            "payment_timeout": (
                "restart_service",
                "Payment gateway timeout. Downstream service "
                "unresponsive — restart clears connection state.",
                0.80,
            ),
            "dependency": (
                "circuit_breaker",
                "External dependency unavailable. "
                "Circuit breaker prevents cascade failure.",
                0.85,
            ),
            "auth_expiration": (
                "escalate_only",
                "Authentication credentials expired. "
                "Requires human intervention to rotate.",
                0.95,
            ),
        }

        if failure_tag and failure_tag != "none":
            if failure_tag in TAG_MAP:
                action, cause, confidence = TAG_MAP[failure_tag]
                return {
                    "root_cause": cause,
                    "confidence": confidence,
                    "suggested_action": action,
                    "analysis_type": "rule_fallback",
                    "matched_by": "failure_tag",
                }

        # ── Priority 2: cascading failure detection ───
        cascading = (
            len(engines) >= 3
            or (
                "server_error" in reasons
                and "high_latency" in reasons
                and any(
                    r in reasons
                    for r in [
                        "rate_based_error_spike",
                        "baseline_deviation",
                        "service_silence",
                    ]
                )
            )
        )

        if cascading:
            return {
                "root_cause": (
                    "Cascading failure across multiple signals. "
                    "System under severe stress — circuit breaker "
                    "prevents further degradation."
                ),
                "confidence": 0.75,
                "suggested_action": "circuit_breaker",
                "analysis_type": "rule_fallback",
                "matched_by": "multi_engine",
            }

        # ── Priority 3: single reason mapping ─────────
        REASON_MAP = {
            "server_error": (
                "restart_service",
                "Internal server error in service logic or database.",
                0.70,
            ),
            "high_latency": (
                "scale_up",
                "Service response time degraded under load. "
                "Additional capacity needed.",
                0.65,
            ),
            "rate_limit": (
                "throttle_requests",
                "API rate limit exceeded by client or "
                "internal service call.",
                0.75,
            ),
            "rate_based_error_spike": (
                "scale_up",
                "Sustained error rate spike — service under "
                "load it cannot handle at current replica count.",
                0.68,
            ),
            "service_silence": (
                "escalate_only",
                "Service not responding for extended period. "
                "May need manual inspection before restart.",
                0.60,
            ),
            "baseline_deviation": (
                "scale_up",
                "Response time significantly above baseline. "
                "Load increasing beyond current capacity.",
                0.55,
            ),
        }

        for reason in reasons:
            if reason in REASON_MAP:
                action, cause, confidence = REASON_MAP[reason]
                return {
                    "root_cause": cause,
                    "confidence": confidence,
                    "suggested_action": action,
                    "analysis_type": "rule_fallback",
                    "matched_by": "anomaly_reason",
                }

        # ── Default: unknown pattern ───────────────────
        return {
            "root_cause": (
                "Unknown anomaly pattern. "
                "Insufficient signals for automatic classification."
            ),
            "confidence": 0.30,
            "suggested_action": "escalate_only",
            "analysis_type": "rule_fallback",
            "matched_by": "default",
        }


# Global singleton
causal_engine = CausalEngine()
