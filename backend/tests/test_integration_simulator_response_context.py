from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.failure_config import failure_simulator
from app.core.failure_middleware import FailureSimulationMiddleware


def test_simulator_failure_includes_affected_api_context():
    app = FastAPI()
    app.add_middleware(FailureSimulationMiddleware)

    @app.get("/api/v1/restaurants/ping")
    async def ping():
        return {"ok": True}

    failure_simulator.state.enabled = True
    failure_simulator.reset_all()
    failure_simulator.update_scenario(
        "service_overload",
        enabled=True,
        probability=1.0,
        endpoints=["/api/v1/restaurants"],
        methods=["GET"],
    )

    client = TestClient(app)
    response = client.get("/api/v1/restaurants/ping")
    assert response.status_code == 503
    payload = response.json()
    assert payload["affected_api"]["endpoint"] == "/api/v1/restaurants/ping"
    assert payload["affected_api"]["method"] == "GET"
    assert payload["affected_api"]["scenario"] == "service_overload"

    failure_simulator.reset_all()
