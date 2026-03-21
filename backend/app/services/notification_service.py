"""Sends push notifications via Expo Push Notification service."""

import httpx

from app.core.config import settings

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(expo_push_token: str, title: str, body: str, data: dict | None = None) -> None:
    """Fire a push notification to a single Expo push token."""
    payload = {
        "to": expo_push_token,
        "title": title,
        "body": body,
        "data": data or {},
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(
            EXPO_PUSH_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.EXPO_ACCESS_TOKEN}",
                "Accept": "application/json",
            },
        )
        response.raise_for_status()
