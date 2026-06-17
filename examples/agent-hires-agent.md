# Agent hires agent — plain English walkthrough

**Scenario:** A research agent wants a market report. It hires a scraping agent and pays only if work is delivered.

> Generic escrow protects humans; Pharos Settle gives autonomous agents a **reusable payment Skill** with simulate-first execution, next-action polling, ghost recovery, and MCP/SDK parity.

---

## Cast

| Role | Who | What they do |
|------|-----|----------------|
| **Payer agent** | Research agent (Agent A) | Funds escrow, attests good work |
| **Payee agent** | Scraping agent (Agent B) | Delivers a `resultHash` bound to the report |
| **Skill** | Pharos Settle | Preflight, `nextAction`, escrow steps |

---

## Happy path (cooperative)

1. **Research agent** calls `simulate_trusted_settlement` (or SDK `simulateTrustedSettlement`).
   - Checks: both agents registered, token allowed, balance OK.
   - Response: `nextAction: "fund"`, fee quote.

2. **Research agent** calls `fund_deal` → 1 TEST locks in escrow → `dealId` returned.
   - `nextAction` becomes `"deliver"`.

3. **Scraping agent** calls `submit_delivery` with `resultHash` (hash of the report).
   - `nextAction` becomes `"attest"` for payer, `"wait"` for payee.

4. **Research agent** calls `attest_release` after reviewing delivery.
   - `nextAction` becomes `"claim"`.

5. **Scraping agent** calls `complete_claim_for_deal` → funds released minus protocol fee.
   - `nextAction: "done"`.

**Try it:** `npm run demo:judge` (mock, no keys) · `npm run demo:pharos` (live Atlantic).

---

## Ghost paths (why this is not a raw transfer)

| What goes wrong | Who acts | Tool / path |
|-----------------|----------|-------------|
| Payee never delivers | Payer reclaims after TTL | `reclaim_trusted_settlement` · `npm run demo:ghost-payee:simulate` |
| Payer never attests after delivery | Payee claims after dispute window | `complete_claim_for_deal` · `npm run demo:ghost-payer:simulate` |
| Junk delivery (cooperative) | Payer safety valve | `reject_delivery` + `reason` |

Agents poll `get_settlement_status` — one `nextAction` hint per step instead of hardcoded flow logic.

---

## Split identities (production)

In production, payer and payee run **separate MCP servers** with **separate keys**:

- Payer MCP: `fund_deal`, `attest_release`
- Payee MCP: `submit_delivery`, `complete_claim_for_deal`
- Handoff: `dealId` + on-chain `terms`

Batch payroll (100 workers): payer `fund_deals_batch` → manifest → each payee `complete_claims_batch` for its rows.

---

## Further reading

- [JUDGES.md](../JUDGES.md) — judge quickstart
- [SKILL.md](../SKILL.md) — agent Skill module
- [docs/mcp/tools-table.md](../docs/mcp/tools-table.md) — all 17 MCP tools
