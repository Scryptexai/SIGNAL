"""Central configuration and verified Arkham slugs for the SIGNAL backend."""
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")

# --- Arkham Intelligence API ---
ARKHAM_API_KEY = os.environ.get("ARKHAM_API_KEY", "")
ARKHAM_BASE_URL = os.environ.get("ARKHAM_BASE_URL", "https://api.arkm.com")
ARKHAM_HEADERS = {"API-Key": ARKHAM_API_KEY}

# --- AI: MiMo (Anthropic-compatible Messages API) ---
# Used for the dashboard analysis panel AND the X/Twitter content engine.
ANTHROPIC_BASE_URL = os.environ.get("ANTHROPIC_BASE_URL", "")
ANTHROPIC_AUTH_TOKEN = os.environ.get("ANTHROPIC_AUTH_TOKEN", "")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "mimo-v2.5-pro")

# Verified working entity slugs (probed live against api.arkm.com)
ENTITY_SLUGS = {
    "cex": ["binance", "coinbase", "kraken", "okx", "bybit"],
    "vc": ["a16z", "paradigm", "coinbase-ventures", "multicoin-capital"],
    "market_maker": ["wintermute", "jump-trading"],
    "government": ["us-government"],
}

ENTITY_CATEGORY_LABELS = {
    "cex": "Centralized Exchanges",
    "vc": "Venture Capital",
    "market_maker": "Market Makers",
    "government": "Governments",
}

# Verified working token slugs
TOKEN_SLUGS = ["bitcoin", "ethereum", "pepe", "arbitrum", "tether", "solana"]

# Common chains used in transfer filters
CHAINS = [
    "ethereum",
    "bitcoin",
    "tron",
    "bsc",
    "polygon",
    "arbitrum_one",
    "base",
    "solana",
]

# Valid timeLast windows accepted by Arkham
TIME_WINDOWS = ["1h", "6h", "24h", "7d", "30d"]
