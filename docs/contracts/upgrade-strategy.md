# Contract upgrade strategy

Phase 1 ships **immutable** contracts — no transparent proxy or UUPS upgrade path. This document explains how the project evolves without breaking integrators unexpectedly.

## Phase 1 (current)

| Component | Pattern |
|-----------|---------|
| `DealEscrow` | Immutable; holds funds and state machine |
| `SettlementRouter` | Immutable; public entrypoint with payer/payee/arbiter caller checks |
| `AgentRegistry` / `TokenAllowlist` | Owner-configured; separate from escrow lifecycle |
| Deployments | Versioned in `deployments/{network}.json` (e.g. [atlantic.json](../../deployments/atlantic.json)) |

Integrators should **pin** the deployment manifest version that matches their SDK package semver.

## v1.2.0 (2026-06-11)

| Change | Notes |
|--------|-------|
| `rejectDelivery(dealId, reasonHash)` | Required non-zero `reasonHash`; cooperative deals still instant refund |
| Optional `arbiter` on `fundAndAcceptHybrid` | Non-zero arbiter → reject opens `Disputed` instead of refund |
| `resolveDispute` | Arbiter-only: release, refund, or split (fee on payee share) |
| `DealState` | Inserted `Disputed` at index 3 — `Released`=4, `Refunded`=5 |

Atlantic addresses updated in `deployments/atlantic.json` (`version: "1.2.0"`). v1.1.1 escrow/router deals remain on old contracts until terminal.

## v1.3.0 (2026-06-11)

| Change | Notes |
|--------|-------|
| Payer-only funding | `settle`, `fundAndAccept`, `fundAndAcceptHybrid` require `msg.sender == payer` |
| Hybrid timing guard | `createDeal` reverts if `disputeWindow >= ttlSeconds` when hybrid release is enabled |
| SDK defaults | TTL 7d (`604800`), dispute window 3d (`259200`); preflight checks `disputeWindow < ttl` |

Atlantic addresses in `deployments/atlantic.json` (`version: "1.3.0"`). v1.2.0 escrow/router deals remain on old contracts until terminal.

## When a loophole is found

1. Patch contracts (e.g. auditable rejection, arbiter disputes).
2. Deploy new `DealEscrow` + `SettlementRouter` to the target network.
3. Wire router on escrow via `setRouter`.
4. Update `deployments/{network}.json` with new addresses and redeploy date.
5. Bump package minor/patch version; document breaking address change in release notes.

**Existing deals** on the old escrow address continue until released, reclaimed, or refunded — they are not migrated automatically.

## Phase 2 extension pattern (planned)

Phase 2 features (reputation, marketplace, bonds, commit-reveal delivery) will **extend** v1.2 rather than replace it in place:

| Planned module | Integration |
|----------------|-------------|
| Reputation indexer | Off-chain index of `DeliveryRejected` + dispute outcomes |
| `AgentMarketplace` | Job discovery layered on settlement deals |
| Rejection bonds / commit-reveal | Additional contract or router v3 |

Lightweight per-deal arbiter disputes ship **in** `DealEscrow` v1.2 — not a separate `DisputeModule`. Full neutral arbitration panels and marketplace discovery remain Phase 2.

No transparent upgrade proxy is planned. New capabilities ship as **new deployments** with explicit migration docs.

## Integrator checklist

- Read `deployments/atlantic.json` (or your network file) at startup — do not hardcode addresses from old README snippets.
- Match SDK package version to deployment manifest `version` field.
- After redeploy, re-run `npm run seed:pharos` (or equivalent) for registry/allowlist on new stack if needed.
- Pass `reason` or `reasonHash` to `reject_delivery` / `rejectDeliveryForDeal`.
- Use `arbiter: 0x0` for cooperative demos; set arbiter for adversarial payments.
- Monitor release notes for address changes before live settlement.

## Related docs

- [PHASES.md](../PHASES.md) — Phase 1 vs Phase 2 roadmap
- [Deployment](../deployment/README.md)
- [Threat model](../security/threat-model.md)
