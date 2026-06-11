# Judge Quickstart

**Start here.** No keys required for the mock demo.

## Judge in 3 minutes

1. `npm run demo:judge` — one-command mock flow (no keys)
2. Watch demo video for live Atlantic txs _(link in [SUBMISSION.md](SUBMISSION.md))_
3. Reusable surfaces: [SKILL.md](SKILL.md) · 17 MCP tools · TypeScript SDK · smart contracts · batch manifest handoff
4. Click PharosScan proofs: [SUBMISSION.md](SUBMISSION.md#live-proof-pharosscan)

## Why this wins Phase 1

Agents cannot safely hire each other with raw transfers. Pharos Settle gives them a **reusable settlement Skill**: simulate first, escrow funds, prove delivery, recover from ghosting, and batch-pay workers on Pharos.

| Reusable surface | Where |
|------------------|-------|
| Agent Skill | `SKILL.md` + `assets/` + `references/` |
| MCP (17 tools) | `npm run mcp` |
| TypeScript SDK | `src/trustedAgentSettlement.ts` + `steps.ts` |
| Smart contracts | `deployments/atlantic.json` |
| Batch manifest handoff | payer `fund_deals_batch` → payee `complete_claims_batch` |

> **v1.3.0 (Atlantic):** Payer-only funding; hybrid `disputeWindow < ttl` enforced on-chain. **v1.2.0:** auditable `reasonHash` on reject; optional **arbiter** disputes. Cooperative payer-rug risk — [threat-model](docs/security/threat-model.md).

---

## 1. What it is

**Pharos Settle** = **Stripe Checkout for AI agents on Pharos.**

One AI agent pays another for work. Money sits in escrow until the job is proven — then release, timeout payout, or refund.

**Ghost protection** (the hook):

| If… | Then… |
|-----|-------|
| Worker never delivers | Payer gets money back |
| Worker submits junk delivery | Payer **safety valve** during dispute window (`reject_delivery`, cooperative review) |
| Payer disappears after delivery | Worker still gets paid |
| Both do their part | Instant settlement |

### What's novel

- **Dual-ghost protection** — both ghost paths demonstrated (`demo:ghost-payee`, `demo:ghost-payer`) + junk delivery reject
- **`nextAction` loops** — single hint per poll (`fund`, `claim`, `reclaim`, …)
- **`preflightHash` audit log** — simulate checks hashed and stored on-chain (off-chain verifiable)
- **Manifest handoff** — payer MCP funds batch; payee MCP claims its rows
- **SALI FastPay** — parallel batch payroll (`maxParallelInBlock`)

See [docs/WHATS-NOVEL.md](docs/WHATS-NOVEL.md)

### Workflow parameters (reuse any scenario)

Same flow for 1 TEST, 10 USDC, another worker, or your own deployment — swap the inputs:

| Parameter | You set | Example |
|-----------|---------|---------|
| **payer** (`agentA`) | Who pays | Your `PRIVATE_KEY` address |
| **payee** (`agentB`) | Who gets paid | Worker agent address |
| **token** | ERC-20 on Atlantic | TEST · USDC · USDT · WBTC · WETH · WPHRS — see [`deployments/atlantic.json`](deployments/atlantic.json) |
| **amount** | Wei string | `1000000000000000000` = 1 TEST · `10000000` = 10 USDC |
| **workDescription** | Task id | `market-report-june-2026` |
| **network** | `deploymentNetwork` | `atlantic` (repo default) or `localhost` (your deploy) |
| **mode** | Settlement path | `cooperative` or `safetyNet` |

Demos use fixed example wallets — your agent substitutes its own values.

---

## 2. Why it matters for Pharos agents

Pharos agents will hire each other constantly (research, scraping, risk checks, summarization, labeling). They need a **reusable payment primitive** on-chain — not one-off transfers.

Pharos Settle ships that primitive today: contracts live on Atlantic, agents plug in via a **Skill** + plug-in tools, and batch payroll uses Pharos parallel blocks.

| Plain English | Technical name |
|---------------|----------------|
| “Can I pay safely?” dry-run | **Preflight** / `simulateTrustedSettlement` |
| Plug-in for Cursor / Claude | **MCP** (`npm run mcp`, 17 tools) |
| Agent instruction file | **Skill Engine** (`SKILL.md`, `assets/`, `references/`) |
| Pay only after work proof | **Hybrid release** (deliver → attest → claim) |
| Batch payroll to many agents | **SALI FastPay** (`batchMode: saliFast`) |
| Receipt check after payment | **Prove tier** (receipt; SPV optional) |

---

## Shipped vs planned

| **Shipped** (Phase 1) | **Planned** (Phase 2 roadmap) |
|----------------------|-----------------------------------|
| Smart contracts | Agent marketplace |
| TypeScript SDK | Reputation scores |
| MCP server (17 tools) | On-chain arbitration |
| Agent Skill module | |
| Live Atlantic deployment | |
| 147 tests (`npm test`) | |
| Cooperative junk review (`reject_delivery` safety valve) | |

Details: [docs/PHASES.md](docs/PHASES.md)

---

## 3. Live contracts (Atlantic)

Proof: [`deployments/atlantic.json`](deployments/atlantic.json) · Explorer: [atlantic.pharosscan.xyz](https://atlantic.pharosscan.xyz)

| Contract | Address |
|----------|---------|
| SettlementRouter | `0xb39f403f7f36a2a1f4c35a0808f3a024fb73452e` |
| DealEscrow | `0x2911c456bf766661572eb8ab92f8cfd656661a9b` |
| AgentRegistry | `0xe4991f5a54b35cfbcf952c31ec7dfcf432a8c173` |
| TokenAllowlist | `0x456848b1a38954a61ee7f34a997d468831f2d224` |
| TEST token | `0x008f64b4da7ffcafad2706585cae349bd59b48bf` |

Chain ID **688689** · RPC `https://atlantic.dplabs-internal.com` · Gas: **PHRS** on Atlantic

---

## 4. Mock demo — no keys (try this first)

Tier 2 — no Foundry, keys, or MCP required:

```bash
git clone https://github.com/shery8595/Pharos-Settle.git && cd Pharos-Settle
npm install
npm run demo:judge
```

Optional tier 3 (MCP): `npm run setup`, reload MCP, then use `simulate_trusted_settlement` with `mock: true`. See [AGENTS.md](AGENTS.md) § MCP (tier 3).

Or step-by-step:

```bash
npm run agent:doctor:mock
npm run demo:simulate
```

Optional — mock batch (still no keys):

```bash
npm run demo:batch:simulate
```

---

## 5. Atlantic demo — with keys (live testnet)

```bash
cp .env.example .env
# Add PRIVATE_KEY + AGENT_B_PRIVATE_KEY (Atlantic-funded wallets)
npm run demo:pharos
```

Demo wallets are pre-registered after `seed:pharos`. First-time deploy from scratch:

```bash
npm run deploy:pharos && npm run seed:pharos && npm run demo:pharos
```

Mock ghost demos (no keys, <60s):

```bash
npm run demo:ghost-payee:simulate   # payee ghosts → payer reclaims
npm run demo:ghost-payer:simulate   # payer ghosts → payee still paid
```

More live demos:

```bash
npm run demo:batch          # batch payroll (SALI FastPay)
npm run demo:ghost-payee    # payee ghosts → payer reclaims
npm run demo:ghost-payer    # payer ghosts → payee still paid
npm test                    # 147 tests
```

Key demos table: [docs/examples/demos.md](docs/examples/demos.md).

**Multi-payee batch:** One MCP = one wallet identity. Payer funds N payees via `fund_deals_batch`; each payee claims their manifest rows with their own key/MCP.

---

## 6. What to look for in the output

### `npm run agent:doctor:mock`

- `ready: true`
- `role: "mock"` (or `demo` if both keys set)
- List of allowed tools — should be **16**

### `npm run demo:simulate`

- `success: true` (or clear preflight checks)
- **`nextAction`** — single next step (`fund`, `deliver`, `attest`, `claim`, `done`, …)
- **`feeQuote`** — protocol fee before spending gas
- No PharosScan link (mock — no real txs)

### `npm run demo:pharos` (live)

- `success: true`
- **`dealId`** — on-chain deal identifier
- **Explorer / PharosScan URL** — real Atlantic transactions
- `nextAction: "done"` at the end

### `npm run demo:batch` (live)

- `batchMode: "saliFast"`
- **`maxParallelInBlock`** > 1 — proof of Pharos parallel settlement
- `succeeded` matches batch size

---

## Composability design proof

Pharos Settle exposes **two composability layers**: an ergonomic **Skill/MCP layer** for agents, and **lower-level primitives** (`steps.ts`) for custom workflows. Not a single demo script — reusable building blocks for an agent economy.

| Layer | Surface |
|-------|---------|
| Skill / MCP | 17 tools (`fund_deal`, `submit_delivery`, `reject_delivery`, …) |
| SDK ergonomic | `simulateTrustedSettlement`, `fundDealSettlement`, … |
| Primitives | `preflight`, `submitDelivery`, `claimDeal`, … via `steps.ts` |

### MCP step reference

| Step | Tool | Caller | Reusable output |
|------|------|--------|-----------------|
| Preflight | `simulate_trusted_settlement` | payer | `nextAction`, `feeQuote`, checks |
| Fund | `fund_deal` | payer | `dealId`, `terms` |
| Deliver | `submit_delivery` | payee | delivery tx |
| Status | `get_settlement_status` | either | `nextAction` |
| Attest | `attest_release` | payer | release permission |
| Claim | `complete_claim_for_deal` | payee | settlement tx |
| Reclaim | `reclaim_trusted_settlement` | payer | refund tx |
| Reject junk (safety valve) | `reject_delivery` + `reason` | payer | refund or dispute (if arbiter set) |
| Resolve dispute | `resolve_dispute` | arbiter | release / refund / split |

### Composable patterns

| # | Pattern | Tool chain |
|---|---------|------------|
| 1 | Human-triggered payment | simulate → fund → deliver → attest → claim |
| 2 | Autonomous payee recovery (payer ghosts) | status → wait → claim |
| 3 | Ghost payee recovery | status → reclaim |
| 4 | Junk delivery rejection | status → reject_delivery |
| 5 | Batch worker payroll (SALI FastPay) | `fund_deals_batch` → `complete_claims_batch` |
| 6 | Agent marketplace *(Phase 2, not shipped)* | discover job → simulate → fund → deliver → claim |

### Composable guarantees

| Guarantee | Why it matters |
|-----------|----------------|
| **`nextAction` driven** | Agents loop without hardcoded flow logic |
| **`dealId` handoff** | Payer and payee in separate processes |
| **`preflightHash` audit log** | Simulate checks hashed and stored on-chain (off-chain verifiable) |
| **`reject_delivery` safety valve** | Payer-side cooperative junk review during dispute window; Phase 2 adds neutral arbitration |
| **`resultHash` delivery** | Work proof without revealing full details |
| **MCP / SDK parity** | Same workflow via tools or code |

Full mapping + patterns: [SKILL.md](SKILL.md)

---

## Example agent transcript

```
User:     Pay 1 TEST to the research agent if it delivers the market report.
Pharos Settle: Preflight passed. nextAction: fund.
Research: Delivery submitted.
Pharos Settle: Claim complete. dealId=42 · PharosScan (confirmed)
```

---

## More for judges

| Doc | Purpose |
|-----|---------|
| [SUBMISSION.md](SUBMISSION.md) | Full submission + DoraHacks copy-paste |
| [SKILL.md](SKILL.md) | Agent Skill module |
| [docs/demo-script.md](docs/demo-script.md) | 3-minute video script |
