# Test Credentials — SIGNAL

This application has **NO authentication / login**. There are no user accounts, no
admin seeding, and no auth tokens.

## API keys (server-side only, in /app/backend/.env)
- `ARKHAM_API_KEY` — Arkham Intelligence API key (provided by user). Used via header `API-Key`.
- `EMERGENT_LLM_KEY` — Emergent Universal LLM key for Claude (`claude-sonnet-4-6`).

## Handy test references
- Default entity loaded in UI: `binance`
- Swaps work best with a trading entity base: `wintermute`
- Token flow works most reliably for: `ethereum` (24h / 7d)
- Sample address (resolves to Vitalik Buterin): `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`

No credentials are required for the testing agent to exercise any flow.
