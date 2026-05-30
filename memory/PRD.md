# SIGNAL — On-Chain Intelligence Dashboard (PRD)

## Original Problem Statement
Build a Python backend for a crypto on-chain intelligence dashboard called **SIGNAL**.
- Backend: Python + FastAPI
- Data source: Arkham Intelligence API (https://api.arkm.com), header `API-Key`
- AI: Claude for analysis & content generation
- Frontend: React dashboard (spec wanted a single HTML file)

### User choices (gathered up front)
- Arkham API key: provided by user, stored in `backend/.env`.
- Claude: **Emergent Universal LLM key** (model `claude-sonnet-4-6`).
- **Adapt** structure to the Emergent runtime so the live preview works.
- **Build everything end-to-end** in one go (PROMPT 1 + PROMPT 2 API routes).

## Architecture (as adapted to Emergent)
- Backend entry: `/app/backend/server.py` (`server:app`, uvicorn :8001). All routes under `/api`.
  - `config.py` — env + verified ENTITY_SLUGS / TOKEN_SLUGS / CHAINS / TIME_WINDOWS.
  - `services/arkham.py` — `ArkhamClient` (async httpx, header API-Key, retry/backoff on transient 5xx/timeouts, timeout=35 for balances). Slug is interpolated into the path (spec's `arkham-signal` was a placeholder).
  - `services/claude.py` — `ClaudeClient` via `emergentintegrations` (anthropic / claude-sonnet-4-6).
  - `routers/intelligence.py` — catalog, entity, entity balances, counterparties, address, address balances, smart `/search` (resolved locally: address vs entity, since upstream `/search` is restricted for this key).
  - `routers/transactions.py` — transfers, swaps.
  - `routers/tokens.py` — list, trending, holders, flow.
  - `routers/content.py` — `POST /content/generate` (modes: analysis | social | alert).
  - `models/schemas.py` — Pydantic models.
- Frontend: `/app/frontend` CRA React app (:3000), Tailwind, Phosphor icons, Outfit + IBM Plex Mono.
  - Dark "Bloomberg-terminal" theme. Views: IntelligenceView, TransactionsView, TokensView; components: Sidebar, CommandBar, StatusBadge, Panel, AIPanel.

## Core Requirements (static)
- Lookup entity/address intelligence + balances + counterparties.
- Large transfers & DEX swaps feeds (filter by entity/chain/time/usd).
- Token holders (by entity), top flow (net in/out), trending tokens.
- Claude-generated analysis / social / alert content grounded in the displayed data.
- Live Arkham + AI status indicator.

## What's been implemented — 2026-05-30
- Full backend (all 11 Arkham wrapper methods + Claude wrapper + 4 routers + status/startup test). VERIFIED.
- Full React dashboard, 3 tabs, AI panel, global search, status badge. VERIFIED.
- Reliability: retry/backoff in ArkhamClient → swaps 10/10, flow 5/5 (was ~10–20% upstream-flaky).
- Testing: backend 18/18 pytest pass; frontend 100% of critical flows (iteration_1.json).

## Known upstream notes
- Arkham `/token/top_flow` and `/swaps` are intermittently 500 upstream → mitigated by retry + graceful UI messaging.
- Arkham `/search` returns 405 for this key → backend resolves search locally (entity vs address).

## Backlog / Next tasks
- P1: Cache `/api/status` for ~10s to avoid pinging Arkham on every poll.
- P1: Persist/share an AI brief (copy link / export) — shareability.
- P2: Recharts sparkline for trending tokens & portfolio history.
- P2: Migrate `@app.on_event('startup')` to lifespan handler.
- P2: Address-level counterparties & multi-entity comparison view.

## Personas
- On-chain analyst / trader monitoring whale & exchange flows.
- Crypto journalist / "intel desk" needing fast, grounded narrative summaries.
