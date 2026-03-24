"""
Failure Simulator Configuration
Define all failure types and their simulation parameters
"""
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime
import random
import asyncio


class FailureType(str, Enum):
    """Types of API failures that can be simulated"""
    RATE_LIMIT = "rate_limit"           # 429 Too Many Requests
    TIMEOUT = "timeout"                  # 408/504 Request Timeout
    AUTHENTICATION = "authentication"    # 401 Unauthorized
    AUTHORIZATION = "authorization"      # 403 Forbidden
    SERVER_ERROR = "server_error"        # 500 Internal Server Error
    SERVICE_UNAVAILABLE = "service_unavailable"  # 503 Service Unavailable
    BAD_REQUEST = "bad_request"          # 400 Bad Request
    DEPENDENCY = "dependency"            # 502/503/504 External service failure
    CONFIGURATION = "configuration"      # 500 Config error


class FailureScenario(BaseModel):
    """Configuration for a specific failure scenario"""
    enabled: bool = False
    failure_type: FailureType
    probability: float = Field(0.3, ge=0.0, le=1.0)  # 0-1 chance of failure
    endpoints: List[str] = ["*"]  # Apply to all endpoints by default
    methods: List[str] = ["GET", "POST", "PUT", "PATCH", "DELETE"]
    
    # Type-specific parameters
    rate_limit_requests: int = 10  # Requests allowed per window
    rate_limit_window: int = 60    # Window in seconds
    timeout_seconds: float = 5.0   # Delay before timeout
    error_message: Optional[str] = None
    status_code: Optional[int] = None
    name: Optional[str] = None  # Added for observation tracking
    
    # Conditional failures
    only_for_users: Optional[List[str]] = None  # Specific user IDs
    only_for_ips: Optional[List[str]] = None    # Specific IP addresses
    time_based: bool = False  # Enable time-based failures
    failure_hours: List[int] = []  # Hours when failures occur (0-23)


class FailureSimulatorState(BaseModel):
    """Current state of the failure simulator"""
    enabled: bool = True
    scenarios: Dict[str, FailureScenario] = {}
    global_failure_rate: float = 0.0  # Override all scenarios
    request_count: int = 0
    failure_count: int = 0
    last_updated: datetime = Field(default_factory=datetime.utcnow)


# Default failure scenarios
DEFAULT_SCENARIOS = {
    "rate_limiting": FailureScenario(
        enabled=False,
        failure_type=FailureType.RATE_LIMIT,
        probability=0.5,
        endpoints=["/api/restaurants", "/api/orders"],
        rate_limit_requests=5,
        rate_limit_window=60,
        error_message="Rate limit exceeded. Try again later."
    ),
    "auth_expiration": FailureScenario(
        enabled=False,
        failure_type=FailureType.AUTHENTICATION,
        probability=0.3,
        endpoints=["/api/orders/*", "/api/payments/*", "/api/cart/*"],
        error_message="Your session has expired. Please log in again."
    ),
    "payment_timeout": FailureScenario(
        enabled=False,
        failure_type=FailureType.TIMEOUT,
        probability=0.4,
        endpoints=["/api/payments/*"],
        timeout_seconds=10.0,
        error_message="Payment processing timed out. Please try again."
    ),
    "database_error": FailureScenario(
        enabled=False,
        failure_type=FailureType.SERVER_ERROR,
        probability=0.2,
        endpoints=["/api/v1/restaurants/*", "/api/v1/orders/*", "/api/restaurants/*", "/api/orders/*"],
        error_message="Database connection error. Please try again later."
    ),
    "validation_error": FailureScenario(
        enabled=False,
        failure_type=FailureType.BAD_REQUEST,
        probability=0.3,
        endpoints=["/api/v1/orders", "/api/v1/cart/items", "/api/orders", "/api/cart/items"],
        error_message="Invalid request data. Please check your input."
    ),
    "stripe_dependency": FailureScenario(
        enabled=False,
        failure_type=FailureType.DEPENDENCY,
        probability=0.5,
        endpoints=["/api/v1/payments/*", "/api/payments/*"],
        error_message="Payment service temporarily unavailable."
    ),
    "maps_dependency": FailureScenario(
        enabled=False,
        failure_type=FailureType.DEPENDENCY,
        probability=0.4,
        endpoints=["/api/v1/delivery/*", "/api/v1/maps/*", "/api/delivery/*", "/api/maps/*"],
        error_message="Location service temporarily unavailable."
    ),
    "config_error": FailureScenario(
        enabled=False,
        failure_type=FailureType.CONFIGURATION,
        probability=0.2,
        endpoints=["/api/v1/webhooks/*", "/api/webhooks/*"],
        error_message="Service configuration error. Contact support."
    ),
    "service_overload": FailureScenario(
        enabled=False,
        failure_type=FailureType.SERVICE_UNAVAILABLE,
        probability=0.3,
        endpoints=["*"],
        error_message="Service temporarily overloaded. Please try again later."
    ),
}


class FailureSimulator:
    """
    Core failure simulation engine
    Injects failures into API requests based on configured scenarios
    """
    
    def __init__(self):
        # Initialize scenarios with their names from keys
        scenarios = DEFAULT_SCENARIOS.copy()
        for name, scenario in scenarios.items():
            scenario.name = name
            
        self.state = FailureSimulatorState(scenarios=scenarios)
        self._request_counters: Dict[str, Dict[str, int]] = {}  # For rate limiting
        self._lock = asyncio.Lock()
    
    def enable_scenario(self, name: str) -> None:
        """Enable a failure scenario"""
        if name in self.state.scenarios:
            self.state.scenarios[name].enabled = True
            self.state.last_updated = datetime.utcnow()
    
    def disable_scenario(self, name: str) -> None:
        """Disable a failure scenario"""
        if name in self.state.scenarios:
            self.state.scenarios[name].enabled = False
            self.state.last_updated = datetime.utcnow()
    
    def update_scenario(self, name: str, **kwargs) -> None:
        """Update scenario parameters"""
        if name in self.state.scenarios:
            scenario = self.state.scenarios[name]
            for key, value in kwargs.items():
                if hasattr(scenario, key):
                    setattr(scenario, key, value)
            self.state.last_updated = datetime.utcnow()
    
    def get_scenario(self, name: str) -> Optional[FailureScenario]:
        """Get a specific scenario"""
        return self.state.scenarios.get(name)
    
    def list_scenarios(self) -> Dict[str, FailureScenario]:
        """List all scenarios"""
        return self.state.scenarios
    
    def reset_all(self) -> None:
        """Disable all failure scenarios"""
        for scenario in self.state.scenarios.values():
            scenario.enabled = False
        self.state.global_failure_rate = 0.0
        self.state.last_updated = datetime.utcnow()
    
    def should_fail_request(
        self, 
        endpoint: str, 
        method: str, 
        user_id: Optional[str] = None,
        client_ip: Optional[str] = None
    ) -> Optional[FailureScenario]:
        """
        Determine if a request should fail based on active scenarios
        Returns the scenario that should be applied, or None if no failure
        """
        if not self.state.enabled:
            return None
        
        # Check global failure rate override
        if self.state.global_failure_rate > 0:
            if random.random() < self.state.global_failure_rate:
                # Return a generic server error scenario
                return FailureScenario(
                    enabled=True,
                    failure_type=FailureType.SERVER_ERROR,
                    probability=1.0,
                    error_message="Random failure triggered by global setting"
                )
        
        # Check each enabled scenario
        for scenario in self.state.scenarios.values():
            if not scenario.enabled:
                continue
            
            # Check endpoint match
            endpoint_match = False
            for pattern in scenario.endpoints:
                if pattern == "*" or endpoint.startswith(pattern.replace("*", "")):
                    endpoint_match = True
                    break
            
            if not endpoint_match:
                continue
            
            # Check method match
            if method.upper() not in [m.upper() for m in scenario.methods]:
                continue
            
            # Check user filter
            if scenario.only_for_users and user_id not in scenario.only_for_users:
                continue
            
            # Check IP filter
            if scenario.only_for_ips and client_ip not in scenario.only_for_ips:
                continue
            
            # Check time-based filter
            if scenario.time_based and scenario.failure_hours:
                current_hour = datetime.utcnow().hour
                if current_hour not in scenario.failure_hours:
                    continue
            
            # Check probability
            if random.random() < scenario.probability:
                return scenario
        
        return None
    
    async def check_rate_limit(self, key: str, scenario: FailureScenario) -> bool:
        """
        Check if rate limit is exceeded for a given key
        Returns True if limit exceeded, False otherwise
        """
        async with self._lock:
            now = datetime.utcnow().timestamp()
            window_start = now - scenario.rate_limit_window
            
            if key not in self._request_counters:
                self._request_counters[key] = {}
            
            # Clean old entries
            self._request_counters[key] = {
                ts: count for ts, count in self._request_counters[key].items()
                if float(ts) > window_start
            }
            
            # Count requests in current window
            total_requests = sum(self._request_counters[key].values())
            
            if total_requests >= scenario.rate_limit_requests:
                return True
            
            # Increment counter
            current_ts = str(int(now))
            self._request_counters[key][current_ts] = self._request_counters[key].get(current_ts, 0) + 1
            
            return False
    
    def record_request(self, failed: bool = False) -> None:
        """Record a request for metrics"""
        self.state.request_count += 1
        if failed:
            self.state.failure_count += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get simulator metrics"""
        total = self.state.request_count
        failures = self.state.failure_count
        return {
            "total_requests": total,
            "failed_requests": failures,
            "success_rate": ((total - failures) / total * 100) if total > 0 else 100.0,
            "failure_rate": (failures / total * 100) if total > 0 else 0.0,
            "active_scenarios": sum(1 for s in self.state.scenarios.values() if s.enabled),
            "total_scenarios": len(self.state.scenarios),
            "last_updated": self.state.last_updated.isoformat()
        }


# Global failure simulator instance
failure_simulator = FailureSimulator()
