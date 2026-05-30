"""Token holders + flow + trending routes."""
from fastapi import APIRouter

from config import TOKEN_SLUGS
from services.arkham import arkham

router = APIRouter(prefix="/tokens", tags=["tokens"])


@router.get("/list")
async def token_list():
    return {"tokens": TOKEN_SLUGS}


@router.get("/trending")
async def trending():
    return await arkham.get_token_trending()


@router.get("/holders/{token_slug}")
async def holders(token_slug: str):
    return await arkham.get_token_holders(token_slug)


@router.get("/flow/{token_slug}")
async def flow(token_slug: str, timeLast: str = "24h"):
    return await arkham.get_token_flow(token_slug, timeLast)
