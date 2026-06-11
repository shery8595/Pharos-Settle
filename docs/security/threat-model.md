# Phase 1 threat model

Honest security boundaries for **Pharos Settle** bilateral agent payments. **v1.3.0 (Atlantic)** enforces payer-only funding and hybrid `disputeWindow < ttl`. **v1.2.0** adds auditable rejection and optional arbiter disputes. Phase 2 is planned — see [PHASES.md](../PHASES.md).

> Phase 1 ships **cooperative settlement with ghost protection** plus **auditable `reasonHash` on rejection**. Optional **arbiter mode** freezes funds on reject until a designated reviewer resolves. This is **not** trustless oracle arbitration. Phase 2 adds reputation and marketplace discovery.

## Rejection modes (v1.2)

| Mode | Setup | Payer rejects | Payee risk |
|------|-------|---------------|------------|
| **Cooperative** (default) | `arbiter: 0x0` | Instant refund + `reasonHash` on-chain | Payer can rug valid work — see [payer rejection rug](#payer-rejection-rug-vector-asymmetric-power) |
| **Arbiter** | `arbiter` set at fund | `Disputed` — funds frozen | Arbiter resolves release/refund/split; payer cannot unilaterally refund |

## Scenarios

| Scenario | Phase 1 protection | Residual risk |
|----------|---------------------|---------------|
| Payee never delivers | Payer `reclaim` after `ttlSeconds` (TTL) | None — full refund, no fee |
| Payer never attests (legitimate delivery) | Payee auto-release after `disputeWindow` | None — ghost payer path |
| Payee submits junk / invalid delivery | Cooperative: payer `reject_delivery` + `reasonHash` → refund | Payer must actively reject before window closes |
| **Payer rejects valid delivery (cooperative)** | `reasonHash` audit trail only | **Payer keeps funds + work** — rug vector |
| **Payer rejects valid delivery (arbiter)** | Funds frozen in `Disputed` | Arbiter may still rule for payer — trust the arbiter |
| Subjective quality disagreement | Arbiter `resolveDispute` split | Arbiter bias; no reputation slashing yet (Phase 2) |
| Untrusted counterparty | Registry + allowlist + simulate-first + optional arbiter | No reputation signal until Phase 2 |
| Payer bypasses simulate / fake preflight | `preflightHash` stored as audit log only | Contracts do not enforce hash — verify off-chain |
| Third party funds deal as payer (v1.2 and earlier) | **v1.3+:** `msg.sender == payer` on all fund paths | Prior Atlantic deploys: griefing if payer pre-approved escrow |
| Hybrid `disputeWindow >= ttl` (bad defaults) | **v1.3+:** on-chain revert; SDK defaults 7d TTL / 3d window | Prior deploys + bad params: ghost-payer auto-claim impossible |
| Contract logic bug | Immutable deploy; redeploy patched version | See [upgrade-strategy.md](../contracts/upgrade-strategy.md) |

## Dual-ghost protection (Phase 1)

| If… | Then… |
|-----|-------|
| Worker **never delivers** | Payer **reclaims** after TTL |
| Worker submits **junk delivery** | Cooperative: payer **safety valve** (`reject_delivery` + `reasonHash`) |
| Payer **never attests** after valid delivery | Worker still **claims** after dispute window |
| Both cooperate | Instant settlement (fund → deliver → attest → claim) |

Dual-ghost protection covers **non-delivery** and **non-attestation**. Cooperative mode does **not** protect payees from an adversarial payer who rejects valid work. Use **arbiter mode** for adversarial payments.

## Payer rejection rug vector (asymmetric power)

In cooperative mode (`arbiter == address(0)`), `rejectDelivery(dealId, reasonHash)` still refunds 100% during the dispute window:

```solidity
require(reasonHash != bytes32(0), "zero reason");
// ...
if (deal.arbiter == address(0)) {
    deal.state = DealState.Refunded;
    IERC20(deal.token).safeTransfer(deal.payer, deal.amount);
}
```

There is **no** on-chain check that delivery is junk. `reasonHash` binds off-chain evidence for future reputation — the contract never inspects the payload.

### Attack pattern (cooperative mode only)

1. Payee submits delivery (`resultHash` may point to IPFS, encrypted blob, or off-chain API).
2. Payer retrieves work during the dispute window.
3. Payer calls `rejectDelivery` with a `reasonHash` → **100% refund**, no protocol fee.
4. Payer retains the work without paying.

### Mitigations (v1.2)

| Mitigation | How |
|------------|-----|
| Auditable rejection | Required `reasonHash`; index `DeliveryRejected` for Phase 2 reputation |
| Arbiter mode | Reject → `Disputed`; funds frozen until `resolveDispute` |
| Integrator hygiene | Encrypt until attestation; trusted payer only in cooperative mode |

### Economic loophole (cooperative reject)

| Action | Protocol fee |
|--------|----------------|
| Successful `claim` | `feeBps` (on gross) |
| `reclaim` (no delivery) | 0% |
| Cooperative `rejectDelivery` | 0% |

A malicious payer in cooperative mode can extract deliverables and reject for gas cost only — no slashing until Phase 2 reputation.

### Integrator guidance

- **Demos / trusted agents:** `arbiter: 0x0`, cooperative mode.
- **Adversarial / high-value:** set `arbiter` at fund time; use separate MCP identity with `ARBITER_PRIVATE_KEY` for `resolve_dispute`.
- Always pass `reason` or `reasonHash` to `reject_delivery`.
- Payees should treat cooperative reject as **QA between trusted parties**, not proof of invalid work.

Phase 2: reputation from rejection events, bonds, commit-reveal delivery — [PHASES.md § Dispute](../PHASES.md#1-dispute-and-arbitration).

## Parameter guidance

- Set `disputeWindowSeconds` long enough for the payer to review delivery before auto-release.
- Keep `disputeWindowSeconds` **less than** `ttlSeconds` so auto-claim can occur before deal expiry.
- For unknown payees, use arbiter mode or shorter dispute windows with active `get_settlement_status` monitoring.

## Related docs

- [On-chain flows](../architecture/on-chain-flows.md)
- [DealEscrow](../contracts/DealEscrow.md)
- [Upgrade strategy](../contracts/upgrade-strategy.md)
