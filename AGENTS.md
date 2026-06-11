# Pharos Settle — agent instructions (all IDEs)

Portable guide for **Cursor**, **Claude Desktop**, **Windsurf**, **Cline**, and other MCP-capable agents.

## Quick setup

```bash
git clone https://github.com/shery8595/Pharos-Settle.git
cd Pharos-Settle
npm run setup
```

Then configure MCP for your IDE — see [docs/mcp/other-ides.md](docs/mcp/other-ides.md).

## MCP readiness gate (ask user before settlement tools)

After `npm run setup`, read **`.pharos-settle/setup-checklist.json`**. If `"awaitingConfirmation": true` (or the user just ran setup):

**Ask the user to confirm both** (use AskQuestion / multiple-choice if available):

1. Is **Pharos-Settle** opened as the **workspace / project root** (not a parent folder)?
2. Is the **`pharos-settle` MCP server** connected/reloaded in this IDE?

If **no** → give IDE-specific steps from [docs/mcp/other-ides.md](docs/mcp/other-ides.md). Do **not** call settlement MCP tools.

If **yes** → set `"awaitingConfirmation": false` and `"confirmedAt"` in `.pharos-settle/setup-checklist.json`, then proceed.

**Then ask how they want to run** (use AskQuestion when available):

| Prompt | Options |
|--------|---------|
| **Demo (mock)** or **live Atlantic test**? | **Demo / mock — no keys** / **Live test on Atlantic** |

- **Demo:** Use `mock: true` on MCP tools, or CLI: `npm run agent:doctor:mock`, `npm run demo:simulate`. No `.env` keys needed.
- **Live test:** They must set **`PRIVATE_KEY`** (payer) and **`AGENT_B_PRIVATE_KEY`** (payee) in **`.env`** first (created from `.env.example` by `npm run setup`). Keys must be full 32-byte hex (not the `0x` placeholder). MCP re-reads `.env` on each tool call — no restart needed after saving keys. Remind them wallets need PHRS on Atlantic. Then `npm run agent:doctor` or MCP without `mock: true`.

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
