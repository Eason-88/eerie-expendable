from fastapi.testclient import TestClient

from app.db.session import init_db
from app.main import app

init_db()
client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "app" in payload


def test_client_config() -> None:
    response = client.get("/api/v1/config/client")
    assert response.status_code == 200
    payload = response.json()
    assert payload["schemaVersion"] == 1
    assert payload["radioCanTransmit"] is False
    assert payload["features"]["cloudSave"] is True
