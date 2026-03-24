"""
Database Base Configuration
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator, Optional

# Create base class for models (safe to import anywhere — no DB connection yet)
Base = declarative_base()

# Engine and session are lazily initialised by init_db()
_engine: Optional[object] = None
_SessionLocal: Optional[object] = None


def init_db() -> None:
    """Initialise the database engine and session factory.
    Call this once at application startup (e.g. in main.py lifespan).
    """
    global _engine, _SessionLocal
    from app.core.config import settings  # imported here to avoid circular deps at import time
    _engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        pool_size=10,
        max_overflow=20,
        echo=settings.DEBUG,
    )
    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def get_engine():
    """Return the engine, initialising it if necessary."""
    if _engine is None:
        init_db()
    return _engine


def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session"""
    if _SessionLocal is None:
        init_db()
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
