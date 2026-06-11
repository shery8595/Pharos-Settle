# Phase 1 threat model

Honest security boundaries for **Pharos Settle** bilateral agent payments. Phase 2 (disputes, reputation, marketplace) is planned — see [PHASES.md](../PHASES.md).

## Scenarios

| Scenario | Phase 1 protection | Residual risk |
|----------|---------------------|---------------|
| Payee never delivers | Payer `reclaim` after `ttlSeconds` (TTL) | None — full refund, no fee |
| Payer never attests (legitimate delivery) | Payee auto-release after `disputeWindow` | None — ghost payer path |
| Payee submits junk / invalid delivery | Payer `reject_delivery` during dispute window → immediate refund | Payer must actively reject before window closes; inattentive payer + malicious payee still auto-releases |
| Subjective work quality disagreement | Not on-chain | Phase 2 disputes / arbitration |
| Untrusted counterparty | Registry + allowlist + simulate-first | No reputation signal in Phase 1 |
| Payer bypasses simulate / fake preflight | `preflightHash` stored on-chain as audit log only | Contracts do not enforce hash — verify off-chain |
| Contract logic bug | Immutable deploy; redeploy patched version | See [upgrade-strategy.md](../contracts/upgrade-strategy.md) |

## Dual-ghost protection (Phase 1)

| If… | Then… |
|-----|-------|
| Worker **never delivers** | Payer **reclaims** after TTL |
| Worker submits **junk delivery** | Payer **rejects** during dispute window (`reject_delivery`) |
| Payer **never attests** after valid delivery | Worker still **claims** after dispute window |
| Both cooperate | Instant settlement (fund → deliver → attest → claim) |

## Parameter guidance

- Set `disputeWindowSeconds` long enough for the payer to review delivery before auto-release.
- Keep `disputeWindowSeconds` **less than** `ttlSeconds` so auto-claim can occur before deal expiry.
- For unknown payees, use shorter dispute windows only if the payer monitors `get_settlement_status` actively.

## Related docs

- [On-chain flows](../architecture/on-chain-flows.md)
- [DealEscrow](../contracts/DealEscrow.md)
- [Upgrade strategy](../contracts/upgrade-strategy.md)
