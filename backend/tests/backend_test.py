"""SIGNAL backend regression tests.

Covers health, intelligence (catalog/entity/address/search), transactions
(transfers/swaps), tokens (trending/holders/flow) and Claude content gen.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fall back to frontend/.env when pytest is run from repo root.
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as fh:
            for line in fh:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break

API = f"{BASE_URL}/api"
VITALIK = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
TIMEOUT = 60


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---- Health ----------------------------------------------------------------
class TestHealth:
    def test_root(self, s):
        r = s.get(f"{API}/", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d["service"] == "SIGNAL"
        assert d["status"] == "ok"

    def test_status(self, s):
        r = s.get(f"{API}/status", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d["arkham"] == "online"
        assert d["claude"] is True


# ---- Intelligence ----------------------------------------------------------
class TestIntelligence:
    def test_catalog(self, s):
        r = s.get(f"{API}/intelligence/catalog", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        for key in ["categories", "entities", "tokens", "chains", "time_windows"]:
            assert key in d, f"missing {key}"
        ent = d["entities"]
        for cat in ["cex", "vc", "market_maker", "government"]:
            assert cat in ent, f"missing entity category {cat}"
            assert isinstance(ent[cat], list) and len(ent[cat]) > 0

    def test_entity_binance(self, s):
        r = s.get(f"{API}/intelligence/entity/binance", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        # Tolerant - either "name"/"type" directly or nested
        name = d.get("name") or (d.get("entity") or {}).get("name")
        etype = d.get("type") or (d.get("entity") or {}).get("type")
        assert name and "Binance" in name
        assert etype == "cex"

    def test_entity_balances(self, s):
        r = s.get(f"{API}/intelligence/entity/binance/balances", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert "totalBalance" in d
        assert "balances" in d

    def test_entity_counterparties(self, s):
        r = s.get(
            f"{API}/intelligence/entity/binance/counterparties",
            params={"timeLast": "30d"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, dict)
        # at least one chain entry
        if d:
            sample = next(iter(d.values()))
            assert isinstance(sample, list)
            if sample:
                row = sample[0]
                assert "usd" in row or "transactionCount" in row

    def test_address_vitalik(self, s):
        r = s.get(f"{API}/intelligence/address/{VITALIK}", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        blob = str(d).lower()
        assert "vitalik" in blob

    def test_address_balances(self, s):
        r = s.get(f"{API}/intelligence/address/{VITALIK}/balances", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert "totalBalance" in d
        assert "balances" in d

    def test_search_entity(self, s):
        r = s.get(f"{API}/intelligence/search", params={"query": "binance"}, timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d.get("type") == "entity"

    def test_search_address(self, s):
        r = s.get(f"{API}/intelligence/search", params={"query": VITALIK}, timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d.get("type") == "address"


# ---- Transactions ----------------------------------------------------------
class TestTransactions:
    def test_transfers(self, s):
        r = s.get(
            f"{API}/transactions/transfers",
            params={"base": "binance", "timeLast": "24h", "usdGte": 1000000, "limit": 10},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200
        d = r.json()
        assert "transfers" in d
        assert "count" in d
        assert isinstance(d["transfers"], list)

    def test_swaps(self, s):
        r = s.get(
            f"{API}/transactions/swaps",
            params={"base": "wintermute", "usdGte": 10000, "timeLast": "24h", "limit": 10},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200
        d = r.json()
        assert "swaps" in d
        assert "count" in d
        assert isinstance(d["swaps"], list)


# ---- Tokens ----------------------------------------------------------------
class TestTokens:
    def test_trending(self, s):
        r = s.get(f"{API}/tokens/trending", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list)
        assert len(d) > 0

    def test_holders(self, s):
        r = s.get(f"{API}/tokens/holders/ethereum", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert "token" in d
        assert "entityTopHolders" in d or "addressTopHolders" in d

    def test_flow_graceful(self, s):
        """flow upstream is flaky → expect 200 or clean 502, never 500."""
        r = s.get(f"{API}/tokens/flow/ethereum", params={"timeLast": "24h"}, timeout=TIMEOUT)
        assert r.status_code in (200, 502), f"unexpected status {r.status_code}: {r.text[:200]}"
        if r.status_code == 200:
            d = r.json()
            assert isinstance(d, list) or isinstance(d, dict)


# ---- Content (Claude) ------------------------------------------------------
class TestContent:
    def _post(self, s, mode):
        body = {
            "mode": mode,
            "subject": "Binance",
            "data": {"portfolioUSD": 140000000000, "topToken": "USDT"},
        }
        return s.post(f"{API}/content/generate", json=body, timeout=120)

    def test_analysis(self, s):
        r = self._post(s, "analysis")
        assert r.status_code == 200
        d = r.json()
        assert d["mode"] == "analysis"
        assert d["subject"] == "Binance"
        assert d.get("model") == "claude-sonnet-4-6"
        assert isinstance(d.get("content"), str) and len(d["content"]) > 20

    def test_social(self, s):
        r = self._post(s, "social")
        assert r.status_code == 200
        d = r.json()
        assert d["mode"] == "social"
        assert isinstance(d.get("content"), str) and len(d["content"]) > 5

    def test_alert(self, s):
        r = self._post(s, "alert")
        assert r.status_code == 200
        d = r.json()
        assert d["mode"] == "alert"
        assert isinstance(d.get("content"), str) and len(d["content"]) > 5
