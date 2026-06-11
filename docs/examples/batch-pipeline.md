# Batch pipeline example

Demonstrates SALI batch settlements on Pharos Atlantic — `saliFast` and `hybridWork` modes.

## Files

| File | Purpose |
|------|---------|
| `examples/pipeline/run-batch.ts` | Single-process batch (`executeBatchSettlement`) |
| `examples/pipeline/run-batch-split.ts` | Two-agent handoff via manifest |

## Run (single process)

```bash
npm run demo:batch
npm run demo:batch:simulate
BATCH_SIZE=10 npm run demo:batch
BATCH_MODE=hybridWork npm run demo:batch
```

## Run (two-agent split)

```bash
npm run demo:batch:split
BATCH_MODE=hybridWork npm run demo:batch:split
npm run demo:batch:split:simulate
```

Requires `PRIVATE_KEY` (payer) and `AGENT_B_PRIVATE_KEY` (payee) in `.env`.

## What `saliFast` does

1. Builds N settlement jobs (unique `workDescription` each)
2. Runs batch preflight (cumulative allowance)
3. Payer: submits N fund txs with explicit nonces (Atlantic)
4. Payee: submits N claim txs in parallel
5. Prints throughput metrics

## What `hybridWork` does

1. Fund batch (payer)
2. Deliver batch (payee)
3. Attest batch (payer)
4. Claim batch (payee)

## Key output fields

```
succeeded: 5
batchMode: saliFast
maxParallelInBlock: 4
endToEndDealsPerSec: 8.2
saliNote: "4 fund txs confirmed in the same block — Pharos SALI parallel execution."
```

## Two-MCP handoff

1. Payer MCP: `fund_deals_batch` → returns `manifest`
2. Payee MCP: `complete_claims_batch` (saliFast) or `submit_deliveries_batch` → payer `attest_releases_batch` → payee `complete_claims_batch` (hybridWork)

See [batch-sali.md](../mcp/batch-sali.md).

## Configuration

Uses `deploymentNetwork: "atlantic"` and env keys. Optional RPC tuning: `RPC_MIN_INTERVAL_MS`, `RPC_RETRY_MS` (see [environment](../getting-started/environment.md)).

## Related docs

- [Batch settlements](../sdk/batch-settlements.md)
- [SDK API](../sdk/api-reference.md)
- [MCP roles](../mcp/roles.md)
