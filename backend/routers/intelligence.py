"""Entity + address intelligence routes (prefix /intel)."""
from fastapi import APIRouter

from config import (
    CHAINS,
    ENTITY_CATEGORY_LABELS,
    ENTITY_SLUGS,
    TIME_WINDOWS,
    TOKEN_SLUGS,
)
from models.schemas import EntityCatalog
from services.arkham import ArkhamError, arkham, arkham_error_payload

router = APIRouter(prefix="/intel", tags=["intelligence"])

ALL_SLUGS = [s for group in ENTITY_SLUGS.values() for s in group]


@router.get("/catalog", response_model=EntityCatalog)
async def catalog():
    """Curated, verified slugs used to populate the dashboard navigation."""
    return EntityCatalog(
        categories=ENTITY_CATEGORY_LABELS,
        entities=ENTITY_SLUGS,
        tokens=TOKEN_SLUGS,
        chains=CHAINS,
        time_windows=TIME_WINDOWS,
    )


async def _safe(coro):
    try:
        return await coro
    except ArkhamError:
        return None


@router.get("/entity/{slug}")
async def entity(slug: str):
    """Combined entity intel: { entity, balances, counterparties }."""
    try:
        ent = await arkham.get_entity(slug)
    except ArkhamError as exc:
        return arkham_error_payload(exc)
    balances = await _safe(arkham.get_entity_balances(slug))
    counterparties = await _safe(arkham.get_counterparties(slug, "7d"))
    return {"entity": ent, "balances": balances, "counterparties": counterparties}


@router.get("/address/{address}")
async def address(address: str):
    """Combined address intel: { profile, balances }."""
    try:
        profile = await arkham.get_address(address)
    except ArkhamError as exc:
        return arkham_error_payload(exc)
    balances = await _safe(arkham.get_address_balances(address))
    return {"profile": profile, "balances": balances}


def _is_address(q: str) -> bool:
    if q.startswith("0x") and len(q) >= 40:
        return True
    if q.startswith(("bc1", "1", "3")) and len(q) >= 26:
        return True
    return len(q) >= 32


@router.get("/search")
async def search(query: str):
    """Resolve a query to entities/addresses.

    Upstream /search is restricted for this key, so we resolve locally and
    return a normalized list: [{ name, type, address, entity_label }].
    """
    q = query.strip()
    results = []

    if _is_address(q):
        try:
            prof = await arkham.get_address(q)
            ent = (prof.get("arkhamEntity") or {})
            lab = (prof.get("arkhamLabel") or {})
            results.append({
                "name": ent.get("name") or lab.get("name") or q,
                "type": "address",
                "address": q,
                "entity_label": lab.get("name") or ent.get("name"),
            })
        except ArkhamError:
            pass
        return {"query": q, "results": results}

    ql = q.lower()
    # exact / direct entity lookup first
    try:
        ent = await arkham.get_entity(ql)
        results.append({
            "name": ent.get("name") or ql,
            "type": ent.get("type") or "entity",
            "address": "",
            "entity_label": ql,
        })
    except ArkhamError:
        pass
    # fuzzy matches from the curated catalog
    for slug in ALL_SLUGS:
        if ql in slug and slug != ql:
            results.append({
                "name": slug,
                "type": "entity",
                "address": "",
                "entity_label": slug,
            })

    return {"query": q, "results": results}
