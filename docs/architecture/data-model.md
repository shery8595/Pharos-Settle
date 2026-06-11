# Data model (off-chain + on-chain)

Cross-reference for SDK types and contract structs. **v1.3.0** adds payer-only funding and hybrid timing validation. **v1.2.0** adds `Disputed`, `arbiter`, `rejectionReasonHash`.

## SettlementStatus (SDK)

Returned by `getSettlementStatus` / MCP `get_settlement_status`:

| Field | Type | Notes |
|-------|------|-------|
| `state` | DealState name | Includes `Disputed` |
| `rejectEligible` | bool | Payer can reject during window |
| `disputeOpen` | bool | `state == Disputed` |
| `resolveEligible` | bool | Arbiter can resolve |
| `arbiter` | address | `0x0` = cooperative mode |
| `rejectionReasonHash` | string \| null | Set after reject |
| `nextAction` | NextAction | Includes `resolve` when disputed |

`success` requires post-settlement prove verification when `claimTx` is present.

## DealSnapshot (off-chain view)

Used by `getSettlementStatus` and `computeNextAction`:

| Field | Source |
|-------|--------|
| `state` | DealState enum (0–5) |
| `deadline` | Unix timestamp |
| `requiresHybridRelease` | bool |
| `deliverySubmittedAt` | uint64 |
| `disputeWindow` | uint64 |
| `payerAttested` | bool |
| `canClaim` | `canClaim(dealId)` |
| `arbiter` | address |
| `rejectionReasonHash` | bytes32 |

## NextAction values

| Value | Meaning |
|-------|---------|
| `fund` | Run fund step |
| `deliver` | Payee submits delivery |
| `attest` | Payer attests release |
| `claim` | Payee claims |
| `reclaim` | Payer reclaims after TTL |
| `reject` | Payer rejects with reason (eligible window) |
| `resolve` | Arbiter resolves open dispute |
| `wait` | Poll until auto-release or deadline |
| `done` | Settlement complete |
| `onboardRecipient` | Register payee first |

## On-chain Deal struct (v1.2)

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
  address arbiter;
  bytes32 rejectionReasonHash;
}
```

## DEAL_STATE mapping

| Index | Name |
|-------|------|
| 0 | Created |
| 1 | Funded |
| 2 | Accepted |
| 3 | Disputed |
| 4 | Released |
| 5 | Refunded |

## Related source

- `src/shared/schemas.ts`
- `src/shared/abis.ts` — `DEAL_STATE`, `NextAction`
- `src/internal/commerce/nextAction.ts`
