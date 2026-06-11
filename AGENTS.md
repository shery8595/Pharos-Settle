# Pharos Settle — agent instructions (all IDEs)

Portable guide for **Cursor**, **Claude Desktop**, **Windsurf**, **Cline**, and other MCP-capable agents.

**Cast-first, MCP-supported.** Read root [`SKILL.md`](SKILL.md) first. Default path is Foundry (`cast`/`forge`). MCP is optional.

## Quick setup

```bash
git clone https://github.com/shery8595/Pharos-Settle.git
cd Pharos-Settle
npm install && cp .env.example .env
export PRIVATE_KEY=0x...
export RPC=https://atlantic.dplabs-internal.com
```

Optional: `npm run setup` (creates `.env`, installs skill, optional MCP config).

## Default pre-checks (cast-first — use before any settlement)

Do **not** ask about MCP global/local or demo/live unless the user explicitly wants MCP tools.

| # | Check | How |
|---|-------|-----|
| 1 | RPC | `cast chain-id --rpc-url $RPC` → `688689` |
| 2 | Private key | `cast wallet address --private-key $PRIVATE_KEY` |
| 3 | Contracts | `assets/deployments.json` → `settlementRouter` |
| 4 | Balance | `cast balance $DEPLOYER --rpc-url $RPC --ether` |

Then execute per [`references/settlement.md`](references/settlement.md) Method A (cast). Pass `--private-key $PRIVATE_KEY` and `--rpc-url $RPC` on every write.

## Skill Engine layout

| Path | Role |
|------|------|
| [`SKILL.md`](SKILL.md) | Agent entry — Capability Index |
| `assets/` | networks, tokens, deployments, contract templates |
| `references/` | cast (preferred) + MCP (optional) operation specs |
| `docs/` | Human handbook (architecture, threat model, SDK depth) |

Sync assets after deploy: `npm run skill:sync-assets`

## What this project is

**Pharos Settle** — agent-to-agent escrow on Pharos Atlantic with ghost protection.

| Layer | Path |
|-------|------|
| Skill (instructions) | [`SKILL.md`](SKILL.md) + `references/` |
| MCP server (optional) | `mcp/server.ts` — `npm run mcp` |
| TypeScript SDK | `pharos-trusted-settlement` — `src/` |
| Live contracts | `deployments/atlantic.json` |
| Judge quickstart | `JUDGES.md` |

---

## MCP (optional — only when user wants MCP tools)

Skip this entire section for cast-first workflows. Apply only when:
- User explicitly asks for MCP tools, **or**
- `pharos-settle` MCP tools are already available in the session

### MCP modes

`npm run setup` can save `mcpMode` in `.pharos-settle/setup-checklist.json`.

| Mode | When | MCP config |
|------|------|------------|
| **project** | Repo as workspace root | `.cursor/mcp.json` |
| **global** | Settlement from any workspace | `~/.cursor/mcp.json` via `npm run mcp:install-global` |

Guide: [docs/mcp/modes.md](docs/mcp/modes.md).

### MCP readiness gate (MCP tools only)

Before calling **pharos-settle** MCP tools (`fund_deal`, `simulate_trusted_settlement`, etc.):

Read **`.pharos-settle/setup-checklist.json`**. If `"awaitingConfirmation": true` or user just ran setup:

**Auto-skip:** If MCP tools are in this session, set `awaitingConfirmation: false` and proceed.

Otherwise confirm per `mcpMode` (project: workspace root + MCP connected; global: MCP connected only). See [docs/mcp/modes.md](docs/mcp/modes.md).

### Run mode (MCP / demo only)

| `runMode` | Behavior |
|-----------|----------|
| **`demo`** | `mock: true` on MCP tools, or `npm run demo:judge` |
| **`live`** | No `mock: true`; keys in `.env` at repo clone |

Live keys: `PRIVATE_KEY` + `AGENT_B_PRIVATE_KEY` (66+ char hex), PHRS funded.

If MCP tools are **not** in session and user wanted MCP, say: **"Pharos Settle MCP is not connected."** Offer cast path or `npm run demo:judge`.

### MCP settlement flow

`get_agent_readiness` → `simulate_trusted_settlement` → `fund_deal` → `submit_delivery` → `attest_release` → `complete_claim_for_deal`

Details: [`references/mcp.md`](references/mcp.md) and [`references/settlement.md`](references/settlement.md) Method B.

---

## Custom payments (e.g. “pay 5 TEST to 0x…”)

**Do not create new scripts** (`scripts/pay-custom.ts`, etc.). Use in order:

### 1. Cast (preferred)

See [`references/settlement.md`](references/settlement.md) — approve → `fundAndAcceptHybrid` → deliver → attest → claim.

### 2. MCP (when connected)

`simulate_trusted_settlement` → `execute_trusted_settlement` with `autoOnboardRecipients: true` if needed.

### 3. Official CLI (SDK wrapper)

```bash
npm run pay:once -- --payee 0x... --amount 5 --work "my-task"
npm run pay:once -- --payee 0x... --amount 5 --simulate
```

### 4. SDK import

Pattern: `examples/agent-consumer/openai-agent.ts`

## Batch settlements (SALI FastPay)

**Do not create** ad-hoc batch scripts.

| Path | How |
|------|-----|
| Cast | Loop fund + claim per job — [`references/settlement.md`](references/settlement.md) |
| MCP split | `fund_deals_batch` → `complete_claims_batch` |
| CLI split | `npm run batch:fund` → `npm run batch:claim` |
| Demo | `npm run demo:batch` or `npm run pay:batch` |

See [docs/mcp/batch-sali.md](docs/mcp/batch-sali.md) and [docs/sdk/batch-settlements.md](docs/sdk/batch-settlements.md).

## Network

- Chain: Pharos Atlantic **688689**
- RPC: `https://atlantic.dplabs-internal.com` (or `assets/networks.json`)
- Gas: **PHRS**
- Tokens: `assets/tokens.json` or `deployments/atlantic.json` → `allowedTokens`
