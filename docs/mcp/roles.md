# MCP roles and tools

Pharos Settle supports **one key per MCP process**. Use two MCP configs for real payer/payee split, or one config with both keys for demo.

## Roles

| Role | Env keys | Use case |
|------|----------|----------|
| `payer` | `PRIVATE_KEY` only | Fund, onboard, attest, reclaim, batch fund/attest |
| `payee` | `AGENT_B_PRIVATE_KEY` only | Deliver, claim, batch deliver/claim |
| `demo` | Both keys | `execute_trusted_settlement` / `execute_batch_settlement` shortcuts |
| `mock` | Neither | Safe exploration |

Detect role: `get_agent_readiness` or `npm run agent:doctor`.

## Tool matrix

| Tool | Payer | Payee | Demo |
|------|-------|-------|------|
| `get_agent_readiness` | yes | yes | yes |
| `simulate_trusted_settlement` | yes | yes | yes |
| `register_recipients` | yes | no | yes |
| `fund_deal` | yes | no | yes |
| `fund_deals_batch` | yes | no | yes |
| `submit_delivery` | no | yes | yes |
| `submit_deliveries_batch` | no | yes | yes |
| `attest_release` | yes | no | yes |
| `attest_releases_batch` | yes | no | yes |
| `complete_claim_for_deal` | no | yes | yes |
| `complete_claims_batch` | no | yes | yes |
| `get_settlement_status` | yes | yes | yes |
| `reclaim_trusted_settlement` | yes | no | yes |
| `execute_trusted_settlement` | shortcut | shortcut | yes |
| `execute_batch_settlement` | shortcut | shortcut | yes |

See [batch-sali.md](batch-sali.md) for `saliFast` vs `hybridWork` batch modes.

## Cooperative two-MCP flow (single payment)

1. **Payer:** `get_agent_readiness` → `simulate_trusted_settlement` → `fund_deal`
2. **Handoff:** share `dealId` (payee reads `terms` via `get_settlement_status`)
3. **Payee:** `submit_delivery` with exact `workDescription` or matching `resultHash`
4. **Payer:** `attest_release`
5. **Payee:** `complete_claim_for_deal` when `nextAction` is `claim`

## Batch two-MCP flow

### saliFast (SALI throughput)

1. Payer: `fund_deals_batch` (`batchMode: saliFast`)
2. Handoff: `manifest`
3. Payee: `complete_claims_batch`

### hybridWork (full commerce)

1. Payer: `fund_deals_batch` (`batchMode: hybridWork`)
2. Payee: `submit_deliveries_batch`
3. Payer: `attest_releases_batch`
4. Payee: `complete_claims_batch`

## Ghost payer (two MCP)

1. Payer: `fund_deal` only (no attest)
2. Payee: `submit_delivery` → poll `get_settlement_status` until `claim`
3. Payee: `complete_claim_for_deal`

## nextAction → tool

| nextAction | Role | Tool |
|------------|------|------|
| `onboardRecipient` | payer | `register_recipients` |
| `fund` | payer | `fund_deal` |
| `deliver` | payee | `submit_delivery` |
| `attest` | payer | `attest_release` |
| `claim` | payee | `complete_claim_for_deal` |
| `reclaim` | payer | `reclaim_trusted_settlement` |
| `wait` | both | `get_settlement_status` |
| `done` | both | stop |
