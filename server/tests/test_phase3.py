from fastapi.testclient import TestClient

from app.db.session import init_db
from app.main import app

init_db()
client = TestClient(app)


def _auth_headers(device_id: str) -> dict[str, str]:
    res = client.post(
        "/api/v1/auth/dev-login",
        json={"device_id": device_id, "display_name": "测试员"},
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_dev_login_and_save_roundtrip() -> None:
    headers = _auth_headers("pytest-roundtrip")
    empty = client.get("/api/v1/saves/current", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["version"] >= 1

    put = client.put(
        "/api/v1/saves/current",
        headers=headers,
        json={
            "schema_version": 1,
            "version": empty.json()["version"],
            "level_id": "level_01",
            "checkpoint": "sniper",
            "data": {"pigCleared": True, "ritualCleared": True},
        },
    )
    assert put.status_code == 200
    body = put.json()
    assert body["conflict"] is False
    assert body["checkpoint"] == "sniper"
    assert body["data"]["pigCleared"] is True

    got = client.get("/api/v1/saves/current", headers=headers)
    assert got.json()["checkpoint"] == "sniper"


def test_save_conflict() -> None:
    headers = _auth_headers("pytest-conflict")
    current = client.get("/api/v1/saves/current", headers=headers).json()
    first = client.put(
        "/api/v1/saves/current",
        headers=headers,
        json={
            "schema_version": 1,
            "version": current["version"],
            "level_id": "level_01",
            "checkpoint": "explore",
            "data": {"step": 1},
        },
    )
    assert first.status_code == 200
    assert first.json()["conflict"] is False

    stale = client.put(
        "/api/v1/saves/current",
        headers=headers,
        json={
            "schema_version": 1,
            "version": current["version"],
            "level_id": "level_01",
            "checkpoint": "win",
            "data": {"stale": True},
        },
    )
    assert stale.status_code == 200
    payload = stale.json()
    assert payload["conflict"] is True
    assert payload["message"] == "server_newer"
    assert payload["checkpoint"] == "explore"


def test_progress() -> None:
    headers = _auth_headers("pytest-progress")
    res = client.get("/api/v1/progress", headers=headers)
    assert res.status_code == 200
    assert res.json()["current_level"] == "level_01"


def test_wechat_mock_login() -> None:
    res = client.post(
        "/api/v1/auth/wechat",
        json={"code": "mock-code-abc", "display_name": "微信玩家"},
    )
    assert res.status_code == 200
    assert res.json()["platform"] == "wechat"
