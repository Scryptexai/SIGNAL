"""Transfers + swaps routes (prefix /txns)."""
from typing import Optional

from fastapi import APIRouter, Query

from services.arkham import ArkhamError, arkham, arkham_error_payload

router = APIRouter(prefix="/txns", tags=["transactions"])


def _norm_transfer(t: dict) -> dict:
    f = t.get("fromAddress") or {}
    to = t.get("toAddress") or {}
    return {
        "hash": t.get("transactionHash") or t.get("txid") or t.get("id"),
        "timestamp": t.get("blockTimestamp"),
        "from_address": f.get("address"),
        "from_label": (f.get("arkhamLabel") or {}).get("name"),
        "from_entity": (f.get("arkhamEntity") or {}).get("name"),
        "to_address": to.get("address"),
        "to_label": (to.get("arkhamLabel") or {}).get("name"),
        "to_entity": (to.get("arkhamEntity") or {}).get("name"),
        "token_symbol": t.get("tokenSymbol") or t.get("tokenName"),
        "usd_value": t.get("historicalUSD"),
        "chain": t.get("chain") or f.get("chain"),
    }


def _norm_swap(s: dict) -> dict:
    venue = s.get("contractAddress") or {}
    sender = s.get("sender") or {}
    entity = (venue.get("arkhamEntity") or {}).get("name") or (
        sender.get("arkhamEntity") or {}
    ).get("name")
    return {
        "hash": s.get("transactionHash") or s.get("id"),
        "timestamp": s.get("blockTimestamp"),
        "from_token": s.get("token0Symbol"),
        "to_token": s.get("token1Symbol"),
        "usd_value": s.get("historicalUSD"),
        "entity": entity,
        "chain": s.get("chain"),
    }


@router.get("/transfers")
async def transfers(
    entity: str = Query(..., description="Entity slug or address, e.g. binance"),
    time_last: str = "24h",
    usd_min: int = 1_000_000,
    limit: int = 20,
):
    params = {"base": entity, "timeLast": time_last, "usdGte": usd_min, "limit": limit}
    try:
        data = await arkham.get_transfers(params)
    except ArkhamError as exc:
        return arkham_error_payload(exc)
    rows = [_norm_transfer(t) for t in (data.get("transfers") or [])]
    return {"transfers": rows, "count": data.get("count", len(rows))}


@router.get("/swaps")
async def swaps(
    entity: str = Query(..., description="Trading entity slug, e.g. wintermute"),
    time_last: str = "24h",
    usd_min: int = 100_000,
    limit: int = 10,
):
    params = {"base": entity, "usdGte": usd_min, "timeLast": time_last, "limit": limit}
    try:
        data = await arkham.get_swaps(params)
    except ArkhamError as exc:
        return arkham_error_payload(exc)
    rows = [_norm_swap(s) for s in (data.get("swaps") or [])]
    return {"swaps": rows, "count": data.get("count", len(rows))}


@router.get("/large")
async def large(chain: Optional[str] = None):
    """Whale-alert feed: transfers > $500k in the last 24h (no entity filter)."""
    params = {"usdGte": 500_000, "timeLast": "24h", "limit": 20}
    if chain:
        params["chain"] = chain
    try:
        data = await arkham.get_transfers(params)
    except ArkhamError as exc:
        return arkham_error_payload(exc)
    rows = [_norm_transfer(t) for t in (data.get("transfers") or [])]
    return {"transfers": rows, "count": data.get("count", len(rows))}
