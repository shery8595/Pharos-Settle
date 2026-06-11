# MCP Tools (Optional Path)

Use MCP only when the user **explicitly** wants IDE-integrated tools (`fund_deal`, `simulate_trusted_settlement`, etc.) or split payer/payee agents.

**Default path is cast/forge** — see `references/settlement.md` Method A.

---

## When to use MCP

- Cursor / Claude Desktop with `pharos-settle` MCP connected
- Split identity: payer MCP in one session, payee MCP in another
- `mock: true` dry-runs without keys
- `nextAction` polling without manual `cast call`

---

## MCP setup (only if user asks)

1. `npm run setup` in repo clone
2. Optional: **project** MCP (repo as workspace root) vs **global** MCP (`npm run mcp:install-global`)
3. Optional: **demo** (`mock: true`) vs **live** (keys in `.env`)
4. Reload MCP in IDE Settings

Full guide: `docs/mcp/modes.md` and `AGENTS.md` § MCP (optional).

Do **not** block cast-first workflows on MCP setup questions.

---

## 17 MCP Tools

| Category | Tools |
|----------|-------|
| Shared | `get_agent_readiness`, `simulate_trusted_settlement`, `get_settlement_status` |
| Payer | `register_recipients`, `fund_deal`, `attest_release`, `reclaim_trusted_settlement`, `reject_delivery`, `fund_deals_batch`, `attest_releases_batch` |
| Payee | `submit_delivery`, `complete_claim_for_deal`, `submit_deliveries_batch`, `complete_claims_batch` |
| Arbiter | `resolve_dispute` |
| Demo | `execute_trusted_settlement`, `execute_batch_settlement` |

Details: `docs/mcp/tools.md`

---

## Demo vs Live (MCP only)

| Mode | Behavior |
|------|----------|
| `demo` | Pass `mock: true` on tools, or `npm run demo:judge` |
| `live` | `PRIVATE_KEY` + `AGENT_B_PRIVATE_KEY` in `.env`; no `mock: true` |

Read `.pharos-settle/setup-checklist.json` → `runMode` if present.
