# API reference

## Layer 1 — `trustedAgentSettlement.ts`

### simulateTrustedSettlement(input, config?)

Read-only simulation. Returns preflight, fee quote, and `nextAction` without sending transactions.

**Returns:** `SimulationOutput` — `{ success, routerAddress, nextAction, feeQuote, stages, totalDurationMs }`

`success` is true when preflight ready OR only payee needs onboarding.

### executeTrustedSettlement(input, config?)

Full settlement pipeline: preflight → optional onboard → settle → prove.

**Returns:** `TrustedSettlementOutput`

**Config highlights:** `mode`, `mock`, `skipAttest`, `autoOnboardRecipients`, `payerSigner`, `payeeSigner`

Caches successful results by input key (same agentA/B/amount/workDescription).

### getSettlementStatus(dealId, config?)

Poll on-chain deal state with `nextAction`, `reclaimable`, `canClaim`, `autoReleaseAt`.

Uses **chain block timestamp** for time-based fields (not wall clock).

**Returns:** `SettlementStatus`

### reclaimTrustedSettlement(dealId, config?)

Payer refund when deadline passed and no delivery. Checks `reclaimable` first.

**Returns:** `ReclaimOutput` — `{ success, dealId, refundTx?, reason?, nextAction? }`

### completeClaimForDeal(dealId, input, config?)

Claim when deal is already eligible (e.g. after auto-release window).

**Returns:** `TrustedSettlementOutput`

### executeBatchSettlement(jobs, config?)

Batch N deals. `batchMode: "saliFast"` (fund+claim) or `"hybridWork"` (full 4-phase). Parallel nonces on Atlantic; sequential on `inProcessProvider`.

**Returns:** `BatchSettlementOutput`

### fundDealsBatch(jobs, config?)

Payer phase: fund N deals. Returns manifest for payee handoff.

### submitDeliveriesBatch(manifest, config?)

Payee phase (`hybridWork`): submit N deliveries.

### attestReleasesBatch(manifest, config?)

Payer phase (`hybridWork`): attest N releases.

### claimDealsBatch(manifest, config?)

Payee phase: claim N deals from manifest (`saliFast` or after hybridWork attest).

### registerRecipients(addresses, config?)

Payer-sponsored batch onboarding.

**Returns:** `RegisterRecipientsOutput`

### registerRecipient(address, config?)

Single-address onboarding wrapper.

---

## Layer 2 — `steps.ts`

Import: `pharos-trusted-settlement/steps`. Mirrors [architecture overview](../architecture/overview.md#composable-api-layer-2).

| Export | Module | Description |
|--------|--------|-------------|
| `preflight` | preflight/index | Readiness checks + `preflightHash` |
| `getFeeQuote` | commerce/feeQuote | Protocol fee estimate |
| `prove` | prove/index | Post-claim receipt (or SPV) verification |
| `registerRecipient` / `registerRecipients` | onboard/recipients | Payer-sponsored payee registration |
| `fundDeal` | settle/index | Payer fund (requires `preflightHash` from `preflight`) |
| `settle` | settle/index | Full fund → deliver → attest → claim orchestrator |
| `reclaimDeal` | settle/index | On-chain reclaim tx |
| `submitDelivery` / `submitDeliveryWithHash` | settle/delivery | Payee delivery |
| `attestRelease` / `attestReleaseWithHash` | settle/delivery | Payer attestation |
| `claimDeal` | settle/delivery | Payee claim |
| `readCanClaim` | settle/delivery | View `canClaim` |
| `resultHashFromWork` | settle/delivery | Delivery hash helper |
| `executeBatchSettlement` | settle/batch | Full batch orchestrator |
| `fundDealsBatch` | settle/batch | Payer fund N → `manifest` |
| `submitDeliveriesBatch` | settle/batch | Payee deliver N (`hybridWork`) |
| `attestReleasesBatch` | settle/batch | Payer attest N (`hybridWork`) |
| `claimDealsBatch` | settle/batch | Payee claim N (consumes `manifest`) |
| `getAgentReadiness` | agent/readiness | Role + allowed tools |
| `detectAgentRole` | agent/readiness | Env-key role detection |
| `allowedToolsForRole` | agent/readiness | Tools for a role |

**Types:** `BatchSettlementOutput`, `BatchFundOutput`, `BatchDeliveryOutput`, `BatchAttestOutput`, `BatchClaimOutput`, `BatchDealResult`.

---

## Types

Defined in `src/shared/schemas.ts`. See [Configuration](configuration.md) and [Data model](../architecture/data-model.md).

## Related source

- `src/trustedAgentSettlement.ts`
- `src/steps.ts`
