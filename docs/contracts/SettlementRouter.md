# SettlementRouter

Single entrypoint for agent settlements. Enforces registry + allowlist, delegates escrow operations.

**Source:** `contracts/SettlementRouter.sol`

## Constructor

```solidity
constructor(address registry_, address allowlist_, address escrow_)
```

## Public API

| Function | Access | Description |
|----------|--------|-------------|
| `settle(...)` | anyone | Atomic: create + fund + accept + claim (non-hybrid) |
| `fundAndAccept(...)` | anyone | Create + fund + accept (non-hybrid) |
| `fundAndAcceptHybrid(...)` | anyone | Create + fund + accept (optional hybrid) |
| `submitDelivery(dealId, resultHash)` | payee only | Submit work delivery |
| `attestRelease(dealId, resultHash)` | payer only | Payer fast-path attestation |
| `claim(dealId, proofHash)` | anyone | Release to payee (minus fee) |
| `reclaim(dealId)` | anyone | Refund payer after deadline |
| `canClaim(dealId)` | view | Hybrid claim eligibility |
| `getDeal(dealId)` | view | Full deal struct |
| `isSettled(dealId)` | view | `state == Released` |

## Reverts (via dependencies)

- `"agent not registered"` — registry check on fund paths
- `"token not allowed"` — allowlist check
- `"only payee"` — `submitDelivery` caller ≠ deal.payee
- `"only payer"` — `attestRelease` caller ≠ deal.payee

## Events

| Event | When |
|-------|------|
| `SettlementInitiated` | Deal created on fund paths |

## settlementTxHash

Maps `dealId` → `keccak256(block.number, dealId, proofHash)` after claim.

## Related tests

`test/contracts/SettlementRouter.test.cjs` — 14 tests (legacy, hybrid, reclaim, reverts)

## Related source

- `src/shared/abis.ts` — `settlementRouterAbi`
- `src/internal/settle/index.ts`
