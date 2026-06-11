# Agent Skill integration

The **Pharos Settle Skill** is a standardized skill module at `skills/trusted-agent-settlement/` — *Stripe Checkout for AI agents on Pharos*, with **ghost protection** when agents hire each other.

| Field | Value |
|-------|-------|
| Skill name | `trusted-agent-settlement` |
| Repo path | `skills/trusted-agent-settlement/SKILL.md` |
| MCP tools | **16** (documented in SKILL.md; same list as [MCP README](../mcp/README.md)) |
| npm package | `pharos-trusted-settlement` |

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

See [SKILL.md](../../skills/trusted-agent-settlement/SKILL.md) for a copy-paste `input` object.

## Multi-IDE

- Portable agent gate: [AGENTS.md](../../AGENTS.md)
- MCP config per IDE: [other-ides.md](../mcp/other-ides.md)
- After `npm run setup`: copy `.pharos-settle/mcp.generated.json` into Claude Desktop / other MCP clients

## Install

Copy the **directory** (not just `SKILL.md`) into your agent's skills folder:

```bash
cp -r skills/trusted-agent-settlement ~/.cursor/skills/trusted-agent-settlement

# Project-scoped (committed with repo)
mkdir -p .cursor/skills && cp -r skills/trusted-agent-settlement .cursor/skills/
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
| Skill / MCP | 16 tools — see [roles](../mcp/roles.md) |
| SDK ergonomic | `trustedAgentSettlement.ts` |
| Primitives | `steps.ts` — `preflight`, `submitDelivery`, `claimDeal`, … |

Canonical mapping, patterns, and guarantees: [SKILL.md](../../skills/trusted-agent-settlement/SKILL.md).

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

### Option A: MCP (recommended for Cursor)

Plug in MCP server — **16 tools**; payer/payee split or demo shortcuts.

See [MCP setup](../mcp/setup.md) and [roles](../mcp/roles.md).

### Option B: TypeScript SDK

```typescript
import {
  simulateTrustedSettlement,
  executeTrustedSettlement,
} from "pharos-trusted-settlement";
```

See [SDK README](../sdk/README.md).

### Option C: Composable steps

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
