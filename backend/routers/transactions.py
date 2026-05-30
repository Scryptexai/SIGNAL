"""Transfers + swaps routes."""
from typing import Optional

from fastapi import APIRouter, Query

from services.arkham import arkham

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/transfers")
async def transfers(
    base: str = Query(..., description="Entity slug, e.g. binance"),
    chain: Optional[str] = None,
    timeLast: str = "24h",
    usdGte: int = 1_000_000,
    limit: int = 20,
):
    params = {"base": base, "timeLast": timeLast, "usdGte": usdGte, "limit": limit}
    if chain:
        params["chain"] = chain
    return await arkham.get_transfers(params)


@router.get("/swaps")
async def swaps(
    base: str = Query(..., description="Entity slug that trades, e.g. wintermute"),
    usdGte: int = 10_000,
    timeLast: str = "24h",
    limit: int = 20,
):
    params = {"base": base, "usdGte": usdGte, "timeLast": timeLast, "limit": limit}
    return await arkham.get_swaps(params)
