"""Token holders + flow + trending routes (prefix /tokens)."""
from fastapi import APIRouter

from config import TOKEN_SLUGS
from services.arkham import ArkhamError, arkham, arkham_error_payload

router = APIRouter(prefix="/tokens", tags=["tokens"])


@router.get("/list")
async def token_list():
    return {"tokens": TOKEN_SLUGS}


@router.get("/trending")
async def trending():
    try:
        data = await arkham.get_token_trending()
    except ArkhamError as exc:
        return arkham_error_payload(exc)
    out = []
    for t in data if isinstance(data, list) else []:
        out.append({
            "name": t.get("name"),
            "slug": (t.get("identifier") or {}).get("pricingID") or t.get("symbol"),
            "symbol": t.get("symbol"),
            "price_change": t.get("priceChange24h"),
            "volume": t.get("volume"),
            "unusual_activity_flag": bool(t.get("unusualActivity", False)),
        })
    return {"trending": out}


def _norm_holders(data: dict) -> dict:
    token = data.get("token") or {}
    entity_src = data.get("entityTopHolders") or {}
    use_entity = any((lst for lst in entity_src.values()))
    src = entity_src if use_entity else (data.get("addressTopHolders") or {})

    rows = []
    for chain, lst in src.items():
        for h in (lst or []):
            if "entity" in h and h.get("entity"):
                ent = h.get("entity") or {}
                name, etype, wallet = ent.get("name"), ent.get("type"), ent.get("id")
            else:
                a = h.get("address") or {}
                ae = a.get("arkhamEntity") or {}
                al = a.get("arkhamLabel") or {}
                name = ae.get("name") or al.get("name") or a.get("address")
                etype = ae.get("type")
                wallet = a.get("address")
            rows.append({
                "entity_name": name,
                "entity_type": etype,
                "balance": h.get("balance"),
                "percentage": (h.get("pctOfCap") or 0) * 100,
                "wallet_address": wallet,
                "usd": h.get("usd"),
                "chain": chain,
            })
    rows.sort(key=lambda r: (r.get("usd") or 0), reverse=True)
    return {
        "token": {
            "name": token.get("name"),
            "symbol": token.get("symbol"),
            "price": token.get("price"),
            "price24hAgo": token.get("price24hAgo"),
        },
        "holders": rows[:20],
    }


@router.get("/holders/{token_slug}")
async def holders(token_slug: str):
    try:
        data = await arkham.get_token_holders(token_slug)
    except ArkhamError as exc:
        return arkham_error_payload(exc)
    return _norm_holders(data)


def _party(f: dict) -> dict:
    a = f.get("address") or {}
    ae = a.get("arkhamEntity") or {}
    al = a.get("arkhamLabel") or {}
    return {
        "name": ae.get("name") or al.get("name") or a.get("address"),
        "type": ae.get("type"),
        "chain": a.get("chain"),
    }


@router.get("/flow/{token_slug}")
async def flow(token_slug: str, time_last: str = "24h"):
    try:
        data = await arkham.get_token_flow(token_slug, time_last)
    except ArkhamError as exc:
        return arkham_error_payload(exc)

    rows = []
    for f in data if isinstance(data, list) else []:
        p = _party(f)
        rows.append({
            **p,
            "in_usd": f.get("inUSD") or 0,
            "out_usd": f.get("outUSD") or 0,
        })
    inflows = sorted(rows, key=lambda r: r["in_usd"], reverse=True)[:10]
    outflows = sorted(rows, key=lambda r: r["out_usd"], reverse=True)[:10]
    net_flow = sum(r["in_usd"] for r in rows) - sum(r["out_usd"] for r in rows)
    return {
        "time_last": time_last,
        "net_flow": net_flow,
        "inflows": [{"name": r["name"], "chain": r["chain"], "usd": r["in_usd"]} for r in inflows],
        "outflows": [{"name": r["name"], "chain": r["chain"], "usd": r["out_usd"]} for r in outflows],
    }
