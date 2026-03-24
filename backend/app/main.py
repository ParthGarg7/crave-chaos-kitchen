"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from app.core.config import settings
from app.core.failure_middleware import FailureSimulationMiddleware
from app.api.v1.router import api_router
from app.core.logging import logger, log_request
from app.middleware.api_tracker import ApiTrackerMiddleware
from app.middleware.chaos_middleware import ChaosMiddleware
from app.middleware.observation import ObservationMiddleware

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    Food Delivery API with Failure Simulation
    
    This API demonstrates various types of API failures that can occur in production:
    - Rate limiting (429)
    - Timeouts (408/504)
    - Authentication failures (401)
    - Authorization failures (403)
    - Server errors (500)
    - Service unavailable (503)
    - Bad requests (400)
    - Dependency failures (502/503/504)
    - Configuration errors (500)
    
    Use the /failure-simulator endpoints to configure and control failure injection.
    """,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add failure simulation middleware (before request logging)
app.add_middleware(FailureSimulationMiddleware)

# Add Chaos Engineer middleware — handles 23 named experiments
app.add_middleware(ChaosMiddleware)

# Add API tracker middleware for Chaos Engineer dashboard (admin tool)
app.add_middleware(ApiTrackerMiddleware)

# Add Observation Layer middleware (outermost layer to record all traffic)
app.add_middleware(ObservationMiddleware)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all API requests"""
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = (time.time() - start_time) * 1000
    
    # Log the request
    log_request(
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration,
        client_ip=request.client.host if request.client else "unknown"
    )
    
    return response


# Include API routers
app.include_router(api_router, prefix="/api/v1")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "debug": settings.DEBUG
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "documentation": "/docs",
        "failure_simulator": "/api/v1/failure-simulator",
        "health": "/health"
    }


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions"""
    logger.error(
        "Unhandled exception",
        error=str(exc),
        path=request.url.path,
        method=request.method
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred",
            "path": request.url.path
        }
    )


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info(
        "Application starting",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG
    )


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Application shutting down")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
