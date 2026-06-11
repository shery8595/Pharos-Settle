# MCP setup

Canonical integration: **stdio MCP** (`npm run mcp`). HTTP bridge is deprecated demo-only.

## First-run checklist

```bash
npm run setup                # install + build + skill + .env + MCP mode prompt
```

Setup asks **project** or **global** MCP mode, then **demo** or **live** — see [modes.md](modes.md).

Non-interactive: `npm run setup -- --mode=global --run=live`

Setup copies **`.env.example` → `.env`** (skips if `.env` already exists). Keys are empty placeholders — safe for demo.

### Project mode (default)

1. **Open `Pharos-Settle` as workspace root** (not a parent folder)
2. Restart Cursor / reload MCP (`pharos-settle` is in committed `.cursor/mcp.json`)

### Global mode

1. Setup writes **`~/.cursor/mcp.json`** (`npm run mcp:install-global` if needed)
2. Reload **pharos-settle** in Settings → MCP — works from **any** workspace

### Then (both modes)

3. **Demo (recommended first):** `npm run agent:doctor:mock` — no keys, explore safely
4. **Live test:** edit `.env` — set `PRIVATE_KEY` (payer) and `AGENT_B_PRIVATE_KEY` (payee), fund PHRS, then `npm run agent:doctor`
5. Optional: `npm run mcp` in another terminal for manual stdio test
6. In chat, the agent should **confirm your MCP mode** (project or global), then **demo vs live** — see [AGENTS.md](../../AGENTS.md), [modes.md](modes.md), and `.pharos-settle/setup-checklist.json`
7. **Other IDEs (Claude Desktop, etc.):** [other-ides.md](other-ides.md) — copy `.pharos-settle/mcp.generated.json`
8. Call `get_agent_readiness` then `simulate_trusted_settlement` with `mock: true`
9. For live: set keys in `.env`, fund wallets, `npm run agent:doctor`, then `fund_deal` / split flow

Legacy: hand-written MCP config below (only if not using committed `.cursor/mcp.json`)

## Payer MCP (one key)

```json
{
  "mcpServers": {
    "pharos-settle-payer": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "E:/pharos",
      "env": {
        "PRIVATE_KEY": "0x...",
        "PHAROS_RPC_URL": "https://atlantic.dplabs-internal.com"
      }
    }
  }
}
```

Tools: `fund_deal`, `fund_deals_batch`, `attest_release`, `attest_releases_batch`, `register_recipients`, `reclaim_trusted_settlement`, `get_settlement_status`, `simulate_trusted_settlement`, `get_agent_readiness`.

## Payee MCP (one key)

```json
{
  "mcpServers": {
    "pharos-settle-payee": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "E:/pharos",
      "env": {
        "AGENT_B_PRIVATE_KEY": "0x...",
        "PHAROS_RPC_URL": "https://atlantic.dplabs-internal.com"
      }
    }
  }
}
```

Tools: `submit_delivery`, `submit_deliveries_batch`, `complete_claim_for_deal`, `complete_claims_batch`, `get_settlement_status`, `simulate_trusted_settlement`, `get_agent_readiness`.

## Demo MCP (both keys — shortcut)

```json
{
  "mcpServers": {
    "pharos-settle-demo": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "E:/pharos",
      "env": {
        "PRIVATE_KEY": "0x...",
        "AGENT_B_PRIVATE_KEY": "0x...",
        "PHAROS_RPC_URL": "https://atlantic.dplabs-internal.com"
      }
    }
  }
}
```

Use `execute_trusted_settlement` or `execute_batch_settlement` for one-shot demos. For real split agents, use payer + payee configs above (see [roles.md](roles.md) and [batch-sali.md](batch-sali.md)).

Replace `cwd` with your absolute project path.

## Claude Desktop

Same JSON structure in Claude's MCP config file (location varies by OS).

## Environment

See [Environment variables](../getting-started/environment.md).

Without any valid private key (`PRIVATE_KEY` length ≥ 66), MCP defaults to **mock mode**.

After you edit `.env`, the next MCP tool call **re-reads `.env` from disk** — you do not need to restart MCP for key changes (unlike one-shot CLI commands, which always start fresh).

## Verify

1. Restart Cursor / reload MCP
2. List tools — should see **17 tools** (see [roles.md](roles.md))
3. `get_agent_readiness` with `mock: true`
4. `simulate_trusted_settlement` with mock addresses

## Known failures

| Symptom | Fix |
|---------|-----|
| Still in mock after saving keys in `.env` | Call any tool again (env reloads per request). Ensure keys are full 32-byte hex, not `0x` placeholder |
| `Missing payer private key` on payee MCP | Use `submit_delivery` / `complete_claim_for_deal`, not `fund_deal` |
| `Missing payee private key` on payer MCP | Use `fund_deal` / `attest_release`, not `submit_delivery` |
| Preflight `agent_b_registered` fails | `register_recipients` or `autoOnboardRecipients: true` |
| `sufficient_allowance` fails | Approve DealEscrow for token amount |
| Delivery reverts | `workDescription` must match payer's exactly, or pass correct `resultHash` |

## Legacy HTTP bridge (deprecated)

```bash
npm run mcp:http
```

Exposes fewer tools. Use stdio MCP for agents.

## Related docs

- [Roles and tool matrix](roles.md)
- [Batch / SALI](batch-sali.md)
- [Tools reference](tools.md)
- [MCP architecture](architecture.md)
