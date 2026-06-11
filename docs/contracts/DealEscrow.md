# DealEscrow

Holds ERC-20 funds and implements the deal state machine. Only callable by `router`.

**Source:** `contracts/DealEscrow.sol` · **Atlantic v1.3.0** — see [upgrade-strategy.md](upgrade-strategy.md)

## DealState enum

| Value | Name |
|-------|------|
| 0 | Created |
| 1 | Funded |
| 2 | Accepted |
| 3 | Disputed |
| 4 | Released |
| 5 | Refunded |

## Deal struct (v1.2 fields)

| Field | Role |
|-------|------|
| `arbiter` | Optional reviewer; `address(0)` = cooperative instant-refund rejection |
| `rejectionReasonHash` | Set when payer rejects; auditable evidence for reputation (Phase 2) |

## Owner functions

| Function | Reverts |
|----------|---------|
| `setRouter(address)` | `"zero router"`, `"not owner"` |
| `setFeeConfig(feeBps, recipient)` | `"fee too high"` if > `MAX_FEE_BPS` (1000) |

## Router-only functions

| Function | State transition | Key reverts |
|----------|------------------|-------------|
| `createDeal(..., arbiter)` | → Created | `"zero address"`, `"zero amount"`, `"zero ttl"`, `"zero dispute window"`, `"dispute window >= ttl"` (hybrid) |
| `fund(dealId)` | Created → Funded | `"bad state"`, `"only router"` |
| `accept(dealId)` | Funded → Accepted | `"bad state"` |
| `submitDelivery(dealId, hash)` | sets delivery fields | `"not hybrid"`, `"already delivered"`, `"expired"` |
| `attestRelease(dealId, hash)` | sets `payerAttested` | `"not hybrid"`, `"bad state"` |
| `rejectDelivery(dealId, reasonHash)` | → Refunded **or** Disputed | `"zero reason"`, `"no delivery"`, `"already attested"`, `"dispute window elapsed"` — see [rejection modes](#rejection-modes-v12) |
| `resolveDispute(dealId, outcome, payeeBps)` | Disputed → Released or Refunded | `"bad state"`, `"bad outcome"`, `"bad split bps"` |
| `claim(dealId, proofHash)` | Accepted → Released | `"expired"`, `"cannot claim"` |
| `reclaim(dealId)` | → Refunded | `"not expired"`, `"delivery submitted"` |

`preflightHash` is write-only on-chain — stored at deal creation but not validated by the contract.

## Rejection modes (v1.2)

> **Cooperative** (`arbiter == address(0)`): payer `rejectDelivery` during dispute window → immediate `Refunded` with auditable `reasonHash`. **Arbiter** (non-zero): same call → `Disputed` (funds frozen); only arbiter `resolveDispute`.

- Cooperative path refunds 100% to payer; **no protocol fee** (same as `reclaim`).
- Contract does **not** verify delivery quality — `reasonHash` binds off-chain evidence; cooperative junk review between known agents.
- Arbiter mode mitigates [payer rejection rug](../security/threat-model.md#payer-rejection-rug-vector-asymmetric-power) for adversarial payments — arbiter is a **designated third party**, not trustless oracle arbitration.
- Integrator risk: [threat-model.md](../security/threat-model.md) · Phase 2 reputation: [PHASES.md § Dispute](../PHASES.md#1-dispute-and-arbitration).

### resolveDispute outcomes

| Outcome | Value | Behavior |
|---------|-------|----------|
| `ReleaseToPayee` | 0 | Same payout as `claim` (fee on gross) |
| `RefundPayer` | 1 | Full refund to payer |
| `Split` | 2 | `0 < payeeBps < 10000`; fee on payee share only |

## canClaim logic

Returns `true` when:

- State is `Accepted` and not past `deadline`
- Non-hybrid: always (if accepted)
- Hybrid: payer attested **OR** delivery submitted and dispute window elapsed

Returns `false` when state is `Disputed`.

## Events

| Event | Indexed fields |
|-------|----------------|
| `DealCreated` | dealId, payer, payee (+ `arbiter` in data) |
| `DealFunded` | dealId, payer |
| `DealAccepted` | dealId, payee |
| `DeliverySubmitted` | dealId, payee |
| `ReleaseAttested` | dealId, payer |
| `DeliveryRejected` | dealId, payer (+ `reasonHash`) |
| `DisputeOpened` | dealId, payer (+ `reasonHash`) |
| `DisputeResolved` | dealId, arbiter |
| `SettlementReleased` | dealId, payee |
| `FeeCollected` | dealId, recipient |
| `SettlementRefunded` | dealId, payer |

## Fees

On `claim` and `resolveDispute(ReleaseToPayee)`: `feeAmount = amount * feeBps / 10000`. On `Split`, fee applies to payee portion only.

## Related tests

- `test/contracts/DealEscrow.test.cjs` — cooperative/arbiter reject, resolve outcomes, split fee
- `test/contracts/SettlementRouter.test.cjs` — end-to-end flows

## Related source

- `src/internal/settle/delivery.ts`
- `src/internal/commerce/nextAction.ts`
- `src/internal/preflight/hash.ts` — `rejectionReasonHash()`
