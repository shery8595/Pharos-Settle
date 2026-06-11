# What's novel about Pharos Settle

Pharos Settle is **not** generic escrow with a README. The novelty is an **agent commerce layer** on Pharos Atlantic: simulate-first flows, `nextAction` loops, dual-ghost protection, manifest handoff for split identities, and SALI FastPay batch payroll — exposed through **17 MCP tools** and a portable **Skill**. **v1.2.0** adds auditable rejection (`reasonHash`) and optional per-deal arbiter disputes.

> **Terminology:** **Dual-ghost protection** is the umbrella term (payee ghosts + payer ghosts + junk delivery rejection). Escrow mechanics exist elsewhere; what ships here is the agent-native orchestration surface.

---

## Five named primitives

| Primitive | What it is | Why agents care |
|-----------|------------|-----------------|
| **Dual-ghost protection** | Payee ghosts → payer reclaims. Payer ghosts → payee still paid (auto-release + claim). Junk delivery → payer safety valve during dispute window (cooperative review). | Phase 1 cooperative settlement; Phase 2 adds neutral arbitration — see [threat-model.md](security/threat-model.md). |
| **`nextAction` loops** | Every simulate/status call returns one hint: `fund`, `deliver`, `attest`, `claim`, `reclaim`, `wait`, `done`. | Agents poll instead of hardcoding multi-step state machines. |
| **`preflightHash` audit log** | Simulated checks are hashed deterministically by SDK/MCP and stored on-chain when the deal is funded. | Off-chain verifiable audit trail — contracts do **not** enforce the hash (Phase 1). |
| **Manifest handoff** | `fund_deals_batch` returns a manifest; payee MCP claims only its rows (`complete_claims_batch`). | One MCP = one wallet identity; production split payer/payee without mixing keys. |
| **SALI FastPay** | `batchMode: saliFast` — parallel fund+claim on Pharos Atlantic (`maxParallelInBlock` > 1). | Batch agent payroll (labeling coordinators → N workers) in one block. |

---

## Why this is not just escrow

| Approach | Agent-native API | Ghost payee (no delivery) | Ghost payer (no attest) | Junk delivery | Simulate-first | Split identity (payer MCP ≠ payee MCP) | Batch payroll |
|----------|------------------|---------------------------|-------------------------|---------------|----------------|----------------------------------------|---------------|
| Raw token transfer | ❌ | ❌ | ❌ | ❌ | ❌ | N/A | Manual N txs |
| Generic escrow contract | ❌ | Maybe (manual) | Maybe (manual) | ❌ | ❌ | ❌ | Manual |
| x402 / API pay-per-call | HTTP-centric | ❌ | ❌ | ❌ | Partial | ❌ | Per-request |
| **Pharos Settle** | ✅ Skill + 17 MCP tools + SDK | ✅ `reclaim_trusted_settlement` | ✅ auto-release + claim | ✅ `reject_delivery` + reasonHash; optional arbiter | ✅ `simulate_trusted_settlement` | ✅ manifest handoff | ✅ SALI FastPay |

**Honest boundary:** Time-locked escrow and refund-after-deadline are not new on-chain ideas. What **is** new here is packaging them for **autonomous agents**: `nextAction` hints, MCP tool parity, ghost demos you can run in mock in under 60s, and Atlantic live proof.

---

## Proof artifacts

| Artifact | Link |
|----------|------|
| Contract tests | `npm test` — 145 tests (50 Hardhat + 95 Vitest) — [docs/tests/README.md](tests/README.md) |
| Ghost payee demo | `npm run demo:ghost-payee:simulate` — [examples/ghost-payee.md](examples/ghost-payee.md) |
| Ghost payer demo | `npm run demo:ghost-payer:simulate` — [examples/ghost-payer.md](examples/ghost-payer.md) |
| SALI batch demo | `npm run demo:batch:simulate` — [examples/batch-pipeline.md](examples/batch-pipeline.md) |
| Threat model | [docs/security/threat-model.md](security/threat-model.md) |
| Live Atlantic deploy | [deployments/atlantic.json](../deployments/atlantic.json) · [atlantic.pharosscan.xyz](https://atlantic.pharosscan.xyz) |
| MCP tools (canonical list) | [docs/mcp/README.md](mcp/README.md) |
| Demo commands (canonical) | [docs/examples/demos.md](examples/demos.md) |
| Roadmap Phase 2 | [docs/PHASES.md](PHASES.md) — marketplace, reputation *(not shipped)* |

---

## Related docs

- [SUBMISSION.md](../SUBMISSION.md) — hackathon entry + DoraHacks copy-paste
- [JUDGES.md](../JUDGES.md) — mock demo first (no keys)
- [SKILL.md](../SKILL.md) + [references/settlement.md](../references/settlement.md) — agent-facing Skill Engine
