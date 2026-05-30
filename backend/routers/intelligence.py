"""Entity + address intelligence routes."""
from fastapi import APIRouter

from config import (
    CHAINS,
    ENTITY_CATEGORY_LABELS,
    ENTITY_SLUGS,
    TIME_WINDOWS,
    TOKEN_SLUGS,
)
from models.schemas import EntityCatalog
from services.arkham import arkham

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


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


@router.get("/entity/{slug}")
async def entity(slug: str):
    return await arkham.get_entity(slug)


@router.get("/entity/{slug}/balances")
async def entity_balances(slug: str):
    return await arkham.get_entity_balances(slug)


@router.get("/entity/{slug}/counterparties")
async def entity_counterparties(slug: str, timeLast: str = "30d"):
    return await arkham.get_counterparties(slug, timeLast)


@router.get("/address/{address}")
async def address(address: str):
    return await arkham.get_address(address)


@router.get("/address/{address}/balances")
async def address_balances(address: str):
    return await arkham.get_address_balances(address)


def _looks_like_address(q: str) -> bool:
    q = q.strip()
    if q.startswith("0x") and len(q) >= 40:
        return True
    if q.startswith(("bc1", "1", "3")) and len(q) >= 26:
        return True
    return len(q) >= 32


@router.get("/search")
async def smart_search(query: str):
    """Resolve a free-text query to an entity or an address.

    The upstream `/search` endpoint is restricted for this API key, so we
    resolve locally: address-looking input -> address intel, otherwise we try
    the value as an entity slug.
    """
    q = query.strip()
    if _looks_like_address(q):
        return {"type": "address", "query": q, "result": await arkham.get_address(q)}
    return {"type": "entity", "query": q, "result": await arkham.get_entity(q.lower())}
