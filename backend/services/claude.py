"""Claude (Anthropic) wrapper using the Emergent Universal LLM key."""
import uuid

from fastapi import HTTPException
from emergentintegrations.llm.chat import LlmChat, UserMessage

from config import CLAUDE_MODEL, EMERGENT_LLM_KEY


class ClaudeClient:
    def __init__(self) -> None:
        self.api_key = EMERGENT_LLM_KEY
        self.model = CLAUDE_MODEL

    async def generate(self, system_message: str, user_text: str) -> str:
        if not self.api_key:
            raise HTTPException(status_code=503, detail="LLM key not configured")
        chat = LlmChat(
            api_key=self.api_key,
            session_id=str(uuid.uuid4()),
            system_message=system_message,
        ).with_model("anthropic", self.model)
        try:
            return await chat.send_message(UserMessage(text=user_text))
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=f"Claude generation failed: {exc}")


claude = ClaudeClient()
