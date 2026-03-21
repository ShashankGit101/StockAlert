import pytest
from httpx import AsyncClient


class TestRegister:
    async def test_success(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={"email": "new@example.com", "password": "secret123"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_duplicate_email(self, client: AsyncClient):
        payload = {"email": "dup@example.com", "password": "secret123"}
        await client.post("/api/v1/auth/register", json=payload)
        resp = await client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 409

    async def test_invalid_email(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={"email": "not-an-email", "password": "secret123"},
        )
        assert resp.status_code == 422

    async def test_missing_password(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/register",
            json={"email": "a@example.com"},
        )
        assert resp.status_code == 422


class TestLogin:
    async def test_success(self, client: AsyncClient):
        await client.post(
            "/api/v1/auth/register",
            json={"email": "login@example.com", "password": "mypassword"},
        )
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "login@example.com", "password": "mypassword"},
        )
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_wrong_password(self, client: AsyncClient):
        await client.post(
            "/api/v1/auth/register",
            json={"email": "wp@example.com", "password": "correct"},
        )
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "wp@example.com", "password": "wrong"},
        )
        assert resp.status_code == 401

    async def test_unknown_email(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "pass"},
        )
        assert resp.status_code == 401


class TestMe:
    async def test_success(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "user@example.com"
        assert "id" in data

    async def test_no_token(self, client: AsyncClient):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    async def test_invalid_token(self, client: AsyncClient):
        resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer totally.invalid.token"},
        )
        assert resp.status_code == 401


class TestPushToken:
    async def test_update_success(self, client: AsyncClient, auth_headers: dict):
        resp = await client.patch(
            "/api/v1/auth/me/push-token",
            json={"expo_push_token": "ExponentPushToken[abc123]"},
            headers=auth_headers,
        )
        assert resp.status_code == 204

    async def test_persisted(self, client: AsyncClient, auth_headers: dict):
        token = "ExponentPushToken[xyz789]"
        await client.patch(
            "/api/v1/auth/me/push-token",
            json={"expo_push_token": token},
            headers=auth_headers,
        )
        me = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert me.json()["expo_push_token"] == token
