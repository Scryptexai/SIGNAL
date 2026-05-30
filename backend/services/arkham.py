"""Async wrapper around the Arkham Intelligence REST API (https://api.arkm.com).

All requests are GET with the `API-Key` header. Each method returns parsed JSON
or raises a FastAPI HTTPException with a clear, debuggable message.

NOTE: The original spec listed paths like `/intelligence/entity/arkham-signal`.
Live probing confirmed the trailing path segment is actually the *entity slug*,
so we interpolate `{slug}` into the path to get real results.
"""
import asyncio
from typing import Optional

import httpx
from fastapi import HTTPException

from config import ARKHAM_BASE_URL, ARKHAM_HEADERS


class ArkhamClient:
    def __init__(self) -> None:
        self.base_url = ARKHAM_BASE_URL.rstrip("/")
        self.headers = ARKHAM_HEADERS

    async def _get(
        self,
        path: str,
        params: Optional[dict] = None,
        timeout: int = 20,
        retries: int = 2,
    ):
        """GET with a short retry/backoff for transient upstream failures.

        Arkham occasionally returns 5xx / times out on heavy endpoints
        (notably /swaps and /token/top_flow). Deterministic 4xx responses
        (e.g. "entity not found") are surfaced immediately without retrying.
        """
        url = f"{self.base_url}{path}"
        print(f"[Arkham] GET {url} params={params}")
        last_detail = f"Arkham API failed: {path}"

        for attempt in range(retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.get(url, headers=self.headers, params=params)
            except httpx.TimeoutException:
                last_detail = f"Arkham API timed out: {path}"
            except httpx.RequestError as exc:
                last_detail = f"Arkham API connection error: {exc}"
            else:
                if resp.status_code < 400:
                    try:
                        return resp.json()
                    except ValueError:
                        raise HTTPException(
                            status_code=502,
                            detail=f"Arkham API returned non-JSON for {path}",
                        )
                message = self._extract_message(resp)
                detail = f"Arkham API error {resp.status_code} for {path}: {message}"
                # 4xx (except 429 rate-limit) are deterministic -> do not retry
                if resp.status_code < 500 and resp.status_code != 429:
                    raise HTTPException(status_code=502, detail=detail)
                last_detail = detail

            if attempt < retries:
                await asyncio.sleep(0.6 * (attempt + 1))
                print(f"[Arkham] transient failure, retry {attempt + 1}/{retries} for {path}")

        raise HTTPException(status_code=502, detail=last_detail)

    @staticmethod
    def _extract_message(resp) -> str:
        try:
            data = resp.json()
            if isinstance(data, dict):
                return data.get("message") or data.get("error") or str(data)[:200]
            return str(data)[:200]
        except ValueError:
            return (resp.text or "unknown error")[:200]

    # 1. Entity intelligence profile
    async def get_entity(self, slug: str):
        return await self._get(f"/intelligence/entity/{slug}")

    # 2. Address intelligence profile
    async def get_address(self, address: str):
        return await self._get(f"/intelligence/address/{address}")

    # 3. Entity balances / portfolio
    async def get_entity_balances(self, slug: str):
        return await self._get(f"/balances/entity/{slug}", timeout=35)

    # 4. Address balances / portfolio
    async def get_address_balances(self, address: str):
        return await self._get(f"/balances/address/{address}", timeout=35)

    # 5. Large transfers
    async def get_transfers(self, params: dict):
        return await self._get("/transfers", params=params)

    # 6. DEX swaps
    async def get_swaps(self, params: dict):
        return await self._get("/swaps", params=params)

    # 7. Token holders (grouped by entity)
    async def get_token_holders(self, token_slug: str):
        return await self._get(
            f"/token/holders/{token_slug}", params={"groupByEntity": "true"}
        )

    # 8. Top token flow
    async def get_token_flow(self, token_slug: str, time_last: str):
        return await self._get(
            f"/token/top_flow/{token_slug}", params={"timeLast": time_last}
        )

    # 9. Trending tokens
    async def get_token_trending(self):
        return await self._get("/token/trending")

    # 10. Entity counterparties
    async def get_counterparties(self, slug: str, time_last: str):
        return await self._get(
            f"/counterparties/entity/{slug}",
            params={"timeLast": time_last, "limit": 10},
        )

    # 11. Search (upstream restricted for this key; kept per spec)
    async def search(self, query: str):
        return await self._get("/search", params={"query": query, "limit": 10})


arkham = ArkhamClient()
