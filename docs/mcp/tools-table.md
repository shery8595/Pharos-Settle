# MCP tools — all 17

Plug-and-play surface for autonomous agents. Run `npm run mcp` · Full reference: [tools.md](tools.md)

> Generic escrow protects humans; Pharos Settle gives autonomous agents a reusable payment Skill with simulate-first execution, next-action polling, ghost recovery, and MCP/SDK parity.

| # | Tool | Caller | Purpose |
|---|------|--------|---------|
| 1 | `get_agent_readiness` | either | Role + allowed tools before spending gas |
| 2 | `simulate_trusted_settlement` | payer | Preflight, fee quote, `nextAction` |
| 3 | `fund_deal` | payer | Lock escrow, return `dealId` |
| 4 | `submit_delivery` | payee | Bind `resultHash` to deal |
| 5 | `attest_release` | payer | Approve release after delivery |
| 6 | `get_settlement_status` | either | Deal state + `nextAction` |
| 7 | `complete_claim_for_deal` | payee | Claim funds when `nextAction=claim` |
| 8 | `register_recipients` | payer | Onboard payees in AgentRegistry |
| 9 | `reclaim_trusted_settlement` | payer | Refund when payee ghosts |
| 10 | `reject_delivery` | payer | Safety valve for junk delivery |
| 11 | `resolve_dispute` | arbiter | Release / refund / split (optional arbiter deals) |
| 12 | `fund_deals_batch` | payer | Parallel fund N deals (SALI FastPay) |
| 13 | `submit_deliveries_batch` | payee | Parallel deliver (hybridWork batch) |
| 14 | `attest_releases_batch` | payer | Parallel attest (hybridWork batch) |
| 15 | `complete_claims_batch` | payee | Parallel claim from manifest |
| 16 | `execute_trusted_settlement` | demo | Single-process shortcut (both keys) |
| 17 | `execute_batch_settlement` | demo | Batch shortcut (both keys) |

**Verify locally:** `npm run agent:doctor:mock` → `allowedTools` length **17**.

**Batch modes:** `saliFast` (fund+claim) · `hybridWork` (fund+deliver+attest+claim) — [batch-sali.md](batch-sali.md)
