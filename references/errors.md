# Global Error Reference

> Network: read `assets/networks.json`. Contracts: `assets/deployments.json`.

| Error / CLI signature | Cause | Suggested action |
|----------------------|-------|------------------|
| `invalid address` | Address format wrong | Confirm `0x` + 40 hex chars (42 total) |
| `transaction not found` | TX hash missing or node syncing | Recheck hash; wait and retry |
| Empty return from `cast call` | No contract at address | Confirm router address and network |
| `execution reverted` | Contract reverted | Read revert reason in output |
| `insufficient funds` | Balance too low for amount + gas | `cast balance $DEPLOYER --rpc-url $RPC --ether` |
| `nonce too low` | Pending tx conflict | Wait for prior tx or set `--nonce` |
| `connection refused` | Missing `--rpc-url` | Always pass `--rpc-url $RPC` |
| `only payee` | Wrong key for delivery/claim | Use payee's `$PRIVATE_KEY` |
| `only payer` | Wrong key for attest/reject | Use payer's `$PRIVATE_KEY` |
| `only arbiter` | Wrong key for resolve | Use `ARBITER_PRIVATE_KEY` |
| `sponsor not registered` | Payer not on AgentRegistry | Register payer first (owner or sponsor flow) |
| `token not allowed` | Token not on allowlist | Pick token from `assets/tokens.json` |
| `Still locked` | Time lock not expired (vault-style) | N/A for settlement — use `canClaim()` |
| `PRIVATE_KEY not set` | Env not exported | `export PRIVATE_KEY=0x...` |
| `cast` / `forge: command not found` | Foundry not installed | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| MCP `isError: true` | Tool validation or on-chain revert | Parse JSON `content[0].text`; use `get_settlement_status` |
| MCP not connected | User chose MCP path without IDE MCP | Use Method A (cast) or run `npm run mcp` setup — see `references/mcp.md` |
