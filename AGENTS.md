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
| **global** | Use settlement from any workspace | Cursor **Settings → MCP → global** — paste `.pharos-settle/mcp-bin.generated.json` |

Full guide: [docs/mcp/modes.md](docs/mcp/modes.md).

## MCP readiness gate (ask user before settlement tools)

After `npm run setup`, read **`.pharos-settle/setup-checklist.json`**. If `"awaitingConfirmation": true` (or the user just ran setup):

Read **`mcpMode`** (`"project"` or `"global"`). Use **AskQuestion** when available.

### Project mode (`mcpMode: "project"`)

Confirm **both**:

1. Is **Pharos-Settle** opened as the **workspace / project root** (not a parent folder)?
2. Is **`pharos-settle` MCP** connected/reloaded?

If **no** → [docs/mcp/modes.md](docs/mcp/modes.md#project-mode-default). Do **not** call settlement MCP tools.

### Global mode (`mcpMode: "global"`)

Confirm **both**:

1. Did you add **`pharos-settle`** as a **global MCP server** (from `.pharos-settle/mcp-bin.generated.json`)?
2. Is **`pharos-settle` MCP** connected/reloaded?

Workspace root does **not** need to be Pharos-Settle. Keys still live in the clone at `repoPath` in the checklist.

If **no** → [docs/mcp/modes.md](docs/mcp/modes.md#global-mode). Do **not** call settlement MCP tools.

### After MCP is confirmed

Set `"awaitingConfirmation": false` and `"confirmedAt"` in `.pharos-settle/setup-checklist.json`, then proceed.

### Run mode (demo vs live)

`npm run setup` also asks **demo** or **live** and saves **`runMode`** in the checklist.

- If **`runMode`** is already set → use it; do **not** re-ask unless the user wants to change.
- If **`runMode`** is missing (old checklist) → ask with AskQuestion: **Demo / mock** vs **Live test on Atlantic**.

| `runMode` | Behavior |
|-----------|----------|
| **`demo`** | `mock: true` on MCP tools, or `npm run agent:doctor:mock` / `npm run demo:simulate`. No keys needed. |
| **`live`** | MCP without `mock: true` or `npm run agent:doctor` / `npm run demo:pharos` — only after keys are set. |

**Live keys:** If `runMode` is `live` and `keysConfigured` is `false` (or keys missing in `.env` at `repoPath`), tell the user to set **`PRIVATE_KEY`** and **`AGENT_B_PRIVATE_KEY`** (full 32-byte hex, not `0x` placeholder), fund PHRS, save `.env`, then call any MCP tool (env reloads per request). Use AskQuestion: **Keys saved in .env?** before live settlement tools.

Do **not** call live settlement tools (`fund_deal`, etc. without `mock: true`) until both keys are configured.

If MCP tools are **not available** in this session, say so explicitly. Offer CLI fallback: `npm run agent:doctor:mock`, `npm run demo:simulate`.

## What this project is

**Pharos Settle** — agent-to-agent escrow on Pharos Atlantic with ghost protection. Use the **MCP server** (15 tools) or the **Skill** at `skills/trusted-agent-settlement/SKILL.md`.

| Layer | Path |
|-------|------|
| Skill (instructions) | `skills/trusted-agent-settlement/SKILL.md` |
| MCP server | `mcp/server.ts` — `npm run mcp` |
| Live contracts | `deployments/atlantic.json` |
| Judge quickstart | `JUDGES.md` |

## Settlement tools (MCP)

Do **not** use raw `cast send` for agent payments. Use MCP tools or SDK:

`get_agent_readiness` → `simulate_trusted_settlement` → `fund_deal` → `submit_delivery` → `attest_release` → `complete_claim_for_deal`

Mock mode: pass `mock: true` when no wallet keys are configured.

## Network

- Chain: Pharos Atlantic **688689**
- RPC: `https://atlantic.dplabs-internal.com`
- Gas: **PHRS**
- Tokens: `deployments/atlantic.json` → `allowedTokens`
