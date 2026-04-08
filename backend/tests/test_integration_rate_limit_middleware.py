from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.failure_config import failure_simulator
from app.core.failure_middleware import FailureSimulationMiddleware


def test_rate_limit_middleware_allows_then_blocks():
    app = FastAPI()
    app.add_middleware(FailureSimulationMiddleware)

    @app.get("/api/v1/orders/ping")
    async def ping():
        return {"ok": True}

    scenario = failure_simulator.get_scenario("rate_limiting")
    assert scenario is not None

    # isolate and configure the scenario for deterministic behavior
    failure_simulator.state.enabled = True
    failure_simulator.reset_all()
    failure_simulator.update_scenario(
        "rate_limiting",
        enabled=True,
        probability=1.0,
        endpoints=["/api/v1/orders"],
        methods=["GET"],
        rate_limit_requests=1,
        rate_limit_window=60,
    )

    client = TestClient(app)
    first = client.get("/api/v1/orders/ping")
    second = client.get("/api/v1/orders/ping")

    assert first.status_code == 200
    assert second.status_code == 429

    # cleanup test mutations
    failure_simulator.reset_all()
