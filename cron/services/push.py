"""Send push notifications via Expo Push API."""

import logging

import httpx

from config import config

log = logging.getLogger(__name__)

_EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(token: str, title: str, body: str, data: dict | None = None) -> None:
    payload = {"to": token, "title": title, "body": body, "data": data or {}}
    headers = {"Accept": "application/json", "Accept-Encoding": "gzip, deflate"}
    if config.EXPO_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {config.EXPO_ACCESS_TOKEN}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(_EXPO_PUSH_URL, json=payload, headers=headers)
            resp.raise_for_status()
        result = resp.json()
        # Expo wraps errors inside a 200 response
        for item in result.get("data", []):
            if item.get("status") == "error":
                log.warning("Expo push error for token %s: %s", token[:20], item.get("message"))
    except Exception as e:
        log.warning("Failed to send push to %s: %s", token[:20], e)
