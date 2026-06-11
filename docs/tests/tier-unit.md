# Tier 2: Unit tests

**Runner:** Vitest  
**Path:** `test/unit/**/*.vitest.ts`  
**Count:** 42 tests

## File → module mapping

| Test file | Module under test |
|-----------|-------------------|
| `nextAction.vitest.ts` | `src/internal/commerce/nextAction.ts` |
| `onboarding.vitest.ts` | `src/internal/preflight/onboarding.ts` |
| `preflightHash.vitest.ts` | `src/internal/preflight/hash.ts` |
| `readiness.vitest.ts` | `src/internal/commerce/readiness.ts` |
| `rpc.vitest.ts` | `src/shared/rpc.ts` |
| `chain.vitest.ts` | `src/shared/chain.ts` |
| `feeQuote.vitest.ts` | `src/internal/commerce/feeQuote.ts` |
| `receiptVerify.vitest.ts` | `src/internal/prove/receiptVerify.ts` |
| `batch-split.vitest.ts` | `src/internal/settle/batch.ts`, `batchValidation.ts` |
| `trustedAgentSettlement.mock.vitest.ts` | Layer 1 API (mock mode) |

## Mock patterns

- **viem mock:** `receiptVerify`, `feeQuote` — mock `createPublicClient`
- **mock config:** `trustedAgentSettlement.mock` — no RPC

## Run

```bash
npm run test:unit
```

Excludes `test/atlantic/**`.

## Fixtures

- `test/fixtures/receipt-claim.json` — sample claim receipt

## Setup

`test/setup.ts` loads dotenv for env-dependent tests.
