# Agent Skill integration

The **Pharos Settle Skill** follows the [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine) layout at the **repo root** — *Stripe Checkout for AI agents on Pharos*, cast-first with MCP support.

| Field | Value |
|-------|-------|
| Skill name | `trusted-agent-settlement` |
| Entry | [`SKILL.md`](../../SKILL.md) |
| Assets | `assets/` (networks, tokens, deployments) |
| References | `references/` (cast preferred, MCP optional) |
| MCP tools | **17** — [MCP README](../mcp/README.md), [`references/mcp.md`](../../references/mcp.md) |
| npm package | `pharos-trusted-settlement` |

## Progressive execution

Agents follow a 4-tier ladder: **cast → npm scripts → MCP → setup guidance**. If cast cannot fully express a workflow, escalate upward — MCP is never auto-enabled. Full matrix: [`references/execution.md`](../../references/execution.md).

## Workflow parameters

Every integration uses the same inputs — swap values for your agents, tokens, and tasks:

| Parameter | SDK / MCP field | Notes |
|-----------|-----------------|-------|
| Payer | `agentA` | Payer wallet |
| Payee | `agentB` | Worker wallet |
| Token | `token` | From `deployments/atlantic.json` → `allowedTokens` |
| Amount | `amount` | **Wei** string (respect token decimals) |
| Task id | `workDescription` | Stable identifier; must match at delivery |
| Network | `deploymentNetwork` | `atlantic` or `localhost` |
| Mode | `mode` | `cooperative` or `safetyNet` |
| Batch | `batchMode` | `saliFast` or `hybridWork` |

See [`references/settlement.md`](../../references/settlement.md) for cast and MCP fund flows.

## Multi-IDE

- Portable agent gate: [AGENTS.md](../../AGENTS.md)
- MCP config per IDE: [other-ides.md](../mcp/other-ides.md)
- After `npm run setup`: copy `.pharos-settle/mcp.generated.json` into Claude Desktop / other MCP clients

## Install

Copy the **Skill Engine bundle** into your agent's skills folder:

```bash
npm run skill:sync

# Or manually:
mkdir -p ~/.cursor/skills/trusted-agent-settlement
cp SKILL.md ~/.cursor/skills/trusted-agent-settlement/
cp -r assets references ~/.cursor/skills/trusted-agent-settlement/
```

## When to use

Triggers (from SKILL frontmatter):

- "pay agent on pharos"
- "agent commerce"
- "safe agent payment"
- "agent escrow"

## Modes

| Mode | Flow |
|------|------|
| `cooperative` | onboard → fund → deliver → attest → claim |
| `safetyNet` | reclaim when payee never delivered |

## Composability design

Pharos Settle exposes **two composability layers**: an ergonomic **Skill/MCP layer** for agents, and **lower-level primitives** (`pharos-trusted-settlement/steps`) for developers building custom workflows.

| Layer | Surface |
|-------|---------|
| Cast (tier 1) | `cast send` / `cast call` — [settlement.md](../../references/settlement.md) Method A |
| npm scripts (tier 2) | `pay:once`, `demo:judge`, `batch:fund` — SDK CLI wrappers |
| MCP (tier 3) | 17 tools — see [roles](../mcp/roles.md) |
| SDK ergonomic | `trustedAgentSettlement.ts` |
| Primitives | `steps.ts` — `preflight`, `submitDelivery`, `claimDeal`, … |

Canonical mapping: [SKILL.md](../../SKILL.md) Capability Index and [`references/settlement.md`](../../references/settlement.md).

### Composable guarantees

| Guarantee | Why it matters |
|-----------|----------------|
| **`nextAction` driven** | Agents loop without hardcoded flow logic |
| **`dealId` handoff** | Payer and payee in separate processes |
| **`preflightHash` audit log** | Simulate checks hashed and stored on-chain (off-chain verifiable) |
| **`reject_delivery`** | Payer can refund junk delivery during dispute window |
| **`resultHash` delivery** | Work proof without revealing full details |
| **MCP / SDK parity** | Same workflow via tools or code |

## Batch payments

For N parallel agent payments, use `saliFast` (fund+claim) or `hybridWork` (full deliver+attest+claim). Two MCP agents hand off a `manifest` between payer and payee.

See [SALI FastPay](../mcp/batch-sali.md) and the Skill's batch section.

## Integration options

Follow the execution ladder: **cast → npm scripts → MCP → setup**. See [`references/execution.md`](../../references/execution.md).

### Option A: Cast (tier 1 — default)

Foundry `cast` / `forge` for atomic on-chain ops. See [`references/settlement.md`](../../references/settlement.md) Method A and [`references/query.md`](../../references/query.md).

### Option B: npm scripts (tier 2 — SDK CLI)

```bash
npm run demo:judge                              # mock — no keys
npm run pay:once -- --payee 0x... --amount 1 --work "task"
npm run batch:fund -- --payees 0xA,0xB --amount 1 --work-prefix "batch"
```

Wraps the SDK; reads `.env`. See [SDK README](../sdk/README.md) § One-shot CLI.

### Option C: MCP (tier 3)

Plug in MCP server — **17 tools**; payer/payee split or demo shortcuts. Only when npm is insufficient or user requests MCP.

See [MCP setup](../mcp/setup.md) and [roles](../mcp/roles.md).

### Option D: TypeScript SDK import

```typescript
import {
  simulateTrustedSettlement,
  executeTrustedSettlement,
} from "pharos-trusted-settlement";
```

See [SDK README](../sdk/README.md).

### Option E: Composable steps

```typescript
import { preflight, settle, prove } from "pharos-trusted-settlement/steps";
```

For custom pipelines — see [Off-chain pipeline](../architecture/off-chain-pipeline.md).

## Supported tokens (Atlantic)

TEST + USDC, USDT, WBTC, WETH, WPHRS after seeding.

See `deployments/atlantic.json` → `allowedTokens`.

## Example prompts

1. "Pay the scraping agent 1 TEST on Pharos for competitor pricing data"
2. "Trading agent: pay risk-analysis agent for VaR before executing"
3. "DAO assistant: pay summarizer for proposal brief — simulate first"
4. "SALI FastPay: batch payroll 100 labeling microtasks to worker agents"
5. "Reclaim deal 42 — worker agent never delivered"

## Do not duplicate

Keep `SKILL.md` as the concise agent-facing doc. This handbook provides depth; the Skill provides triggers and quick API reference.

## Related docs

- [Getting started → Atlantic](../getting-started/quickstart-atlantic.md)
- [Glossary](../glossary.md)
