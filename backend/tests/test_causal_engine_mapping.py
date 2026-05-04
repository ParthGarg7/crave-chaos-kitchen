"""
Causal Engine Mapping Tests

16 tests covering all failure_tag → healing action mappings.
These tests run with K3S_ENABLED=false (no cluster needed).
Tests ensure the integration contract between CRAVE and Niramay
remains correct: if any string changes, these tests break.
"""
import pytest
import sys
import os

# Ensure backend is in the path
sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..")
)

from app.causal_engine.client import CausalEngine
from app.shared.healing_vocabulary import VALID_ACTIONS


@pytest.fixture
def engine():
    return CausalEngine()


# ─── Priority 1: failure_tag mapping tests ───────────────────────────

class TestFailureTagMapping:
    """Every failure_tag in CRAVE's SCENARIO_TO_TAG must map to the right action."""

    def test_database_error(self, engine):
        result = engine.analyze({"failure_tag": "database_error"})
        assert result["suggested_action"] == "restart_service"
        assert result["matched_by"] == "failure_tag"
        assert result["confidence"] >= 0.80

    def test_service_unavailable(self, engine):
        result = engine.analyze({"failure_tag": "service_unavailable"})
        assert result["suggested_action"] == "scale_up"
        assert result["matched_by"] == "failure_tag"

    def test_config_error(self, engine):
        result = engine.analyze({"failure_tag": "config_error"})
        assert result["suggested_action"] == "rollback_deployment"
        assert result["matched_by"] == "failure_tag"

    def test_rate_limiting(self, engine):
        result = engine.analyze({"failure_tag": "rate_limiting"})
        assert result["suggested_action"] == "throttle_requests"
        assert result["matched_by"] == "failure_tag"

    def test_payment_timeout(self, engine):
        result = engine.analyze({"failure_tag": "payment_timeout"})
        assert result["suggested_action"] == "restart_service"
        assert result["matched_by"] == "failure_tag"

    def test_dependency(self, engine):
        result = engine.analyze({"failure_tag": "dependency"})
        assert result["suggested_action"] == "circuit_breaker"
        assert result["matched_by"] == "failure_tag"

    def test_auth_expiration(self, engine):
        result = engine.analyze({"failure_tag": "auth_expiration"})
        assert result["suggested_action"] == "escalate_only"
        assert result["matched_by"] == "failure_tag"


# ─── Priority 2: multi-engine cascading tests ───────────────────────

class TestMultiEngineCascading:
    """3+ engines or specific reason combos trigger circuit_breaker."""

    def test_three_engines_triggers_circuit_breaker(self, engine):
        result = engine.analyze({
            "failure_tag": "none",
            "engines_triggered": ["feature_rule", "ml_anomaly", "baseline"],
            "anomaly_reasons": ["server_error"],
        })
        assert result["suggested_action"] == "circuit_breaker"
        assert result["matched_by"] == "multi_engine"

    def test_cascading_reason_combo(self, engine):
        result = engine.analyze({
            "failure_tag": "none",
            "engines_triggered": ["feature_rule"],
            "anomaly_reasons": [
                "server_error", "high_latency", "rate_based_error_spike"
            ],
        })
        assert result["suggested_action"] == "circuit_breaker"
        assert result["matched_by"] == "multi_engine"


# ─── Priority 3: single anomaly reason tests ────────────────────────

class TestSingleAnomalyReason:
    """Fallback mapping when failure_tag is absent."""

    def test_server_error_reason(self, engine):
        result = engine.analyze({
            "failure_tag": "none",
            "anomaly_reasons": ["server_error"],
        })
        assert result["suggested_action"] == "restart_service"
        assert result["matched_by"] == "anomaly_reason"

    def test_high_latency_reason(self, engine):
        result = engine.analyze({
            "failure_tag": "none",
            "anomaly_reasons": ["high_latency"],
        })
        assert result["suggested_action"] == "scale_up"
        assert result["matched_by"] == "anomaly_reason"

    def test_rate_limit_reason(self, engine):
        result = engine.analyze({
            "failure_tag": "none",
            "anomaly_reasons": ["rate_limit"],
        })
        assert result["suggested_action"] == "throttle_requests"
        assert result["matched_by"] == "anomaly_reason"

    def test_service_silence_reason(self, engine):
        result = engine.analyze({
            "failure_tag": "none",
            "anomaly_reasons": ["service_silence"],
        })
        assert result["suggested_action"] == "escalate_only"
        assert result["matched_by"] == "anomaly_reason"


# ─── Default fallback test ───────────────────────────────────────────

class TestDefaultFallback:
    """Unknown patterns get escalate_only with low confidence."""

    def test_unknown_pattern(self, engine):
        result = engine.analyze({
            "failure_tag": "none",
            "anomaly_reasons": ["some_unknown_reason"],
        })
        assert result["suggested_action"] == "escalate_only"
        assert result["matched_by"] == "default"
        assert result["confidence"] <= 0.40

    def test_empty_log(self, engine):
        result = engine.analyze({})
        assert result["suggested_action"] == "escalate_only"
        assert result["matched_by"] == "default"


# ─── Vocabulary validation ───────────────────────────────────────────

class TestVocabularyValidation:
    """All actions returned must be in VALID_ACTIONS."""

    @pytest.mark.parametrize("failure_tag", [
        "database_error", "service_unavailable", "config_error",
        "rate_limiting", "payment_timeout", "dependency", "auth_expiration",
    ])
    def test_all_tag_actions_are_valid(self, engine, failure_tag):
        result = engine.analyze({"failure_tag": failure_tag})
        assert result["suggested_action"] in VALID_ACTIONS, (
            f"Action '{result['suggested_action']}' from tag '{failure_tag}' "
            f"is not in VALID_ACTIONS"
        )
