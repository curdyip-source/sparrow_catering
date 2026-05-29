from fastapi.testclient import TestClient

from app.main import app


def test_healthcheck() -> None:
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_bootstrap_status_endpoint() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/bootstrap/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["needs_admin"] is True
    assert "secret_configured" in payload
