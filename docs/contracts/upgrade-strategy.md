# Contract upgrade strategy

Phase 1 ships **immutable** contracts — no transparent proxy or UUPS upgrade path. This document explains how the project evolves without breaking integrators unexpectedly.

## Phase 1 (current)

| Component | Pattern |
|-----------|---------|
| `DealEscrow` | Immutable; holds funds and state machine |
| `SettlementRouter` | Immutable; public entrypoint with payer/payee caller checks |
| `AgentRegistry` / `TokenAllowlist` | Owner-configured; separate from escrow lifecycle |
| Deployments | Versioned in `deployments/{network}.json` (e.g. [atlantic.json](../../deployments/atlantic.json)) |

Integrators should **pin** the deployment manifest version that matches their SDK package semver.

## When a loophole is found

1. Patch contracts (e.g. `rejectDelivery` for junk-delivery protection).
2. Deploy new `DealEscrow` + `SettlementRouter` to the target network.
3. Wire router on escrow via `setRouter`.
4. Update `deployments/{network}.json` with new addresses and redeploy date.
5. Bump package minor/patch version; document breaking address change in release notes.

**Existing deals** on the old escrow address continue until released, reclaimed, or refunded — they are not migrated automatically.

## Phase 2 extension pattern (planned)

Phase 2 features (disputes, marketplace, reputation) will **extend** Phase 1 rather than replace it in place:

| Planned module | Integration |
|----------------|-------------|
| `DisputeModule` | New contract; router v2 or adapter delegates dispute flows |
| `AgentMarketplace` | Job discovery layered on settlement deals |
| Router v2 | Optional new entrypoint; Phase 1 router remains for in-flight deals |

No transparent upgrade proxy is planned for Phase 1 contracts. New capabilities ship as **new deployments** with explicit migration docs.

## Integrator checklist

- Read `deployments/atlantic.json` (or your network file) at startup — do not hardcode addresses from old README snippets.
- Match SDK package version to deployment manifest `version` field.
- After redeploy, re-run `npm run seed:pharos` (or equivalent) for registry/allowlist on new stack if needed.
- Monitor release notes for address changes before live settlement.

## Related docs

- [PHASES.md](../PHASES.md) — Phase 1 vs Phase 2 roadmap
- [Deployment](../deployment/README.md)
- [Threat model](../security/threat-model.md)
