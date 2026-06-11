# Judge Quickstart

**Start here.** No keys required for step 4.

---

## 1. What it is

**Pharos Settle** = **Stripe Checkout for AI agents on Pharos.**

One AI agent pays another for work. Money sits in escrow until the job is proven — then release, timeout payout, or refund.

**Ghost protection** (the hook):

| If… | Then… |
|-----|-------|
| Worker never delivers | Payer gets money back |
| Payer disappears after delivery | Worker still gets paid |
| Both do their part | Instant settlement |

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
| Plug-in for Cursor / Claude | **MCP** (`npm run mcp`, 15 tools) |
| Agent instruction file | **Skill** (`skills/trusted-agent-settlement/`) |
| Pay only after work proof | **Hybrid release** (deliver → attest → claim) |
| Batch payroll to many agents | **SALI FastPay** (`batchMode: saliFast`) |
| Receipt check after payment | **Prove tier** (receipt; SPV optional) |

---

## Shipped vs planned

| ✅ Shipped (Phase 1) | ⚠️ Not shipped (Phase 2 roadmap) |
|----------------------|-----------------------------------|
| Smart contracts | Agent marketplace |
| TypeScript SDK | Reputation scores |
| MCP server (15 tools) | On-chain arbitration |
| Agent Skill module | |
| Live Atlantic deployment | |
| 103 tests (`npm test`) | |

Details: [docs/PHASES.md](docs/PHASES.md)

---

## 3. Live contracts (Atlantic)

Proof: [`deployments/atlantic.json`](deployments/atlantic.json) · Explorer: [atlantic.pharosscan.xyz](https://atlantic.pharosscan.xyz)

| Contract | Address |
|----------|---------|
| SettlementRouter | `0x4c6e7be366dc9c4c358f85faa98a471fdaa4ad94` |
| DealEscrow | `0xd019258710faf17d0952c91d66e0e11e5631c814` |
| AgentRegistry | `0x8871d3538153eae0711fa6d01a0ed311a6b13e17` |
| TokenAllowlist | `0x37e128f57732e951f8f2aecf8bce6129ebc08b21` |
| TEST token | `0xde18fab2b974db730aeda8c6187ba37b1d6a3be9` |

Chain ID **688689** · RPC `https://atlantic.dplabs-internal.com` · Gas: **PHRS** on Atlantic

---

## 4. Mock demo — no keys (try this first)

```bash
git clone https://github.com/shery8595/Pharos-Settle.git && cd Pharos-Settle
npm run setup
```

Then **open `Pharos-Settle` as the workspace root** (not a parent folder) and **reload MCP** (Settings → MCP → restart `pharos-settle`). The agent should prompt you to confirm both (yes/no) before using settlement tools.

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

More live demos:

```bash
npm run demo:batch          # batch payroll (SALI FastPay)
npm run demo:ghost-payer    # payer ghosts → payee still paid
npm test                    # 103 tests
```

---

## 6. What to look for in the output

### `npm run agent:doctor:mock`

- `ready: true`
- `role: "mock"` (or `demo` if both keys set)
- List of allowed tools — should be **15**

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
| Skill / MCP | 15 tools (`fund_deal`, `submit_delivery`, …) |
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

### Composable patterns

| # | Pattern | Tool chain |
|---|---------|------------|
| 1 | Human-triggered payment | simulate → fund → deliver → attest → claim |
| 2 | Autonomous payee recovery (payer ghosts) | status → wait → claim |
| 3 | Ghost payee recovery | status → reclaim |
| 4 | Batch worker payroll (SALI FastPay) | `fund_deals_batch` → `complete_claims_batch` |
| 5 | Agent marketplace *(Phase 2, not shipped)* | discover job → simulate → fund → deliver → claim |

### Composable guarantees

| Guarantee | Why it matters |
|-----------|----------------|
| **`nextAction` driven** | Agents loop without hardcoded flow logic |
| **`dealId` handoff** | Payer and payee in separate processes |
| **`preflightHash` binding** | Funded deal tied to simulated checks |
| **`resultHash` delivery** | Work proof without revealing full details |
| **MCP / SDK parity** | Same workflow via tools or code |

Full mapping + patterns: [skills/trusted-agent-settlement/SKILL.md](skills/trusted-agent-settlement/SKILL.md)

---

## Example agent transcript

```
User:     Pay 1 TEST to the research agent if it delivers the market report.
Pharos Settle: Preflight passed. nextAction: fund.
Research: Delivery submitted.
Pharos Settle: Claim complete. dealId=42 · PharosScan ✓
```

---

## More for judges

| Doc | Purpose |
|-----|---------|
| [SUBMISSION.md](SUBMISSION.md) | Full submission + DoraHacks copy-paste |
| [skills/trusted-agent-settlement/SKILL.md](skills/trusted-agent-settlement/SKILL.md) | Agent Skill module |
| [docs/demo-script.md](docs/demo-script.md) | 3-minute video script |
