import pytest
from httpx import AsyncClient


VALID_ALERT = {"ticker": "aapl", "target_price": 200.0, "direction": "above"}


class TestListAlerts:
    async def test_empty(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/alerts/", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_returns_own_alerts(self, client: AsyncClient, auth_headers: dict):
        await client.post("/api/v1/alerts/", json=VALID_ALERT, headers=auth_headers)
        resp = await client.get("/api/v1/alerts/", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    async def test_does_not_return_other_users_alerts(
        self, client: AsyncClient, auth_headers: dict, other_auth_headers: dict
    ):
        await client.post("/api/v1/alerts/", json=VALID_ALERT, headers=other_auth_headers)
        resp = await client.get("/api/v1/alerts/", headers=auth_headers)
        assert resp.json() == []

    async def test_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/alerts/")
        assert resp.status_code == 401


class TestCreateAlert:
    async def test_success(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post("/api/v1/alerts/", json=VALID_ALERT, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["ticker"] == "AAPL"  # normalised to uppercase
        assert data["target_price"] == 200.0
        assert data["direction"] == "above"
        assert data["status"] == "active"
        assert "id" in data

    async def test_normalises_ticker_to_uppercase(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post(
            "/api/v1/alerts/",
            json={"ticker": "  msft  ", "target_price": 400.0, "direction": "below"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        assert resp.json()["ticker"] == "MSFT"

    async def test_rejects_zero_price(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post(
            "/api/v1/alerts/",
            json={"ticker": "GOOG", "target_price": 0, "direction": "above"},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    async def test_rejects_negative_price(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post(
            "/api/v1/alerts/",
            json={"ticker": "GOOG", "target_price": -10.0, "direction": "above"},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    async def test_rejects_invalid_direction(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post(
            "/api/v1/alerts/",
            json={"ticker": "GOOG", "target_price": 100.0, "direction": "sideways"},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    async def test_requires_auth(self, client: AsyncClient):
        resp = await client.post("/api/v1/alerts/", json=VALID_ALERT)
        assert resp.status_code == 401


class TestDeleteAlert:
    async def test_success(self, client: AsyncClient, auth_headers: dict):
        create = await client.post("/api/v1/alerts/", json=VALID_ALERT, headers=auth_headers)
        alert_id = create.json()["id"]
        resp = await client.delete(f"/api/v1/alerts/{alert_id}", headers=auth_headers)
        assert resp.status_code == 204

    async def test_sets_status_cancelled(self, client: AsyncClient, auth_headers: dict):
        create = await client.post("/api/v1/alerts/", json=VALID_ALERT, headers=auth_headers)
        alert_id = create.json()["id"]
        await client.delete(f"/api/v1/alerts/{alert_id}", headers=auth_headers)
        alerts = await client.get("/api/v1/alerts/", headers=auth_headers)
        assert alerts.json()[0]["status"] == "cancelled"

    async def test_not_found(self, client: AsyncClient, auth_headers: dict):
        resp = await client.delete("/api/v1/alerts/99999", headers=auth_headers)
        assert resp.status_code == 404

    async def test_cannot_delete_other_users_alert(
        self, client: AsyncClient, auth_headers: dict, other_auth_headers: dict
    ):
        create = await client.post("/api/v1/alerts/", json=VALID_ALERT, headers=other_auth_headers)
        alert_id = create.json()["id"]
        resp = await client.delete(f"/api/v1/alerts/{alert_id}", headers=auth_headers)
        assert resp.status_code == 404

    async def test_cannot_delete_already_cancelled(self, client: AsyncClient, auth_headers: dict):
        create = await client.post("/api/v1/alerts/", json=VALID_ALERT, headers=auth_headers)
        alert_id = create.json()["id"]
        await client.delete(f"/api/v1/alerts/{alert_id}", headers=auth_headers)
        resp = await client.delete(f"/api/v1/alerts/{alert_id}", headers=auth_headers)
        assert resp.status_code == 409

    async def test_requires_auth(self, client: AsyncClient):
        resp = await client.delete("/api/v1/alerts/1")
        assert resp.status_code == 401
