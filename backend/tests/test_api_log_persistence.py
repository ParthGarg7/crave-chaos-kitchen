from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401
from app.db.base import Base
from app.middleware import observation as observation_middleware
from app.models.api_call_log import ApiCallLog


def test_observation_log_is_persisted_to_database():
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    observation_middleware.get_session_factory = lambda: TestingSessionLocal

    observation_middleware._persist_api_log(
        request_id="req-1",
        method="GET",
        endpoint="/api/v1/orders",
        status_code=200,
        response_time_ms=12.5,
        service_name="demo-food-delivery",
        failure_type="none",
        client_ip="127.0.0.1",
    )

    db = TestingSessionLocal()
    try:
        saved = db.query(ApiCallLog).filter(ApiCallLog.request_id == "req-1").first()
        assert saved is not None
        assert saved.endpoint == "/api/v1/orders"
        assert saved.status_code == 200
    finally:
        db.close()
