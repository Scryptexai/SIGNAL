"""Claude AI content generation routes."""
import json

from fastapi import APIRouter

from config import CLAUDE_MODEL
from models.schemas import ContentRequest, ContentResponse
from services.claude import claude

router = APIRouter(prefix="/content", tags=["content"])

SYSTEM_PROMPTS = {
    "analysis": (
        "You are SIGNAL, an elite on-chain intelligence analyst. You translate raw "
        "blockchain / Arkham Intelligence data into sharp, factual, non-hype analysis. "
        "Be concise and specific and use concrete numbers from the provided data. "
        "Never invent data you were not given. Structure your answer as: one bold "
        "takeaway line, then 3-5 tight bullet insights. No financial advice."
    ),
    "social": (
        "You are SIGNAL, a crypto on-chain intelligence desk writing for X/Twitter. "
        "Write a punchy, credible post grounded ONLY in the provided data. No emoji "
        "spam, no hype, no price predictions. Lead with the most surprising fact and "
        "include the key USD figures. Keep each idea under 280 characters; you may "
        "produce up to 3 short posts in a thread."
    ),
    "alert": (
        "You are SIGNAL's real-time alert engine. Produce a single terse alert line "
        "(under 200 characters) describing the most material on-chain movement in the "
        "data, with the USD figure and the entities involved. Factual, no speculation."
    ),
}


def _trim(data) -> str:
    return json.dumps(data, default=str)[:8000]


@router.post("/generate", response_model=ContentResponse)
async def generate(req: ContentRequest):
    system = SYSTEM_PROMPTS.get(req.mode, SYSTEM_PROMPTS["analysis"])
    parts = [f"Subject: {req.subject}"]
    if req.tone:
        parts.append(f"Desired tone: {req.tone}")
    if req.data is not None:
        parts.append("On-chain data (JSON):\n" + _trim(req.data))
    parts.append("Produce the output now.")
    content = await claude.generate(system, "\n\n".join(parts))
    return ContentResponse(
        mode=req.mode, subject=req.subject, model=CLAUDE_MODEL, content=content
    )
