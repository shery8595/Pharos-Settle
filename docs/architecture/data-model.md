# Data model

## TrustedSettlementInput

| Field | Type | Description |
|-------|------|-------------|
| `agentA` | string | Payer address |
| `agentB` | string | Payee address |
| `token` | string | ERC-20 contract address |
| `amount` | string | Amount in token wei |
| `workDescription` | string | Hashed to `workHash` on-chain |
| `ttlSeconds` | number? | Deal deadline from fund (default 3600) |
| `requiresHybridRelease` | boolean? | Work-based release (default true) |
| `disputeWindowSeconds` | number? | Auto-release window (default 72h) |

## SettlementConfig

See [SDK configuration](../sdk/configuration.md) for all fields.

## TrustedSettlementOutput

```typescript
{
  success: boolean;
  dealId?: string;
  routerAddress: string;
  nextAction?: NextAction;
  feeQuote?: FeeQuote;
  stages: {
    preflight: { ready, checks, preflightHash? };
    onboard?: { registerTx?, recipients, explorerLink? };
    prove: { preSettlement?, postSettlement? };
    settle?: { fundTx?, deliverTx?, attestTx?, claimTx?, settlementReceipt? };
  };
  explorerLink?: string;
  totalDurationMs: number;
}
```

`success` requires post-settlement prove verification when `claimTx` is present.

## DealSnapshot (off-chain view)

Used by `getSettlementStatus` and `computeNextAction`:

| Field | Source |
|-------|--------|
| `state` | DealState enum (0–4) |
| `deadline` | Unix timestamp |
| `requiresHybridRelease` | bool |
| `deliverySubmittedAt` | uint64 |
| `disputeWindow` | uint64 |
| `payerAttested` | bool |
| `canClaim` | `canClaim(dealId)` |

## NextAction values

| Value | Meaning |
|-------|---------|
| `fund` | Run fund step |
| `deliver` | Payee submits delivery |
| `attest` | Payer attests release |
| `claim` | Payee claims |
| `reclaim` | Payer reclaims after TTL |
| `wait` | Poll until auto-release or deadline |
| `done` | Settlement complete |
| `onboardRecipient` | Register payee first |

## On-chain Deal struct

```solidity
struct Deal {
  address payer;
  address payee;
  address token;
  uint256 amount;
  DealState state;
  uint256 deadline;
  bytes32 workHash;
  bytes32 preflightHash;
  bytes32 proofHash;
  bool requiresHybridRelease;
  bytes32 resultHash;
  uint64 deliverySubmittedAt;
  uint64 disputeWindow;
  bool payerAttested;
}
```

## DEAL_STATE mapping

| Index | Name |
|-------|------|
| 0 | Created |
| 1 | Funded |
| 2 | Accepted |
| 3 | Released |
| 4 | Refunded |

## Related source

- `src/shared/schemas.ts`
- `src/shared/abis.ts` — `DEAL_STATE`, `NextAction`
- `src/internal/commerce/nextAction.ts`
