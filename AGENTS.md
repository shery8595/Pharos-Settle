# Pharos Settle — agent instructions (all IDEs)

Portable guide for **Cursor**, **Claude Desktop**, **Windsurf**, **Cline**, and other MCP-capable agents.

## Quick setup

```bash
git clone https://github.com/shery8595/Pharos-Settle.git
cd Pharos-Settle
npm run setup
```

Then configure MCP for your IDE — see [docs/mcp/modes.md](docs/mcp/modes.md) (project vs global) and [docs/mcp/other-ides.md](docs/mcp/other-ides.md).

## MCP modes

`npm run setup` asks **project** or **global** and saves `mcpMode` in `.pharos-settle/setup-checklist.json`.

| Mode | When | MCP config |
|------|------|------------|
| **project** (default) | Judges, repo-only work | Committed `.cursor/mcp.json` — open Pharos-Settle as workspace root |
| **global** | Use settlement from any workspace | Setup writes **`~/.cursor/mcp.json`** (`npm run mcp:install-global`); reload MCP in Settings |

Full guide: [docs/mcp/modes.md](docs/mcp/modes.md).

## MCP readiness gate (ask user before settlement tools)

After `npm run setup`, read **`.pharos-settle/setup-checklist.json`**. If `"awaitingConfirmation": true` (or the user just ran setup):

Use **AskQuestion** when available.

### Setup choices (if not chosen in terminal)

When an agent runs `npm run setup`, the terminal often has **no TTY** — prompts are skipped and `needsSetupChoices` is `true`. **You must ask the user** before MCP confirmation:

| Order | If missing | Ask |
|-------|------------|-----|
| 1 | `mcpMode` is `null` / missing | **Project MCP** (open Pharos-Settle as workspace root) vs **Global MCP** (any workspace — paste `mcp-bin.generated.json`) |
| 2 | `runMode` is `null` / missing | **Demo / mock** vs **Live Atlantic test** |

After the user answers, **write** `mcpMode` and/or `runMode` into `.pharos-settle/setup-checklist.json`. If they chose **global**, run **`npm run mcp:install-global`** (writes `~/.cursor/mcp.json` and sets `globalMcpInstalled: true` in the checklist).

**Parent-folder clone** (e.g. workspace is `skill_test` but repo is `skill_test/Pharos-Settle`): recommend **global** MCP unless they will re-open Pharos-Settle as workspace root.

### MCP confirmation (after `mcpMode` is known)

**Auto-skip:** If **`pharos-settle` MCP tools are available in this chat session**, set `awaitingConfirmation: false` and `confirmedAt` in the checklist — do **not** ask the user.

Read **`mcpMode`** (`"project"` or `"global"`).

### Project mode (`mcpMode: "project"`)

Confirm **both**:

1. Is **Pharos-Settle** opened as the **workspace / project root** (not a parent folder)?
2. Is **`pharos-settle` MCP** connected/reloaded?

If **no** → [docs/mcp/modes.md](docs/mcp/modes.md#project-mode-default). Do **not** call settlement MCP tools.

### Global mode (`mcpMode: "global"`)

Setup (or `npm run mcp:install-global`) writes **`pharos-settle`** to **`~/.cursor/mcp.json`**. Do **not** ask whether the user pasted JSON manually when **`globalMcpInstalled`** is `true` in the checklist.

Confirm **only**:

1. Is **`pharos-settle` MCP** connected/reloaded? (Skip if tools are already available in this session.)

Workspace root does **not** need to be Pharos-Settle. Keys still live in the clone at `repoPath` in the checklist.

If MCP is not connected → [docs/mcp/modes.md](docs/mcp/modes.md#global-mode). Do **not** call settlement MCP tools.

### After MCP is confirmed

Set `"awaitingConfirmation": false` and `"confirmedAt"` in `.pharos-settle/setup-checklist.json`, then proceed.

### Run mode (demo vs live)

`npm run setup` also asks **demo** or **live** and saves **`runMode`** in the checklist.

- If **`runMode`** is already set → use it; do **not** re-ask unless the user wants to change.
- If **`runMode`** is missing (old checklist) → ask with AskQuestion: **Demo / mock** vs **Live test on Atlantic**.

| `runMode` | Behavior |
|-----------|----------|
| **`demo`** | `mock: true` on MCP tools, or `npm run demo:judge` (recommended). No keys needed. |
| **`live`** | MCP without `mock: true` or `npm run agent:doctor` / `npm run demo:pharos` — only after keys are set. |

**Live keys:** If `runMode` is `live` and `keysConfigured` is `false` (or keys missing in `.env` at `repoPath`), tell the user to set **`PRIVATE_KEY`** and **`AGENT_B_PRIVATE_KEY`** (full 32-byte hex, not `0x` placeholder), fund PHRS, save `.env`, then call any MCP tool (env reloads per request). Use AskQuestion: **Keys saved in .env?** before live settlement tools.

Do **not** call live settlement tools (`fund_deal`, etc. without `mock: true`) until both keys are configured.

If MCP tools are **not available** in this session, say so explicitly. Offer CLI fallback: `npm run demo:judge` (or `npm run agent:doctor:mock` + `npm run demo:simulate`).

## What this project is

**Pharos Settle** — agent-to-agent escrow on Pharos Atlantic with ghost protection. Use the **MCP server** (17 tools) or the **Skill** at `skills/trusted-agent-settlement/SKILL.md`.

| Layer | Path |
|-------|------|
| Skill (instructions) | `skills/trusted-agent-settlement/SKILL.md` |
| MCP server | `mcp/server.ts` — `npm run mcp` |
| Live contracts | `deployments/atlantic.json` |
| Judge quickstart | `JUDGES.md` |

## Settlement tools (MCP)

Do **not** use raw `cast send` for agent payments. Use MCP tools or SDK:

`get_agent_readiness` → `simulate_trusted_settlement` → `fund_deal` → `submit_delivery` → `attest_release` → `complete_claim_for_deal`

**Reject (v1.2):** `reject_delivery` requires `reason` or `reasonHash`. Optional `arbiter` on `fund_deal` / `simulate_trusted_settlement` — arbiter deals use `resolve_dispute` (`ARBITER_PRIVATE_KEY`).

Mock mode: pass `mock: true` when no wallet keys are configured.

## Custom payments (e.g. “pay 5 TEST to 0x…”)

**Do not create new scripts** (`scripts/pay-custom.ts`, etc.). Use one of these — in order:

### 1. MCP (preferred when connected)

`simulate_trusted_settlement` then `execute_trusted_settlement` with:

| Field | Source |
|-------|--------|
| `agentA` | Payer from `PRIVATE_KEY` (or `deployments/atlantic.json` → `deployer`) |
| `agentB` | User’s payee address |
| `token` | `deployments/atlantic.json` → `mockToken` (TEST) |
| `amount` | Wei string — `5` TEST = `"5000000000000000000"` |
| `workDescription` | Stable task id |

Set `autoOnboardRecipients: true` if payee is not registered.

### 2. Official CLI (SDK wrapper)

```bash
npm run pay:once -- --payee 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC --amount 5 --work "my-task"
npm run pay:once -- --payee 0x... --amount 5 --simulate   # preflight only
```

Uses `simulateTrustedSettlement` / `executeTrustedSettlement` from `src/trustedAgentSettlement.js` — same as MCP.

### 3. SDK import (code / examples)

Copy pattern from `examples/agent-consumer/openai-agent.ts` — import from `pharos-trusted-settlement` or `src/trustedAgentSettlement.js`. **Never** add a one-off file under `scripts/` for each payment.

**Payee must hold `AGENT_B_PRIVATE_KEY`** (or use split MCP payer + payee tools) for deliver/claim steps in `execute_trusted_settlement` when payee ≠ env payee.

## Batch settlements (SALI FastPay / payroll)

**Do not create** `scripts/pay-batch-custom.ts` or similar. Use MCP, official CLI, or existing demos.

### Modes

| Mode | Flow | MCP tools |
|------|------|-----------|
| **`saliFast`** | fund N → claim N | `fund_deals_batch` → `complete_claims_batch` (split) or `execute_batch_settlement` (both keys) |
| **`hybridWork`** | fund → deliver → attest → claim × N | + `submit_deliveries_batch`, `attest_releases_batch` |

### 1. MCP (preferred)

**Both keys (demo MCP):** `execute_batch_settlement` with `jobs[]`, `batchMode: "saliFast"` or `"hybridWork"`, `autoOnboardRecipients: true`.

**Split payer / payee MCPs:**

1. Payer: `fund_deals_batch` → share `manifest`
2. Payee: `complete_claims_batch` (`saliFast`) — or deliver → attest → claim for `hybridWork`

See [docs/mcp/batch-sali.md](docs/mcp/batch-sali.md).

### 2. Official CLI (SDK wrapper)

**Production (split):**

```bash
# Payer only — fund N escrows, write manifest
npm run batch:fund -- --payees 0xA,0xB,0xC --amount 1 --work-prefix "label-batch"
npm run batch:fund -- --jobs-file ./jobs.json --out ./manifest.json

# Payee only — claim rows matching AGENT_B_PRIVATE_KEY (multi-payee safe)
npm run batch:claim -- --manifest ./manifest.json
```

**Demo (both keys — not production architecture):**

```bash
npm run pay:batch -- --payees 0xA,0xB,0xC --amount 1 --work-prefix "label-batch"
npm run pay:batch -- --payee 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC --count 5 --amount 2
```

`jobs.json` example: `[{"agentB":"0x...","amount":"1000000000000000000","workDescription":"task-1"}]`

> **Batch = coordination (manifest). MCP = single identity. Never mix keys in one env.**

### 3. Existing demos (fixed patterns)

```bash
BATCH_SIZE=10 npm run demo:batch              # executeBatchSettlement, saliFast
BATCH_MODE=hybridWork npm run demo:batch
npm run demo:batch:split                      # fundDealsBatch → claimDealsBatch handoff
```

### 4. SDK

`executeBatchSettlement`, `fundDealsBatch`, `claimDealsBatch`, etc. — see [docs/sdk/batch-settlements.md](docs/sdk/batch-settlements.md) and `examples/pipeline/run-batch.ts`.

**Requirements:** payer allowance ≥ sum of amounts; payees registered or `autoOnboardRecipients: true`. For `batch:fund`, only payer key required. For `batch:claim`, only payee key required (CLI filters manifest). For `pay:batch` / `execute_batch_settlement`, both keys required.

## Network

- Chain: Pharos Atlantic **688689**
- RPC: `https://atlantic.dplabs-internal.com`
- Gas: **PHRS**
- Tokens: `deployments/atlantic.json` → `allowedTokens`
