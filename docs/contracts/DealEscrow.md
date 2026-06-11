# DealEscrow

Holds ERC-20 funds and implements the deal state machine. Only callable by `router`.

**Source:** `contracts/DealEscrow.sol`

## DealState enum

| Value | Name |
|-------|------|
| 0 | Created |
| 1 | Funded |
| 2 | Accepted |
| 3 | Released |
| 4 | Refunded |

## Owner functions

| Function | Reverts |
|----------|---------|
| `setRouter(address)` | `"zero router"`, `"not owner"` |
| `setFeeConfig(feeBps, recipient)` | `"fee too high"` if > `MAX_FEE_BPS` (1000) |

## Router-only functions

| Function | State transition | Key reverts |
|----------|------------------|-------------|
| `createDeal(...)` | → Created | `"zero address"`, `"zero amount"`, `"zero ttl"`, `"zero dispute window"` |
| `fund(dealId)` | Created → Funded | `"bad state"`, `"only router"` |
| `accept(dealId)` | Funded → Accepted | `"bad state"` |
| `submitDelivery(dealId, hash)` | sets delivery fields | `"not hybrid"`, `"already delivered"`, `"expired"` |
| `attestRelease(dealId, hash)` | sets `payerAttested` | `"not hybrid"` |
| `rejectDelivery(dealId)` | → Refunded | `"no delivery"`, `"already attested"`, `"dispute window elapsed"` |
| `claim(dealId, proofHash)` | Accepted → Released | `"expired"`, `"cannot claim"` |
| `reclaim(dealId)` | → Refunded | `"not expired"`, `"delivery submitted"` |

`preflightHash` is write-only on-chain in Phase 1 — stored at deal creation but not validated by the contract.

## canClaim logic

Returns `true` when:

- State is `Accepted` and not past `deadline`
- Non-hybrid: always (if accepted)
- Hybrid: payer attested **OR** delivery submitted and dispute window elapsed

## Events

| Event | Indexed fields |
|-------|----------------|
| `DealCreated` | dealId, payer, payee |
| `DealFunded` | dealId, payer |
| `DealAccepted` | dealId, payee |
| `DeliverySubmitted` | dealId, payee |
| `ReleaseAttested` | dealId, payer |
| `SettlementReleased` | dealId, payee |
| `FeeCollected` | dealId, recipient |
| `SettlementRefunded` | dealId, payer |

## Fees

On `claim`: `feeAmount = amount * feeBps / 10000`; payee receives `amount - feeAmount`.

## Related tests

- `test/contracts/DealEscrow.test.cjs` — fee cap, router-only, canClaim
- `test/contracts/SettlementRouter.test.cjs` — end-to-end flows

## Related source

- `src/internal/settle/delivery.ts`
- `src/internal/commerce/nextAction.ts`
