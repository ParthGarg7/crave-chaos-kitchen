"""
FastAPI Middleware for Failure Injection
Intercepts requests and applies failure scenarios
"""
import asyncio
import time
import random
from typing import Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.failure_config import failure_simulator, FailureType
from app.core.logging import logger


class FailureSimulationMiddleware(BaseHTTPMiddleware):
    """
    Middleware that intercepts HTTP requests and injects failures
    based on configured scenarios
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Process each request through the failure simulator"""
        
        # Get request info
        endpoint = request.url.path
        method = request.method
        client_ip = request.client.host if request.client else "unknown"
        
        # Try to get user ID from JWT token if available
        user_id = None
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # Extract user ID from token (simplified)
            # In production, decode the JWT properly
            user_id = self._extract_user_from_token(auth_header)
        
        # Check if this request should fail
        scenario = failure_simulator.should_fail_request(
            endpoint=endpoint,
            method=method,
            user_id=user_id,
            client_ip=client_ip
        )
        
        if scenario:
            # Stamp the specific scenario name for the observation layer
            request.state.observation_failure_type = scenario.name or scenario.failure_type.value
            
            logger.info(
                f"Injecting failure: {scenario.name or scenario.failure_type.value} for {method} {endpoint}"
            )
            failure_simulator.record_request(failed=True)
            return await self._inject_failure(request, scenario, client_ip)
        
        # Record successful request
        failure_simulator.record_request(failed=False)
        
        # Continue with normal request
        return await call_next(request)
    
    def _extract_user_from_token(self, auth_header: str) -> Optional[str]:
        """Extract user ID from JWT token (simplified)"""
        # In production, properly decode and validate JWT
        # For now, return a placeholder
        return None
    
    async def _inject_failure(
        self, 
        request: Request, 
        scenario, 
        client_ip: str
    ) -> Response:
        """Inject the appropriate failure based on scenario type"""
        
        failure_type = scenario.failure_type
        
        if failure_type == FailureType.RATE_LIMIT:
            return await self._inject_rate_limit(request, scenario, client_ip)
        
        elif failure_type == FailureType.TIMEOUT:
            return await self._inject_timeout(scenario)
        
        elif failure_type == FailureType.AUTHENTICATION:
            return self._inject_auth_failure(scenario)
        
        elif failure_type == FailureType.AUTHORIZATION:
            return self._inject_forbidden(scenario)
        
        elif failure_type == FailureType.SERVER_ERROR:
            return self._inject_server_error(scenario)
        
        elif failure_type == FailureType.SERVICE_UNAVAILABLE:
            return self._inject_service_unavailable(scenario)
        
        elif failure_type == FailureType.BAD_REQUEST:
            return self._inject_bad_request(scenario)
        
        elif failure_type == FailureType.DEPENDENCY:
            return self._inject_dependency_failure(scenario)
        
        elif failure_type == FailureType.CONFIGURATION:
            return self._inject_config_error(scenario)
        
        # Default fallback
        return self._inject_server_error(scenario)
    
    async def _inject_rate_limit(self, request, scenario, client_ip: str) -> Response:
        """Inject rate limit failure (429)"""
        # Create rate limit key
        endpoint = request.url.path
        key = f"{client_ip}:{endpoint}"
        
        # Check if rate limit exceeded
        is_limited = await failure_simulator.check_rate_limit(key, scenario)
        
        if is_limited:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "RateLimitExceeded",
                    "message": scenario.error_message or "Too many requests. Please slow down.",
                    "retry_after": scenario.rate_limit_window,
                    "limit": scenario.rate_limit_requests,
                    "window": scenario.rate_limit_window
                },
                headers={
                    "X-RateLimit-Limit": str(scenario.rate_limit_requests),
                    "X-RateLimit-Window": str(scenario.rate_limit_window),
                    "Retry-After": str(scenario.rate_limit_window)
                }
            )
        
        # If not limited yet, let the request through
        # (it will be counted and may fail on next request)
        return JSONResponse(
            status_code=429,
            content={
                "error": "RateLimitExceeded",
                "message": scenario.error_message or "Rate limit exceeded.",
                "retry_after": scenario.rate_limit_window
            },
            headers={"Retry-After": str(scenario.rate_limit_window)}
        )
    
    async def _inject_timeout(self, scenario) -> Response:
        """Inject timeout failure (408/504)"""
        # Simulate delay before timeout
        delay = scenario.timeout_seconds or random.uniform(5, 15)
        await asyncio.sleep(delay)
        
        # Return gateway timeout
        return JSONResponse(
            status_code=504,
            content={
                "error": "GatewayTimeout",
                "message": scenario.error_message or "Request timed out. Please try again.",
                "timeout_seconds": delay
            }
        )
    
    def _inject_auth_failure(self, scenario) -> Response:
        """Inject authentication failure (401)"""
        return JSONResponse(
            status_code=401,
            content={
                "error": "Unauthorized",
                "message": scenario.error_message or "Authentication required. Please log in.",
                "auth_url": "/api/auth/login"
            },
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    def _inject_forbidden(self, scenario) -> Response:
        """Inject authorization failure (403)"""
        return JSONResponse(
            status_code=403,
            content={
                "error": "Forbidden",
                "message": scenario.error_message or "You don't have permission to access this resource.",
                "required_role": "admin"
            }
        )
    
    def _inject_server_error(self, scenario) -> Response:
        """Inject server error (500)"""
        error_messages = [
            "Internal server error occurred.",
            "Database connection failed.",
            "Unexpected error processing request.",
            "Service encountered an error."
        ]
        
        return JSONResponse(
            status_code=500,
            content={
                "error": "InternalServerError",
                "message": scenario.error_message or random.choice(error_messages),
                "request_id": f"req_{random.randint(10000, 99999)}",
                "timestamp": time.time()
            }
        )
    
    def _inject_service_unavailable(self, scenario) -> Response:
        """Inject service unavailable (503)"""
        return JSONResponse(
            status_code=503,
            content={
                "error": "ServiceUnavailable",
                "message": scenario.error_message or "Service temporarily unavailable. Please try again later.",
                "retry_after": 30
            },
            headers={"Retry-After": "30"}
        )
    
    def _inject_bad_request(self, scenario) -> Response:
        """Inject bad request error (400)"""
        validation_errors = {
            "field_errors": [
                {"field": "quantity", "message": "Must be greater than 0"},
                {"field": "item_id", "message": "Invalid item ID format"},
                {"field": "address", "message": "Delivery address is required"}
            ]
        }
        
        return JSONResponse(
            status_code=400,
            content={
                "error": "BadRequest",
                "message": scenario.error_message or "Invalid request data.",
                "validation_errors": validation_errors["field_errors"]
            }
        )
    
    def _inject_dependency_failure(self, scenario) -> Response:
        """Inject dependency failure (502/503/504)"""
        dependency_errors = [
            {
                "status": 502,
                "error": "BadGateway",
                "message": "Payment gateway returned an invalid response."
            },
            {
                "status": 503,
                "error": "ServiceUnavailable",
                "message": "External service temporarily unavailable."
            },
            {
                "status": 504,
                "error": "GatewayTimeout",
                "message": "External service did not respond in time."
            }
        ]
        
        error = random.choice(dependency_errors)
        
        return JSONResponse(
            status_code=error["status"],
            content={
                "error": error["error"],
                "message": scenario.error_message or error["message"],
                "dependency": "external_service",
                "retry_after": 60
            },
            headers={"Retry-After": "60"}
        )
    
    def _inject_config_error(self, scenario) -> Response:
        """Inject configuration error (500)"""
        return JSONResponse(
            status_code=500,
            content={
                "error": "ConfigurationError",
                "message": scenario.error_message or "Service configuration error.",
                "details": "Missing required environment variable: API_KEY",
                "contact": "support@fooddelivery.com"
            }
        )
