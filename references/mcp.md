# MCP Tools (Tier 3 — Orchestration)

MCP is **tier 3** in the [Progressive Execution Resolution](execution.md) ladder.

Use MCP when:
- Cast (tier 1) cannot safely or fully express the workflow
- npm scripts (tier 2) are insufficient
- User requests MCP, **or** `pharos-settle` MCP tools are already connected in the session

**Default path is cast** — see `references/settlement.md` Method A.  
**MCP is never auto-enabled** — agents escalate; humans install and reload.

---

## When to use MCP

- `simulate_trusted_settlement` — full preflight, fee quote, `preflightHash`, `nextAction`
- `get_settlement_status` — smart polling with `nextAction`, `rejectEligible`, etc.
- `mock: true` — dry-runs without keys
- Split identity: payer MCP in one session, payee MCP in another
- Batch manifests: `fund_deals_batch` → `complete_claims_batch`
- One-shot: `execute_trusted_settlement`, `execute_batch_settlement`

---

## Tier 4 — MCP setup (when tier 3 needed but not connected)

1. `npm run setup` in repo clone
2. **Project MCP** (repo as workspace root) **or** **global MCP** (`npm run mcp:install-global`)
3. Optional: **demo** (`mock: true`) vs **live** (keys in `.env`)
4. Reload **pharos-settle** in IDE Settings → MCP

Full guide: `docs/mcp/modes.md` and `AGENTS.md` § MCP (tier 3).

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
| `demo` | Pass `mock: true` on tools, or tier 2: `npm run demo:judge` |
| `live` | `PRIVATE_KEY` + `AGENT_B_PRIVATE_KEY` in `.env`; no `mock: true` |

Read `.pharos-settle/setup-checklist.json` → `runMode` if present.
