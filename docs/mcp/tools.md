# MCP tools

**15 tools** — canonical list: [README.md](README.md#tools-15). Same list in [SKILL.md](../../skills/trusted-agent-settlement/SKILL.md).

All tools return JSON in `content[0].text`. Errors set `isError: true`. See [roles.md](roles.md) for payer vs payee.

## get_agent_readiness

Role-aware doctor: `payer` | `payee` | `demo` | `mock`. Returns `allowedTools`, `checks`, `nextStep`.

## simulate_trusted_settlement

Dry-run preflight + fee quote + `nextAction`. Args: settlement fields + `mode` + `mock`.

## fund_deal (payer)

Fund escrow only. Returns `{ dealId, fundTx, nextAction: "deliver", terms }`. Supports `autoOnboardRecipients`.

## submit_delivery (payee)

Args: `dealId`, `workDescription` **or** `resultHash`, `mock`.

## attest_release (payer)

Args: `dealId`, `workDescription` **or** `resultHash`, `mock`.

## complete_claim_for_deal (payee)

Args: `dealId`, optional `amount`/`agentB` (defaults from on-chain `terms`), `mock`.

## get_settlement_status

Returns `SettlementStatus` + `terms` (`payer`, `payee`, `token`, `amount`, `workHash`, `onChainResultHash`).

## register_recipients (payer)

Args: `recipients[]`, `mock`.

## reclaim_trusted_settlement (payer)

Args: `dealId`, `mock`.

## execute_trusted_settlement (demo shortcut)

Both keys in one process: full fund → deliver → attest → claim. Args include `skipAttest`, `autoOnboardRecipients`.

## fund_deals_batch (payer)

Args: `jobs[]`, `batchMode` (`saliFast` | `hybridWork`), `mock`, `autoOnboardRecipients`. Returns `manifest` for payee handoff.

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
