# SettlementRouter

Single entrypoint for agent settlements. Enforces registry + allowlist, delegates escrow operations.

**Source:** `contracts/SettlementRouter.sol` · **v1.2.0**

## Constructor

```solidity
constructor(address registry_, address allowlist_, address escrow_)
```

## Public API

| Function | Access | Description |
|----------|--------|-------------|
| `settle(...)` | anyone | Atomic: create + fund + accept + claim (non-hybrid) |
| `fundAndAccept(...)` | anyone | Create + fund + accept (non-hybrid) |
| `fundAndAcceptHybrid(..., arbiter)` | anyone | Create + fund + accept (optional hybrid + arbiter) |
| `submitDelivery(dealId, resultHash)` | payee only | Submit work delivery |
| `attestRelease(dealId, resultHash)` | payer only | Payer fast-path attestation |
| `rejectDelivery(dealId, reasonHash)` | payer only | Reject with auditable hash — cooperative refund or arbiter dispute |
| `resolveDispute(dealId, outcome, payeeBps)` | arbiter only | Release, refund, or split |
| `claim(dealId, proofHash)` | anyone | Release to payee (minus fee) |
| `reclaim(dealId)` | anyone | Refund payer after deadline |
| `canClaim(dealId)` | view | Hybrid claim eligibility |
| `getDeal(dealId)` | view | Full deal struct |
| `isSettled(dealId)` | view | `state == Released` |

## Reverts (via dependencies)

- `"agent not registered"` — registry check on fund paths
- `"token not allowed"` — allowlist check
- `"only payee"` — `submitDelivery` caller ≠ deal.payee
- `"only payer"` — `attestRelease` or `rejectDelivery` caller ≠ deal.payer
- `"only arbiter"` — `resolveDispute` caller ≠ deal.arbiter
- `"zero reason"` — `rejectDelivery` without reasonHash

## Events

| Event | When |
|-------|------|
| `SettlementInitiated` | Deal created on fund paths |

## settlementTxHash

Maps `dealId` → `keccak256(block.number, dealId, proofHash)` after claim.

## Related tests

`test/contracts/SettlementRouter.test.cjs` — hybrid, reclaim, reject, arbiter resolve, reverts

## Related source

- `mcp/tools.ts` — `reject_delivery`, `resolve_dispute`
- `src/trustedAgentSettlement.ts` — `rejectDeliveryForDeal`, `resolveDisputeForDeal`
