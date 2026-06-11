# Pharos Settle

**Stripe Checkout for AI agents on Pharos** — a trust layer for agents that hire each other.

[![Tests](https://img.shields.io/badge/tests-145-brightgreen)](#tests) [![Chain](https://img.shields.io/badge/chain-Pharos%20Atlantic%20(688689)-blue)](deployments/atlantic.json) [![Phase](https://img.shields.io/badge/phase-1%20shipped-success)](docs/PHASES.md)

> **Agent-to-agent work settlement with ghost protection.**  
> Payee ghosts → payer reclaims. Junk delivery → payer safety valve. Payer ghosts → payee still gets paid. Both behave → instant settlement.

> **v1.2.0:** Cooperative rejection requires auditable `reasonHash`. Optional **arbiter** at fund time freezes funds on reject until `resolve_dispute`. Phase 2 adds reputation indexing, marketplace, and bonds — not trustless oracle panels.

### Reusable surfaces

```mermaid
flowchart TB
  subgraph surfaces [Reusable surfaces]
    Skill[Agent_Skill]
    MCP[MCP_17_tools]
    SDK[TypeScript_SDK]
  end
  subgraph chain [Pharos Atlantic]
    Router[SettlementRouter]
    Escrow[DealEscrow]
    Registry[AgentRegistry]
    Allowlist[TokenAllowlist]
  end
  Skill --> MCP
  MCP --> SDK
  SDK --> Router
  Router --> Escrow
```

**Hackathon judges:** `npm run demo:judge` (mock, no keys) · [JUDGES.md](JUDGES.md) · [SUBMISSION.md](SUBMISSION.md)

### What's novel

- **Dual-ghost protection** — both safety nets + junk-delivery reject with mock demos in &lt;60s
- **`nextAction` loops** — agents poll one hint, not hardcoded flows
- **`preflightHash` audit log** — simulate checks hashed and stored on-chain (off-chain verifiable)
- **Manifest handoff** — split payer/payee MCP identities
- **SALI FastPay** — parallel batch agent payroll on Atlantic

→ [docs/WHATS-NOVEL.md](docs/WHATS-NOVEL.md)

**Any IDE → [AGENTS.md](AGENTS.md)** · [MCP other IDEs](docs/mcp/other-ides.md)

### Workflow parameters

Reuse the same flow for any payer, payee, token, or task — demos are just one filled-in example.

| Parameter | Field | Example |
|-----------|-------|---------|
| Payer | `agentA` | `PRIVATE_KEY` wallet |
| Payee | `agentB` | Worker address |
| Token | `token` | TEST / USDC / USDT / WBTC / WETH / WPHRS — [`deployments/atlantic.json`](deployments/atlantic.json) |
| Amount | `amount` (wei) | `10000000000000000000` = 10 TEST |
| Task | `workDescription` | `competitor-pricing-crawl-2026-06` |
| Network | `deploymentNetwork` | `atlantic` (default) or `localhost` |
| Mode | `mode` | `cooperative` \| `safetyNet` |

### Who hires whom

| Scenario | Payer agent | Payee agent | What gets settled |
|----------|-------------|-------------|-----------------|
| Market intel | Research agent | Scraping agent | Competitor pricing crawl delivered on-chain |
| Pre-trade check | Trading agent | Risk-analysis agent | VaR report before order execution |
| DAO ops | DAO assistant | Summarizer agent | Proposal brief before vote deadline |
| Microtask payroll | Labeling coordinator | 100 worker agents | **SALI FastPay** — batch fund+claim in parallel blocks |

### Agent economy primitive

```mermaid
flowchart LR
  A[Agent_A_hires] --> B[Agent_B]
  B --> E[Escrow_fund]
  E --> D[Delivery_hash]
  D --> AT{Attest_or_timeout}
  AT -->|Payer_attests| CL[Claim_release]
  AT -->|Payer_ghosts| AR[Auto_release_claim]
  AT -->|Payee_ghosts| RC[Reclaim_refund]
  AT -->|Junk_delivery| RJ[Reject_reasonHash]
  RJ --> DONE
  CL --> DONE[Settlement_done]
  AR --> DONE
  RC --> DONE
```

Reusable on Pharos Atlantic: four contracts, one state machine, Skill + 17 MCP tools.

### Example agent transcript

```
User:     Pay 1 TEST to the research agent if it delivers the market report.
Pharos Settle: Preflight passed. Fee: 0.5%. nextAction: fund.
Research: Delivery submitted (resultHash bound to report).
Pharos Settle: Payer attested. Claim complete. dealId=42 · PharosScan ✓
```

---

## What this is

| Piece | Description |
|-------|-------------|
| **Contracts** | SettlementRouter · DealEscrow · AgentRegistry · TokenAllowlist |
| **SDK** | `simulateTrustedSettlement` / `executeTrustedSettlement` + `nextAction` hints |
| **MCP** | `npm run mcp` — 17 tools; payer/payee split + batch (`saliFast` / `hybridWork`) |
| **Skill** | [`skills/trusted-agent-settlement/`](skills/trusted-agent-settlement/SKILL.md) — Pharos Settle Skill module (17 MCP tools) |

**Why four contracts?** [SettlementRouter enforces access, DealEscrow owns state and funds, AgentRegistry separates identity from payment logic, TokenAllowlist keeps the attack surface minimal.](docs/architecture/overview.md#on-chain-contracts)

```typescript
import { simulateTrustedSettlement, executeTrustedSettlement } from "./src/trustedAgentSettlement.js";

const sim = await simulateTrustedSettlement(input, { mode: "cooperative" });
console.log(sim.nextAction, sim.feeQuote); // fund | deliver | attest | claim | done

if (sim.stages.preflight.ready) {
  await executeTrustedSettlement(input, { mode: "cooperative", autoOnboardRecipients: true });
}
```

---

## Quick start (< 2 minutes)

**Judges (no keys):** `npm run demo:judge` — see [JUDGES.md](JUDGES.md).

**Live Atlantic:** Both demo wallets are pre-registered — clone, add keys to `.env`, run `npm run demo:pharos`.

```bash
npm run setup          # install, build, skill + MCP mode (project or global)
# Project: open this repo as workspace root → Reload MCP
# Global: paste .pharos-settle/mcp-bin.generated.json into Cursor global MCP
cp .env.example .env   # PRIVATE_KEY + AGENT_B_PRIVATE_KEY
npm run demo:pharos    # first time only: deploy:pharos && seed:pharos once before this
```

Deploy from scratch:

```bash
npm run deploy:pharos
npm run seed:pharos    # registers both .env wallets + allows TEST + Atlantic tokens
npm run demo:pharos
```

---

## Live on Pharos Atlantic

Addresses in [`deployments/atlantic.json`](deployments/atlantic.json) (on-chain verified).

| Contract | Address |
|----------|---------|
| SettlementRouter | `0xb5291b7342a6588ba675b08be7cebc7c6e547bdb` |
| DealEscrow | `0xff528f1ee4cb5a22d68d1c9f29bf70ca4c4197d1` |
| AgentRegistry | `0x42aff253e3e07d8b1a7a54aafd72cf9dbafeaa5d` |
| TokenAllowlist | `0x9d8e069ce233e2c14b5a6194784043b73d51299a` |
| TEST token | `0xf32692cc87145bb9b9892ca449fee889363ebe26` |

Explorer: [atlantic.pharosscan.xyz](https://atlantic.pharosscan.xyz) · RPC: `https://atlantic.dplabs-internal.com`

---

## Demos

| Command | What it shows |
|---------|----------------|
| `npm run demo:pharos` | End-to-end cooperative settlement on Atlantic |
| `npm run demo:simulate` | Preflight + fee quote (no gas) |
| `npm run demo:batch` | SALI batch (`saliFast`, BATCH_SIZE=5) |
| `npm run demo:batch:simulate` | Batch flow in mock mode |
| `npm run demo:batch:split` | Two-agent batch handoff (saliFast or hybridWork) |
| `npm run demo:ghost-payee` | Payer reclaims when payee ghosts |
| `npm run demo:ghost-payee:simulate` | Ghost payee mock (no keys) |
| `npm run demo:ghost-payer` | Payee paid after payer ghosts |
| `npm run demo:ghost-payer:simulate` | Ghost payer mock (no keys) |
| `npm run demo:agent` | Generic agent uses Skill (no settlement code) |
| `npm run demo:pipeline` | Composable Layer 2 pipeline |

Full list: [docs/examples/demos.md](docs/examples/demos.md) · `demo:reclaim` → `demo:ghost-payee`.

## MCP (plug-and-play agents)

```bash
npm run mcp
```

Cursor setup: [docs/mcp/setup.md](docs/mcp/setup.md)

**Plug in as payer or payee** — one key per MCP. See [docs/mcp/setup.md](docs/mcp/setup.md) and [docs/mcp/roles.md](docs/mcp/roles.md).

**Tools (16):** single-payment + batch — see [docs/mcp/batch-sali.md](docs/mcp/batch-sali.md) for `saliFast` vs `hybridWork`

```bash
npm run agent:doctor        # readiness check
npm run agent:doctor:mock   # no keys
```

Legacy HTTP bridge: `npm run mcp:http`

---

## Ghost protection & settlement modes

| Who ghosts? | Outcome |
|-------------|---------|
| Payee never delivers | Payer **reclaims** (`safetyNet`) |
| Payer never attests | Payee **still gets paid** (auto-release) |
| Junk delivery (cooperative) | Payer **reject_delivery** + `reason` → instant refund |
| Adversarial payment | Fund with **arbiter** → reject opens dispute → arbiter **resolve_dispute** |
| Both cooperate | **Instant settlement** — fund → deliver → attest → claim |

`getSettlementStatus` returns `nextAction` so agents always know the single next step.

---

## Why Pharos

- **Sub-second finality** — measured on every settlement
- **SALI FastPay** (*batch agent payroll*) — one payer, many worker agents, parallel settlement on Atlantic; `saliFast` mode lands N fund+claim txs in the same block (`npm run demo:batch`)
- **Batch agent commerce** — `hybridWork` runs full deliver→attest→claim at scale across two MCP agents (`npm run demo:batch:split`)
- **Payer-sponsored onboarding** — `registerRecipients` before first payment
- **Registered agents + allowlisted tokens + hybrid escrow**

```bash
# Production CLI — payer funds, payees claim from manifest
npm run batch:fund -- --payees 0xA,0xB --amount 1 --work-prefix payroll
npm run batch:claim -- --manifest .pharos-settle/batch-manifest-....json

# Demo only — both keys in one process
npm run pay:batch -- --payee 0x... --count 5 --amount 1
```

```typescript
import { fundDealsBatch, claimDealsBatch, filterManifestForPayee, manifestToClaims } from "./src/trustedAgentSettlement.js";

const funded = await fundDealsBatch(jobs, { batchMode: "saliFast", payerSigner: PRIVATE_KEY });
// hand off funded.manifest — each payee MCP filters and claims its rows
const { matched } = filterManifestForPayee(funded.manifest, payeeAddress);
await claimDealsBatch(manifestToClaims(matched), { payeeSigner: AGENT_B_KEY });
```

---

## Tests

```bash
npm test   # 145 tests — 50 Hardhat + 95 Vitest (Atlantic smoke needs seeded wallets)
```

| Tier | Path |
|------|------|
| Contracts | `test/contracts/` |
| SDK integration | `test/integration/` |
| Unit | `test/unit/` |
| MCP | `test/mcp/` |
| Atlantic smoke | `test/atlantic/` |

---

## Documentation

| Doc | Purpose |
|-----|---------|
| **[JUDGES.md](JUDGES.md)** | Judge quickstart (mock first) |
| **[SUBMISSION.md](SUBMISSION.md)** | Full submission + DoraHacks |
| **[docs/README.md](docs/README.md)** | Full handbook |
| **[docs/mcp/batch-sali.md](docs/mcp/batch-sali.md)** | SALI FastPay — batch agent payroll |
| **[docs/PHASES.md](docs/PHASES.md)** | Phase 1 (shipped) vs Phase 2 (planned) |
| **[skills/.../SKILL.md](skills/trusted-agent-settlement/SKILL.md)** | Agent Skill — composable patterns + step table |

**Composable API (Layer 2):**

```typescript
import { preflight, settle, prove, submitDelivery, attestRelease } from "./src/steps.js";
```

---

*Repo / package name: `pharos-trusted-settlement` · Pharos Atlantic testnet · Pharos Settle Skill*
