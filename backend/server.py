"""SIGNAL — FastAPI entry point (served by supervisor as `server:app`).

Adapted from the spec's `main.py` to the Emergent runtime: the backend runs on
port 8001 with every route under the `/api` prefix; the React dashboard is served
separately on port 3000.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import EMERGENT_LLM_KEY
from models.schemas import StatusResponse
from routers import content, intelligence, tokens, transactions
from services.arkham import arkham

app = FastAPI(title="SIGNAL — On-Chain Intelligence", version="1.0.0")

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


@app.get("/api/")
async def root():
    return {"service": "SIGNAL", "status": "ok"}


@app.get("/api/status", response_model=StatusResponse)
async def status():
    """Live health check used by the dashboard's connection indicator."""
    try:
        await arkham.get_token_trending()
        return StatusResponse(arkham="online", claude=bool(EMERGENT_LLM_KEY))
    except Exception as exc:  # noqa: BLE001
        detail = str(getattr(exc, "detail", exc))
        return StatusResponse(arkham="offline", claude=bool(EMERGENT_LLM_KEY), detail=detail)


@app.on_event("startup")
async def startup_event():
    print("=" * 56)
    print("SIGNAL backend starting — testing Arkham API connection...")
    try:
        trending = await arkham.get_token_trending()
        count = len(trending) if isinstance(trending, list) else "?"
        print(f"[OK]  Arkham API reachable — {count} trending tokens")
    except Exception as exc:  # noqa: BLE001
        print(f"[WARN] Arkham API test failed: {getattr(exc, 'detail', exc)}")
    print(f"[INFO] Claude (Emergent LLM) key configured: {bool(EMERGENT_LLM_KEY)}")
    print("=" * 56)
