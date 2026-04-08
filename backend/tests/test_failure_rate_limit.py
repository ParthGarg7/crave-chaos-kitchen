import pytest

from app.core.failure_config import FailureScenario, FailureType, failure_simulator


@pytest.mark.asyncio
async def test_rate_limit_blocks_after_threshold():
    scenario = FailureScenario(
        enabled=True,
        failure_type=FailureType.RATE_LIMIT,
        rate_limit_requests=2,
        rate_limit_window=60,
    )
    key = "127.0.0.1:/api/v1/orders"

    # isolate this test from global counters
    failure_simulator._request_counters.pop(key, None)  # noqa: SLF001

    assert await failure_simulator.check_rate_limit(key, scenario) is False
    assert await failure_simulator.check_rate_limit(key, scenario) is False
    assert await failure_simulator.check_rate_limit(key, scenario) is True
