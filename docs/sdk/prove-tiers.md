# Prove tiers

Post-settlement verification runs after a successful `claimTx`.

## prove(input, config)

**Input:**

| Field | Description |
|-------|-------------|
| `token` | ERC-20 address |
| `payee` | Payee address |
| `amount` | Deal amount (wei string) |
| `claimTxHash` | Claim transaction hash |
| `claimBlockNumber` | Optional block for SPV |

## Tier: receipt (default)

`config.proveTier` omitted or `"receipt"`.

1. `waitForTransactionReceipt(claimTxHash)`
2. Find ERC-20 `Transfer` log: `from=escrow`, `to=payee`, `value=amount`
3. Compute `proofHash = keccak256(claimTxHash:amount:payee)`

**Module:** `src/internal/prove/receiptVerify.ts`

Must use `transportFromConfig(config)` when testing locally — not bare `http(rpcUrl)`.

## Tier: spv

`config.proveTier: "spv"`

Pharos SPV post-settlement verification via `verifySpvPostSettlement`.

**Module:** `src/internal/prove/spvPharos.ts`

## computeProofHash

On-chain claim uses the same binding:

```typescript
keccak256(toBytes(`${claimTxHash}:${amount}:${payee.toLowerCase()}`))
```

## Pre-settlement prove

Currently skipped with reason: *"pre-settlement SPV optional in Phase 1; preflight covers readiness"*.

## executeTrustedSettlement success

`success = proveResult.postSettlement?.verified ?? false` when `claimTx` present.

## Fixture

`test/fixtures/receipt-claim.json` — sample receipt for unit tests.

## Related tests

- `test/unit/receiptVerify.vitest.ts`

## Related source

- `src/internal/prove/index.ts`
- `src/internal/prove/receiptVerify.ts`
