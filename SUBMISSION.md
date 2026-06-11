# Pharos Settle — Hackathon submission

**Judges → start with [JUDGES.md](JUDGES.md)** (mock demo first, no keys).

**Stripe Checkout for AI agents on Pharos** · Agent-to-agent work settlement with **ghost protection**.

**Package:** `pharos-trusted-settlement` · **Network:** Pharos Atlantic (`688689`) · **Tests:** 103 green

### What's novel

- **Dual-ghost protection** — payee ghosts → reclaim; payer ghosts → auto-release claim
- **`nextAction` loops** — agents poll one hint instead of hardcoding flows
- **`preflightHash` binding** — funded deal tied to simulate checks
- **Manifest handoff** — split payer/payee MCPs without mixing keys
- **SALI FastPay** — parallel batch agent payroll on Atlantic

→ Full comparison: [docs/WHATS-NOVEL.md](docs/WHATS-NOVEL.md)

---

## Shipped vs planned

| ✅ Shipped (Phase 1) | ⚠️ Not shipped (Phase 2) |
|----------------------|--------------------------|
| Smart contracts (4 + TEST token) | Agent marketplace |
| TypeScript SDK | Reputation scores |
| MCP server — 15 tools | On-chain arbitration |
| Agent Skill module | |
| Live Atlantic deployment | |
| 103 tests | |

Roadmap detail: [docs/PHASES.md](docs/PHASES.md)

---

## What it is (human terms)

One AI agent hires another. Money locks in escrow until work is proven. Then pay, timeout-pay, or refund.

**Ghost protection:**

| If… | Then… |
|-----|-------|
| Worker never delivers | Payer gets money back |
| Payer disappears after delivery | Worker still gets paid |
| Both cooperate | Instant settlement |

### Workflow parameters (swap these)

| Parameter | Field | Example |
|-----------|-------|---------|
| Payer | `agentA` | Funded Atlantic wallet |
| Payee | `agentB` | Worker address |
| Token | `token` | TEST / USDC / USDT / WBTC / WETH / WPHRS — [`atlantic.json`](deployments/atlantic.json) |
| Amount | `amount` (wei) | `1e18` = 1 TEST · `10e6` = 10 USDC |
| Task id | `workDescription` | `proposal-brief-12` |
| Network | `deploymentNetwork` | `atlantic` or your own deploy |
| Mode | `mode` | `cooperative` \| `safetyNet` |

Tutorials show “10 TEST on Atlantic” as one instance — the Skill is parameterized for any allowed token, amount, and task.

| Plain English | Technical |
|---------------|-----------|
| Dry-run before paying | Preflight / `simulateTrustedSettlement` |
| Cursor / Claude plug-in | MCP (`npm run mcp`) |
| Agent how-to file | Skill (`skills/trusted-agent-settlement/`) |
| Pay after work proof | Hybrid release |
| Pay many workers at once | SALI FastPay (`saliFast` batch) |

---

## What judges get

| Layer | Deliverable |
|-------|-------------|
| On-chain | Router + escrow + registry + allowlist — [live addresses](deployments/atlantic.json) |
| SDK | `simulateTrustedSettlement` → `executeTrustedSettlement` + `nextAction` |
| MCP | 15 tools — payer/payee split + batch |
| Skill | `skills/trusted-agent-settlement/` — composable agent economy primitive |

### Composability design

**Two layers:** ergonomic **Skill/MCP** for agents + **primitives** (`steps.ts`) for custom workflows. Same guarantees at both surfaces.

| Step | MCP tool | SDK ergonomic |
|------|----------|---------------|
| Preflight | `simulate_trusted_settlement` | `simulateTrustedSettlement` |
| Fund | `fund_deal` | `fundDealSettlement` |
| Deliver | `submit_delivery` | `submitDeliveryForDeal` |
| Status | `get_settlement_status` | `getSettlementStatus` |
| Attest | `attest_release` | `attestReleaseForDeal` |
| Claim | `complete_claim_for_deal` | `completeClaimForDeal` |
| Reclaim | `reclaim_trusted_settlement` | `reclaimTrustedSettlement` |

**Patterns:** (1) human-triggered payment · (2) payee recovery when payer ghosts · (3) reclaim when payee ghosts · (4) SALI FastPay batch · (5) marketplace *(Phase 2)*  

**Guarantees:** `nextAction` loops · `dealId` handoff · `preflightHash` binding · `resultHash` delivery · MCP/SDK parity  

→ [SKILL.md](skills/trusted-agent-settlement/SKILL.md) · [JUDGES.md](JUDGES.md)

### Agent scenarios

- Research agent → scraping agent (market data)
- Trading agent → risk agent (pre-trade check)
- DAO assistant → summarizer (proposal briefs)
- Labeling coordinator → 100 workers (SALI FastPay batch payroll)

### Agent economy primitive

```mermaid
flowchart LR
  A[Agent_A_hires] --> B[Agent_B]
  B --> E[Escrow_fund]
  E --> D[Delivery_hash]
  D --> AT{Attest_or_timeout}
  AT -->|Attest| CL[Claim]
  AT -->|Payer_ghosts| AR[Auto_release]
  AT -->|Payee_ghosts| RC[Reclaim]
```

---

## Run it

### Mock first (no keys)

```bash
npm install
npm run agent:doctor:mock
npm run demo:simulate
```

### Live Atlantic (keys in `.env`)

```bash
cp .env.example .env   # PRIVATE_KEY + AGENT_B_PRIVATE_KEY
npm run demo:pharos    # → PharosScan link in output
```

See [JUDGES.md](JUDGES.md) for what to look for in the output.

| Command | Shows |
|---------|--------|
| `npm run demo:ghost-payee:simulate` | Ghost payee — payer reclaims (mock, no keys) |
| `npm run demo:ghost-payer:simulate` | Ghost payer — payee paid when payer ghosts (mock) |
| `npm run demo:batch` | SALI FastPay — parallel batch payroll |
| `npm run demo:pharos` | Live cooperative settlement |
| `npm test` | 103 tests |

Full list: [docs/examples/demos.md](docs/examples/demos.md) · `demo:reclaim` aliases `demo:ghost-payee`.

**Multi-payee batch:** One MCP = one wallet identity. Payer funds N payees via `fund_deals_batch`; each payee claims their manifest rows with their own key/MCP.

---

## Live deployment (Atlantic)

| Contract | Address |
|----------|---------|
| SettlementRouter | `0x4c6e7be366dc9c4c358f85faa98a471fdaa4ad94` |
| DealEscrow | `0xd019258710faf17d0952c91d66e0e11e5631c814` |
| AgentRegistry | `0x8871d3538153eae0711fa6d01a0ed311a6b13e17` |
| TokenAllowlist | `0x37e128f57732e951f8f2aecf8bce6129ebc08b21` |
| TEST token | `0xde18fab2b974db730aeda8c6187ba37b1d6a3be9` |

Explorer: [atlantic.pharosscan.xyz](https://atlantic.pharosscan.xyz) · Proof: [`deployments/atlantic.json`](deployments/atlantic.json)

---

## DoraHacks copy-paste

**Title:** Pharos Settle — Stripe Checkout for AI agents on Pharos  
**Tags:** AgentSkill, MCP, Payments, Onchain, Pharos  
**One-liner:** Dual-ghost protection + agent-native API (Skill + 15 MCP tools) for agent-to-agent work settlement on Pharos — simulate-first, `nextAction` loops, SALI FastPay batch payroll. Live Atlantic, 103 tests.

**Demo video:** _(paste URL — script: [docs/demo-script.md](docs/demo-script.md))_

### Live proof (PharosScan)

| Flow | Tx hash | Notes |
|------|---------|-------|
| Cooperative settlement | _(paste)_ | `npm run demo:pharos` |
| SALI batch fund | _(paste)_ | `npm run demo:batch` |
| Ghost payee reclaim | _(paste)_ | `npm run demo:ghost-payee` |
| Ghost payer claim | _(paste)_ | `npm run demo:ghost-payer` |

Explorer: [atlantic.pharosscan.xyz](https://atlantic.pharosscan.xyz)

---

## Deeper docs

| Doc | Purpose |
|-----|---------|
| [JUDGES.md](JUDGES.md) | Judge quickstart (mock first) |
| [docs/PHASES.md](docs/PHASES.md) | Phase 1 vs Phase 2 |
| [docs/README.md](docs/README.md) | Full handbook |
| [docs/mcp/batch-sali.md](docs/mcp/batch-sali.md) | SALI FastPay |
| [skills/trusted-agent-settlement/SKILL.md](skills/trusted-agent-settlement/SKILL.md) | Agent Skill |
