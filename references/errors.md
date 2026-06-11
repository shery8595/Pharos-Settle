# Global Error Reference

> Network: read `assets/networks.json`. Contracts: `assets/deployments.json`.  
> Escalation: [execution.md](execution.md)

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
| `only payer` | Fund/attest/reject caller is not deal payer | Fund paths require payer wallet; use payer's `$PRIVATE_KEY` |
| `dispute window >= ttl` | Hybrid deal: dispute window not shorter than TTL | Set `disputeWindowSeconds` < `ttlSeconds` (SDK default: 3d / 7d) |
| `only arbiter` | Wrong key for resolve | Use `ARBITER_PRIVATE_KEY` |
| `sponsor not registered` | Payer not on AgentRegistry | Register payer first (owner or sponsor flow) |
| `token not allowed` | Token not on allowlist | Pick token from `assets/tokens.json` |
| `Still locked` | Time lock not expired (vault-style) | N/A for settlement — use `canClaim()` |
| `PRIVATE_KEY not set` | Env not exported for cast write | Stop; prompt user: set in `.env`, then `export PRIVATE_KEY=0x...` — see [execution.md#cast-key-gate](execution.md#cast-key-gate) |
| User wants live cast write, no key | Pre-check #2 failed | Prompt: save in `.env`; on "proceed" agent loads `.env` into shell and stays on cast |
| User said keys set, cast still fails | `.env` not loaded into shell | Agent runs `source .env` (bash) or PowerShell env load — see execution.md |
| Payee step, no `AGENT_B_PRIVATE_KEY` | Wrong/missing payee key | Prompt for payee key; use payee's `--private-key` on deliver/claim |
| `cast` / `forge: command not found` | Foundry not installed (not in `npm install`) | Pre-check #0 failed — offer: install Foundry, or tier 2 `pay:once`, tier 3 MCP, or `demo:judge` — [execution.md#foundry-gate](execution.md#foundry-gate) |
| User said cast only, Foundry missing | Cannot use tier 1 | Require Foundry install; do not silently switch to npm/MCP |
| MCP `isError: true` | Tool validation or on-chain revert | Parse JSON `content[0].text`; use `get_settlement_status` |
| Task needs mock / no keys | Cast cannot mock | Tier 2: `npm run demo:judge`; tier 3: MCP `mock: true`; tier 4: setup |
| Task needs nextAction / full preflight | Cast cannot compute | Tier 2: `npm run pay:once --simulate`; tier 3: `simulate_trusted_settlement` |
| Task needs batch manifest | Cast loop is manual | Tier 2: `batch:fund` / `batch:claim`; tier 3: batch MCP tools |
| MCP not connected but workflow needs tier 3 | No IDE MCP in session | State explicitly; tier 4 setup — **do not** pretend MCP is on |
| Cast cannot express workflow | Orchestration beyond atomic txs | Escalate per [execution.md](execution.md): npm → MCP → setup |
