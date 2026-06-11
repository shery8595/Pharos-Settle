# MCP setup

Canonical integration: **stdio MCP** (`npm run mcp`). HTTP bridge is deprecated demo-only.

## First-run checklist

```bash
npm run setup                # install + build + skill + verify MCP config
```

1. **Open `Pharos-Settle` as workspace root** (not a parent folder)
2. Restart Cursor / reload MCP (`pharos-settle` is in committed `.cursor/mcp.json`)
3. `npm run agent:doctor:mock` — no keys, explore safely
4. Optional: `npm run mcp` in another terminal for manual stdio test
5. Call `get_agent_readiness` then `simulate_trusted_settlement` with `mock: true`
6. For live: fund wallets, `npm run agent:doctor`, then `fund_deal` / split flow

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

Without any private key, MCP defaults to **mock mode**.

## Verify

1. Restart Cursor / reload MCP
2. List tools — should see **15 tools** (see [roles.md](roles.md))
3. `get_agent_readiness` with `mock: true`
4. `simulate_trusted_settlement` with mock addresses

## Known failures

| Symptom | Fix |
|---------|-----|
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
