# Architecture overview

## Agent commerce state machine

Agents interact through **two modes** plus `nextAction` hints. On-chain logic supports richer paths underneath.

```
fund → deliver → attest → claim     (cooperative fast path)
fund → deliver → wait → claim       (ghost payer auto-release)
fund → (no delivery) → reclaim      (ghost payee / safety net)
```

## Layers

| Layer | Components |
|-------|------------|
| **Consumers** | Agents with Skill, MCP clients (Cursor), TypeScript apps |
| **Public surface** | `trustedAgentSettlement.ts`, `steps.ts`, `mcp/server.ts` |
| **Off-chain pipeline** | preflight → onboard → settle → prove |
| **On-chain** | SettlementRouter → DealEscrow, AgentRegistry, TokenAllowlist |

## Public API (Layer 1)

`trustedAgentSettlement.ts` — ergonomic wrappers with `nextAction` and typed outputs:

| Area | Exports |
|------|---------|
| Simulate / execute | `simulateTrustedSettlement`, `executeTrustedSettlement` |
| Per-step (MCP parity) | `fundDealSettlement`, `submitDeliveryForDeal`, `attestReleaseForDeal`, `completeClaimForDeal` |
| Status / reclaim | `getSettlementStatus`, `reclaimTrustedSettlement` |
| Onboard | `registerRecipients`, `registerRecipient` |
| Batch | `executeBatchSettlement`, `fundDealsBatch`, `submitDeliveriesBatch`, `attestReleasesBatch`, `claimDealsBatch` |
| Readiness | `getAgentReadinessStatus`, `resultHashFromWork` |

Also re-exports low-level `fundDeal`, `submitDeliveryWithHash`, `attestReleaseWithHash` for custom pipelines.

## Composable API (Layer 2)

Import: `pharos-trusted-settlement/steps` → `src/steps.ts` (re-exports from `src/internal/`).

Primitives for custom orchestrators — same workflow as MCP tools. Status polling and simulate-first `nextAction` before a deal exists stay on **Layer 1** (`getSettlementStatus`, `simulateTrustedSettlement`).

| Export | Module | Description |
|--------|--------|-------------|
| `preflight` | preflight | Readiness checks + `preflightHash` |
| `getFeeQuote` | commerce | Protocol fee estimate |
| `prove` | prove | Post-claim receipt (or SPV) verification |
| `registerRecipient` / `registerRecipients` | onboard | Payer-sponsored payee registration |
| `fundDeal` | settle | Payer fund (pass `preflightHash` from `preflight`) |
| `settle` | settle | Full fund → deliver → attest → claim orchestrator |
| `reclaimDeal` | settle | Payer on-chain reclaim |
| `submitDelivery` / `submitDeliveryWithHash` | settle/delivery | Payee delivery (`workDescription` or `resultHash`) |
| `attestRelease` / `attestReleaseWithHash` | settle/delivery | Payer attestation (hash must match delivery) |
| `claimDeal` | settle/delivery | Payee claim (supply `proofHash`) |
| `readCanClaim` | settle/delivery | View `canClaim` before claiming |
| `resultHashFromWork` | settle/delivery | `keccak256('delivery:' + workDescription)` |
| `executeBatchSettlement` | settle/batch | Full batch orchestrator (`saliFast` / `hybridWork`) |
| `fundDealsBatch` | settle/batch | Payer fund N deals → returns **`manifest`** |
| `submitDeliveriesBatch` | settle/batch | Payee deliver N (`hybridWork`) |
| `attestReleasesBatch` | settle/batch | Payer attest N (`hybridWork`) |
| `claimDealsBatch` | settle/batch | Payee claim N — consumes **`manifest`** from `fundDealsBatch` |
| `getAgentReadiness` | agent | Role + allowed tools (`payer` / `payee` / `demo` / `mock`) |
| `detectAgentRole` | agent | Env-key role detection |
| `allowedToolsForRole` | agent | Tool list for a role |

**Exported types:** `BatchSettlementOutput`, `BatchFundOutput`, `BatchDeliveryOutput`, `BatchAttestOutput`, `BatchClaimOutput`, `BatchDealResult`.

See also [SDK API reference](../sdk/api-reference.md#layer-2--stepsts).

## On-chain contracts

**Why four contracts?** Four contracts is deliberate separation of concerns, not complexity for its own sake: **SettlementRouter** enforces access, **DealEscrow** owns state and funds, **AgentRegistry** separates identity from payment logic, and **TokenAllowlist** keeps the attack surface minimal.

| Contract | Role |
|----------|------|
| [SettlementRouter](../contracts/SettlementRouter.md) | Entrypoint, access control on deliver/attest |
| [DealEscrow](../contracts/DealEscrow.md) | Escrow, fees, hybrid release state |
| [AgentRegistry](../contracts/AgentRegistry.md) | Registered agents + payer-sponsored onboarding |
| [TokenAllowlist](../contracts/TokenAllowlist.md) | Allowed ERC-20 tokens |

Hybrid deal fields: `requiresHybridRelease`, `deliverySubmittedAt`, `disputeWindow`, `payerAttested`.

Fees: `feeBps` on successful `claim` only; reclaim is fee-free.

## Off-chain pipeline

1. **Preflight** — registry, allowlist, balance, allowance
2. **Onboard** (optional) — `registerRecipients` for unregistered payees
3. **Settle** — `fundAndAcceptHybrid` → `submitDelivery` → `attestRelease` → `claim`
4. **Prove** — receipt verification (default) or Pharos SPV

See [Off-chain pipeline](off-chain-pipeline.md).

## MCP

stdio server (`npm run mcp`): **16 tools** (per-step + batch), resources (`pharos://deployments/atlantic`), prompts. See [MCP architecture](../mcp/architecture.md) and [composable patterns](../../skills/trusted-agent-settlement/SKILL.md#composable-patterns).

## Deferred (Phase 2)

**⚠️ Planned — not implemented.** See **[Phase 1 vs Phase 2](../PHASES.md)** for full roadmap.

- `dispute` + owner `resolveDispute` arbitration
- Marketplace / reputation (Agent Arena)

## Related docs

- [On-chain flows](on-chain-flows.md)
- [Data model](data-model.md)
- [Glossary](../glossary.md)
