# Phase 1 threat model

Honest security boundaries for **Pharos Settle** bilateral agent payments. Phase 2 (disputes, reputation, marketplace) is planned — see [PHASES.md](../PHASES.md).

> **⚠️ Payer rejection trust assumption.** Phase 1 supports **cooperative review**, not adversarial dispute resolution. `rejectDelivery` gives the payer unilateral power to refund during the dispute window with no on-chain quality check. Treat unknown payers as trusted reviewers, not as parties bound by arbitration. See [Payer rejection rug vector](#payer-rejection-rug-vector-asymmetric-power) below.

## Scenarios

| Scenario | Phase 1 protection | Residual risk |
|----------|---------------------|---------------|
| Payee never delivers | Payer `reclaim` after `ttlSeconds` (TTL) | None — full refund, no fee |
| Payer never attests (legitimate delivery) | Payee auto-release after `disputeWindow` | None — ghost payer path |
| Payee submits junk / invalid delivery | Payer `reject_delivery` during dispute window → immediate refund | Payer must actively reject before window closes; inattentive payer + malicious payee still auto-releases |
| **Payer rejects valid delivery** | None on-chain | **Payer keeps funds + work product** — see [payer rejection rug](#payer-rejection-rug-vector-asymmetric-power) |
| Subjective work quality disagreement | Not on-chain | Phase 2 disputes / arbitration |
| Untrusted counterparty | Registry + allowlist + simulate-first | No reputation signal in Phase 1; payer rejection is unilateral |
| Payer bypasses simulate / fake preflight | `preflightHash` stored on-chain as audit log only | Contracts do not enforce hash — verify off-chain |
| Contract logic bug | Immutable deploy; redeploy patched version | See [upgrade-strategy.md](../contracts/upgrade-strategy.md) |

## Dual-ghost protection (Phase 1)

| If… | Then… |
|-----|-------|
| Worker **never delivers** | Payer **reclaims** after TTL |
| Worker submits **junk delivery** | Payer **rejects** during dispute window (`reject_delivery`) |
| Payer **never attests** after valid delivery | Worker still **claims** after dispute window |
| Both cooperate | Instant settlement (fund → deliver → attest → claim) |

Dual-ghost protection covers **non-delivery** and **non-attestation**. It does **not** protect payees from a payer who receives valid work and rejects anyway.

## Payer rejection rug vector (asymmetric power)

In `DealEscrow.rejectDelivery`, the only gate before a full refund is timing — the payer must call while the dispute window is open:

```solidity
require(
    block.timestamp < uint256(deal.deliverySubmittedAt) + uint256(deal.disputeWindow),
    "dispute window elapsed"
);
deal.state = DealState.Refunded;
IERC20(deal.token).safeTransfer(deal.payer, deal.amount);
```

There is **no** on-chain check that delivery is junk, incomplete, or off-spec. `resultHash` binds a hash to the deal; the contract never inspects the underlying payload.

### Attack pattern

1. Payee submits delivery (`resultHash` may point to IPFS, encrypted blob, or off-chain API).
2. Payer retrieves or decrypts the work product during the dispute window.
3. Payer calls `rejectDelivery` → **100% refund**, no protocol fee.
4. Payer retains the work without paying.

This is intentional for Phase 1 junk protection when both parties cooperate. It becomes a rug vector when the payer is adversarial.

### Economic loophole

| Action | Protocol fee |
|--------|----------------|
| Successful `claim` | `feeBps` (on gross) |
| `reclaim` (no delivery) | 0% |
| `rejectDelivery` | 0% |

A malicious payer can fund many small deals, extract deliverables, reject each one, and lose only gas — with no slashing or reputation penalty in Phase 1.

### Integrator guidance (Phase 1)

- Use hybrid + dispute window only when the **payer is trusted** or bound by off-chain contract.
- For high-value or adversarial settings: encrypt delivery until attestation, use escrow outside Pharos, or wait for Phase 2 arbitration.
- Payees should treat `reject_delivery` as **cooperative QA**, not proof of invalid work.
- Monitor rejection rate off-chain until reputation exists (Phase 2).

Phase 2 resolution design: [PHASES.md § Dispute and arbitration](../PHASES.md#1-dispute-and-arbitration).

## Parameter guidance

- Set `disputeWindowSeconds` long enough for the payer to review delivery before auto-release.
- Keep `disputeWindowSeconds` **less than** `ttlSeconds` so auto-claim can occur before deal expiry.
- For unknown payees, use shorter dispute windows only if the payer monitors `get_settlement_status` actively.

## Related docs

- [On-chain flows](../architecture/on-chain-flows.md)
- [DealEscrow](../contracts/DealEscrow.md)
- [Upgrade strategy](../contracts/upgrade-strategy.md)
