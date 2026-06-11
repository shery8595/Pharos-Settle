# Batch settlements — SALI FastPay

**SALI FastPay** is batch agent payroll on Pharos Atlantic: one payer, many worker agents, parallel settlement via SALI execution.

## Modes

| Mode | Flow | Use when |
|------|------|----------|
| `saliFast` | fund N → claim N | High throughput; work trust is off-chain or pre-agreed |
| `hybridWork` | fund → deliver → attest → claim (×N) | On-chain work proof + attestation at batch scale |

Default: `saliFast` (backward compatible with early `executeBatchSettlement`).

## Layer 1 API

### executeBatchSettlement(jobs, config?)

Demo shortcut when both payer and payee keys are available. Orchestrates the full batch in one process.

```typescript
const batch = await executeBatchSettlement(jobs, {
  batchMode: "saliFast", // or "hybridWork"
  deploymentNetwork: "atlantic",
});
```

### Phase functions (two-agent split)

| Function | Role | Keys |
|----------|------|------|
| `fundDealsBatch(jobs, config)` | Payer | `PRIVATE_KEY` / `payerSigner` |
| `submitDeliveriesBatch(manifest, config)` | Payee | `AGENT_B_PRIVATE_KEY` / `payeeSigner` |
| `attestReleasesBatch(manifest, config)` | Payer | payer key |
| `claimDealsBatch(manifest, config)` | Payee | payee key (one identity per call) |
| `filterManifestForPayee(manifest, address)` | Helper | Filter multi-payee manifest for one payee MCP |

`fundDealsBatch` returns a **manifest** (`dealId`, `fundTx`, `amount`, `agentB`, …) for payee handoff.

## Phases (`saliFast`)

1. **Preflight** — shared payer/token; cumulative allowance; payee registration
2. **Fund** — N `fundAndAccept` txs (explicit nonces on Atlantic)
3. **Confirm** — wait for fund receipts; extract `dealId` from escrow `DealCreated` logs
4. **Claim** — N `claim` txs; each claim binds to that deal's `fundTx`, amount, and payee (via `claimDealsBatch`)

## Phases (`hybridWork`)

1. Fund batch (as above)
2. Payee submits deliveries (`submitDeliveriesBatch`)
3. Payer attests releases (`attestReleasesBatch`)
4. Payee claims (`claimDealsBatch`)

## Atlantic (parallel)

Uses explicit nonces (`payerNonce + i`, `payeeNonce + i`) so multiple txs can land in the same block. Set `rpcBurstWrites: true` on `SettlementConfig` for burst submission.

**Metrics in output:**

| Field | Meaning |
|-------|---------|
| `maxParallelInBlock` | Max fund txs sharing a block |
| `fundTxPerSec` | Fund submission throughput |
| `endToEndDealsPerSec` | Full batch throughput |
| `saliNote` | Human-readable SALI indicator |

## Hardhat (sequential)

When `config.inProcessProvider` is set, batch detects automining and submits fund/claim txs **one at a time** without explicit nonces.

Reason: Hardhat rejects queued nonces under automining (*"Nonce too high"*).

## BatchSettlementOutput

```typescript
{
  success: boolean;
  batchMode: "saliFast" | "hybridWork";
  deals: number;
  succeeded: number;
  failed: number;
  fundSubmitMs: number;
  fundConfirmMs: number;
  claimPhaseMs: number;
  totalMs: number;
  results: BatchDealResult[];
  manifest?: BatchManifest; // phase functions
  // ... throughput metrics
}
```

## Demos

```bash
npm run demo:batch                    # saliFast on Atlantic (BATCH_SIZE=5)
npm run demo:batch:simulate           # mock
BATCH_SIZE=10 npm run demo:batch

npm run demo:batch:split              # two-MCP handoff (default saliFast)
BATCH_MODE=hybridWork npm run demo:batch:split
npm run demo:batch:split:simulate     # mock split
```

See [Batch pipeline example](../examples/batch-pipeline.md) and [MCP batch / SALI](../mcp/batch-sali.md).

## Related tests

- `test/integration/sdk.local.test.cjs` — `executeBatchSettlement` + split modes
- `test/unit/batch-split.vitest.ts` — manifest validation, saliFast/hybridWork
- `test/unit/trustedAgentSettlement.mock.vitest.ts` — mock batch
- `test/mcp/tools.vitest.ts` — batch MCP tools

## Related source

- `src/internal/settle/batch.ts`
- `src/internal/settle/batchValidation.ts`
- `examples/pipeline/run-batch.ts`
- `examples/pipeline/run-batch-split.ts`
