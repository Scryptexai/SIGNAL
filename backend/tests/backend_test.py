"""SIGNAL backend regression tests — ITERATION 2 routes.

Covers /api/, /api/status, /api/intel/* (catalog/entity/address/search),
/api/txns/* (transfers/swaps/large), /api/tokens/* (trending/holders/flow),
/api/content/generate (MiMo, mimo-v2.5-pro).
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
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
        assert d["arkham"] == "online", f"arkham not online: {d}"
        assert d["ai"] is True
        assert d["model"] == "mimo-v2.5-pro"


# ---- Intelligence (/intel) --------------------------------------------------
class TestIntelligence:
    def test_catalog(self, s):
        r = s.get(f"{API}/intel/catalog", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        for k in ("categories", "entities", "tokens", "chains", "time_windows"):
            assert k in d, f"missing {k}"
        assert isinstance(d["entities"], dict) and d["entities"]

    def test_entity_binance(self, s):
        r = s.get(f"{API}/intel/entity/binance", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert "entity" in d and "balances" in d and "counterparties" in d
        name = (d["entity"] or {}).get("name", "")
        assert "Binance" in name

    def test_entity_not_found_graceful(self, s):
        r = s.get(f"{API}/intel/entity/this-does-not-exist-xyz", timeout=TIMEOUT)
        assert r.status_code == 200, f"expected graceful 200, got {r.status_code}"
        d = r.json()
        assert d.get("error") == "not found"
        assert "detail" in d

    def test_address_vitalik(self, s):
        r = s.get(f"{API}/intel/address/{VITALIK}", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert "profile" in d and "balances" in d
        assert "vitalik" in str(d).lower()

    def test_search_entity(self, s):
        r = s.get(f"{API}/intel/search", params={"query": "coin"}, timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert "query" in d and "results" in d
        names = [row.get("name", "").lower() for row in d["results"]]
        joined = " ".join(names)
        assert "coinbase" in joined, f"expected coinbase match in {names}"

    def test_search_address(self, s):
        r = s.get(f"{API}/intel/search", params={"query": VITALIK}, timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d["results"], "no results for address search"
        assert d["results"][0]["type"] == "address"


# ---- Transactions (/txns) ---------------------------------------------------
class TestTransactions:
    def test_transfers(self, s):
        r = s.get(
            f"{API}/txns/transfers",
            params={"entity": "binance", "time_last": "24h",
                    "usd_min": 1000000, "limit": 10},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200
        d = r.json()
        # graceful error body is acceptable; otherwise must have transfers list
        if "error" in d:
            pytest.skip(f"upstream Arkham unavailable: {d}")
        assert "transfers" in d and "count" in d
        assert isinstance(d["transfers"], list)
        if d["transfers"]:
            row = d["transfers"][0]
            for k in ("hash", "timestamp", "from_entity", "from_label",
                      "to_entity", "to_label", "token_symbol", "usd_value", "chain"):
                assert k in row, f"missing field {k} in transfer row"

    def test_swaps(self, s):
        r = s.get(
            f"{API}/txns/swaps",
            params={"entity": "wintermute", "time_last": "24h",
                    "usd_min": 10000, "limit": 10},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200
        d = r.json()
        if "error" in d:
            pytest.skip(f"upstream Arkham unavailable: {d}")
        assert "swaps" in d and "count" in d
        assert isinstance(d["swaps"], list)
        if d["swaps"]:
            row = d["swaps"][0]
            for k in ("hash", "timestamp", "from_token", "to_token",
                      "usd_value", "entity", "chain"):
                assert k in row, f"missing field {k} in swap row"

    def test_large_whales(self, s):
        r = s.get(f"{API}/txns/large", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        if "error" in d:
            pytest.skip(f"upstream Arkham unavailable: {d}")
        assert "transfers" in d
        assert isinstance(d["transfers"], list)


# ---- Tokens ----------------------------------------------------------------
class TestTokens:
    def test_trending(self, s):
        r = s.get(f"{API}/tokens/trending", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert "trending" in d
        assert isinstance(d["trending"], list) and len(d["trending"]) > 0
        row = d["trending"][0]
        for k in ("name", "slug", "symbol", "price_change", "volume",
                  "unusual_activity_flag"):
            assert k in row, f"missing {k}"

    def test_holders(self, s):
        r = s.get(f"{API}/tokens/holders/ethereum", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        if "error" in d:
            pytest.skip(f"upstream Arkham unavailable: {d}")
        assert "token" in d and "holders" in d
        assert isinstance(d["holders"], list)
        assert len(d["holders"]) <= 20
        if d["holders"]:
            row = d["holders"][0]
            for k in ("entity_name", "entity_type", "balance", "percentage",
                      "wallet_address", "usd", "chain"):
                assert k in row, f"missing {k}"
        tok = d["token"]
        for k in ("name", "symbol", "price", "price24hAgo"):
            assert k in tok

    def test_flow_graceful(self, s):
        """upstream flaky -> graceful error body OR full payload."""
        r = s.get(f"{API}/tokens/flow/ethereum",
                  params={"time_last": "24h"}, timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        if "error" in d:
            return  # graceful path is acceptable
        for k in ("time_last", "net_flow", "inflows", "outflows"):
            assert k in d, f"missing {k}"


# ---- Content (MiMo) --------------------------------------------------------
class TestContent:
    def _gen(self, s, data_type, raw_data, tone, output_type):
        body = {
            "data_type": data_type,
            "raw_data": raw_data,
            "tone": tone,
            "output_type": output_type,
        }
        return s.post(f"{API}/content/generate", json=body, timeout=120)

    def test_whale_transfer_alpha_thread(self, s):
        r = self._gen(
            s,
            "whale_transfer",
            {
                "from_entity": "Binance",
                "from_label": "Hot Wallet",
                "to_entity": "Unknown",
                "to_label": "Fresh Wallet",
                "usd_value": 2500000,
                "token_symbol": "ETH",
                "chain": "ethereum",
                "hash": "0xtest123",
                "timestamp": "2026-05-30 10:00:00",
            },
            "alpha_caller",
            "thread",
        )
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["tone"] == "alpha_caller"
        assert d["output_type"] == "thread"
        assert isinstance(d["content"], str) and len(d["content"]) > 20
        assert d["char_count"] == len(d["content"])
        assert d["char_count"] > 0
        assert d["tweet_count"] >= 1

    def test_entity_profile_analyst_tweet(self, s):
        r = self._gen(
            s,
            "entity_profile",
            {"entity": {"name": "Binance", "type": "cex"},
             "balances": {"total_usd": 140_000_000_000, "top_tokens": ["USDT", "BTC"]},
             "counterparties": ["Coinbase", "Wintermute"]},
            "analyst",
            "tweet",
        )
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["tone"] == "analyst"
        assert d["output_type"] == "tweet"
        assert d["tweet_count"] == 1
        assert d["char_count"] > 0

    def test_token_flow_degen_alert(self, s):
        r = self._gen(
            s,
            "token_flow",
            {"token_name": "Ethereum", "token_slug": "ethereum",
             "time_last": "24h", "net_flow": -50000000,
             "top_inflows": ["Binance"], "top_outflows": ["Coinbase"]},
            "degen",
            "alert",
        )
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["tone"] == "degen"
        assert d["output_type"] == "alert"
        assert d["tweet_count"] == 1
        assert d["char_count"] > 0
