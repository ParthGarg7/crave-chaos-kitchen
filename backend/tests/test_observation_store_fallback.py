import pytest

from app.core.observation_store import ObservationStore


@pytest.mark.asyncio
async def test_observation_store_falls_back_when_redis_unavailable():
    store = ObservationStore()

    async def no_redis():
        return None

    store._get_redis = no_redis  # type: ignore[method-assign]

    entry = {
        "timestamp": "2026-01-01T00:00:00Z",
        "endpoint": "/api/v1/orders",
        "method": "GET",
        "status_code": 200,
        "response_time_ms": 10.1,
        "request_id": "req-test",
        "service_name": "demo-food-delivery",
        "failure_type": "none",
    }
    await store.push_log(entry)
    logs = await store.get_logs(limit=10)

    assert len(logs) >= 1
    assert logs[0]["endpoint"] == "/api/v1/orders"
