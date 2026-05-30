"""SIGNAL — FastAPI entry point (served by supervisor as `server:app`).

Adapted from the spec's `main.py` to the Emergent runtime: the backend runs on
port 8001 with every route under the `/api` prefix; the React dashboard is served
separately on port 3000.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL, ANTHROPIC_MODEL
from models.schemas import StatusResponse
from routers import content, intelligence, tokens, transactions
from services.ai import AIError, ai
from services.arkham import ArkhamError, arkham

app = FastAPI(title="SIGNAL — On-Chain Intelligence", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(intelligence.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(tokens.router, prefix="/api")
app.include_router(content.router, prefix="/api")

_AI_READY = bool(ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN)


@app.get("/api/")
async def root():
    return {"service": "SIGNAL", "status": "ok"}


@app.get("/api/status", response_model=StatusResponse)
async def status():
    """Live health check used by the dashboard's connection indicator."""
    try:
        await arkham.get_token_trending()
        return StatusResponse(arkham="online", ai=_AI_READY, model=ANTHROPIC_MODEL)
    except ArkhamError as exc:
        return StatusResponse(
            arkham="offline", ai=_AI_READY, model=ANTHROPIC_MODEL, detail=exc.message
        )


@app.on_event("startup")
async def startup_event():
    print("=" * 56)
    print("SIGNAL backend starting — testing integrations...")
    try:
        trending = await arkham.get_token_trending()
        count = len(trending) if isinstance(trending, list) else "?"
        print(f"[OK]  Arkham API reachable — {count} trending tokens")
    except ArkhamError as exc:
        print(f"[WARN] Arkham API test failed: {exc.message}")
    try:
        reply = await ai.complete("You are a connectivity probe.", "Reply with: OK", max_tokens=200)
        print(f"[OK]  AI ({ANTHROPIC_MODEL}) reachable — replied: {reply[:40]!r}")
    except AIError as exc:
        print(f"[WARN] AI test failed: {exc}")
    print("=" * 56)
