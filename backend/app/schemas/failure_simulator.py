"""
Failure Simulator Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.failure_config import FailureType


class FailureScenarioResponse(BaseModel):
    """Response schema for a failure scenario"""
    name: str
    enabled: bool
    failure_type: FailureType
    probability: float
    endpoints: List[str]
    methods: List[str]
    error_message: Optional[str] = None
    
    # Type-specific fields
    rate_limit_requests: Optional[int] = None
    rate_limit_window: Optional[int] = None
    timeout_seconds: Optional[float] = None
    
    class Config:
        from_attributes = True


class FailureScenarioUpdate(BaseModel):
    """Update schema for a failure scenario"""
    enabled: Optional[bool] = None
    probability: Optional[float] = Field(None, ge=0.0, le=1.0)
    endpoints: Optional[List[str]] = None
    methods: Optional[List[str]] = None
    error_message: Optional[str] = None
    rate_limit_requests: Optional[int] = None
    rate_limit_window: Optional[int] = None
    timeout_seconds: Optional[float] = None


class FailureSimulatorStatus(BaseModel):
    """Current status of the failure simulator"""
    enabled: bool
    global_failure_rate: float
    active_scenarios: int
    total_scenarios: int
    request_count: int
    failure_count: int
    success_rate: float
    failure_rate: float
    last_updated: datetime


class FailureSimulatorMetrics(BaseModel):
    """Metrics for the failure simulator"""
    total_requests: int
    failed_requests: int
    success_rate: float
    failure_rate: float
    active_scenarios: int
    total_scenarios: int
    last_updated: str


class FailureLogEntry(BaseModel):
    """A single failure log entry"""
    timestamp: datetime
    failure_type: FailureType
    endpoint: str
    method: str
    status_code: int
    error_message: str
    scenario_name: Optional[str] = None
    client_ip: Optional[str] = None
    user_id: Optional[str] = None
    request_id: Optional[str] = None


class FailureLogResponse(BaseModel):
    """Response with failure logs"""
    logs: List[FailureLogEntry]
    total: int
    page: int
    page_size: int


class BulkScenarioUpdate(BaseModel):
    """Update multiple scenarios at once"""
    scenarios: Dict[str, FailureScenarioUpdate]


class PresetScenario(BaseModel):
    """A preset failure scenario configuration"""
    name: str
    description: str
    scenarios: Dict[str, Dict[str, Any]]


# Predefined failure presets
FAILURE_PRESETS = {
    "demo_rate_limiting": {
        "name": "Rate Limiting Demo",
        "description": "Demonstrates rate limiting on restaurant browsing and ordering",
        "scenarios": {
            "rate_limiting": {"enabled": True, "probability": 0.7}
        }
    },
    "demo_auth_failures": {
        "name": "Authentication Failures Demo",
        "description": "Simulates expired tokens and authentication errors",
        "scenarios": {
            "auth_expiration": {"enabled": True, "probability": 0.5}
        }
    },
    "demo_payment_issues": {
        "name": "Payment Issues Demo",
        "description": "Simulates payment timeouts and gateway failures",
        "scenarios": {
            "payment_timeout": {"enabled": True, "probability": 0.6},
            "stripe_dependency": {"enabled": True, "probability": 0.4}
        }
    },
    "demo_server_errors": {
        "name": "Server Errors Demo",
        "description": "Simulates various server-side failures",
        "scenarios": {
            "database_error": {"enabled": True, "probability": 0.4},
            "service_overload": {"enabled": True, "probability": 0.3}
        }
    },
    "demo_all_failures": {
        "name": "All Failures Demo",
        "description": "Enables all failure types at moderate probability",
        "scenarios": {
            "rate_limiting": {"enabled": True, "probability": 0.3},
            "auth_expiration": {"enabled": True, "probability": 0.2},
            "payment_timeout": {"enabled": True, "probability": 0.3},
            "database_error": {"enabled": True, "probability": 0.2},
            "validation_error": {"enabled": True, "probability": 0.3},
            "stripe_dependency": {"enabled": True, "probability": 0.3},
            "maps_dependency": {"enabled": True, "probability": 0.2},
            "service_overload": {"enabled": True, "probability": 0.2}
        }
    },
    "chaos_mode": {
        "name": "Chaos Mode",
        "description": "Maximum failure injection for stress testing",
        "scenarios": {
            "rate_limiting": {"enabled": True, "probability": 0.8},
            "auth_expiration": {"enabled": True, "probability": 0.7},
            "payment_timeout": {"enabled": True, "probability": 0.8},
            "database_error": {"enabled": True, "probability": 0.6},
            "validation_error": {"enabled": True, "probability": 0.7},
            "stripe_dependency": {"enabled": True, "probability": 0.8},
            "maps_dependency": {"enabled": True, "probability": 0.7},
            "config_error": {"enabled": True, "probability": 0.5},
            "service_overload": {"enabled": True, "probability": 0.6}
        }
    },
    "clear_all": {
        "name": "Clear All Failures",
        "description": "Disable all failure scenarios",
        "scenarios": {}
    }
}
