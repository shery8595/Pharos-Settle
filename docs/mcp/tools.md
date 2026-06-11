# MCP tools

**17 tools** — canonical list: [README.md](README.md#tools-17). Same list in [SKILL.md](../../skills/trusted-agent-settlement/SKILL.md).

All tools return JSON in `content[0].text`. Errors set `isError: true`. See [roles.md](roles.md) for payer vs payee vs arbiter.

## get_agent_readiness

Role-aware doctor: `payer` | `payee` | `arbiter` | `demo` | `mock`. Returns `allowedTools`, `checks`, `nextStep`.

## simulate_trusted_settlement

Dry-run preflight + fee quote + `nextAction`. Args: settlement fields + optional `arbiter` + `mode` + `mock`.

## fund_deal (payer)

Fund escrow only. Returns `{ dealId, fundTx, nextAction: "deliver", terms }`. Supports `autoOnboardRecipients`, optional `arbiter`.

## submit_delivery (payee)

Args: `dealId`, `workDescription` **or** `resultHash`, `mock`.

## attest_release (payer)

Args: `dealId`, `workDescription` **or** `resultHash`, `mock`.

## complete_claim_for_deal (payee)

Args: `dealId`, optional `amount`/`agentB` (defaults from on-chain `terms`), `mock`.

## get_settlement_status

Returns `SettlementStatus` + `terms` (`rejectEligible`, `disputeOpen`, `resolveEligible`, `arbiter`, `rejectionReasonHash`).

## register_recipients (payer)

Args: `recipients[]`, `mock`.

## reclaim_trusted_settlement (payer)

Args: `dealId`, `mock`. Use when payee never delivered and TTL expired.

## reject_delivery (payer)

Args: `dealId`, **`reason`** or **`reasonHash`** (required), `mock`.

- **Cooperative** (no arbiter on deal): immediate full refund with auditable hash.
- **Arbiter mode**: opens `Disputed` — funds frozen until `resolve_dispute`.

Not neutral quality arbitration in cooperative mode — see [threat-model.md](../security/threat-model.md).

## resolve_dispute (arbiter)

Args: `dealId`, `outcome` (`release` | `refund` | `split`), `payeeBps` (required for split), `mock`. Requires `ARBITER_PRIVATE_KEY`.

## execute_trusted_settlement (demo shortcut)

Both keys in one process: full fund → deliver → attest → claim. Args include `skipAttest`, `autoOnboardRecipients`, optional `arbiter`.

## fund_deals_batch (payer)

Args: `jobs[]` (optional `arbiter` per job), `batchMode` (`saliFast` | `hybridWork`), `mock`, `autoOnboardRecipients`. Returns `manifest` for payee handoff.

## submit_deliveries_batch (payee, hybridWork)

Args: `deliveries[]` (`dealId`, `workDescription` or `resultHash`), `mock`.

## attest_releases_batch (payer, hybridWork)

Args: `attestations[]` (same shape as deliveries), `mock`.

## complete_claims_batch (payee)

Args: `claims[]` (`dealId`, `fundTx`, `amount`, `agentB`), `mock`.

## execute_batch_settlement (demo shortcut)

Both keys: full batch in one process. Args: `jobs[]`, `batchMode`, `mock`, `autoOnboardRecipients`.

See [batch-sali.md](batch-sali.md).

## Related source

- `mcp/tools.ts`
- `test/mcp/tools.vitest.ts`
- `test/mcp/two-agent-flow.vitest.ts`
