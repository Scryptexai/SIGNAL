"""AI service — MiMo (Anthropic-compatible Messages API).

Powers both the dashboard analysis panel and the X/Twitter content engine.
Talks directly to the configured Anthropic-compatible endpoint over httpx
(verified working with Bearer auth), filtering out non-text (thinking) blocks.
"""
import httpx

from config import ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL, ANTHROPIC_MODEL


class AIError(Exception):
    pass


class AIService:
    def __init__(self) -> None:
        self.base_url = (ANTHROPIC_BASE_URL or "").rstrip("/")
        self.token = ANTHROPIC_AUTH_TOKEN
        self.model = ANTHROPIC_MODEL

    async def complete(self, system: str, user_text: str, max_tokens: int = 1000) -> str:
        if not self.base_url or not self.token:
            raise AIError("AI endpoint not configured")
        url = f"{self.base_url}/v1/messages"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        body = {
            "model": self.model,
            "max_tokens": max_tokens,
            "system": system,
            "messages": [{"role": "user", "content": user_text}],
        }
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                resp = await client.post(url, headers=headers, json=body)
        except httpx.RequestError as exc:
            raise AIError(f"AI request error: {exc}")

        if resp.status_code >= 400:
            raise AIError(f"AI error {resp.status_code}: {resp.text[:200]}")

        try:
            data = resp.json()
        except ValueError:
            raise AIError("AI returned non-JSON")

        parts = [
            block.get("text", "")
            for block in data.get("content", [])
            if block.get("type") == "text"
        ]
        text = "".join(parts).strip()
        if not text:
            raise AIError("AI returned empty content")
        return text


ai = AIService()
