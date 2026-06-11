# MCP resources and prompts

## Resources

### pharos://deployments/atlantic

**ID:** `atlantic-deployments`

Returns `deployments/atlantic.json` contents — contract addresses, chainId, `allowedTokens`.

If not deployed:

```json
{ "error": "Not deployed. Run npm run deploy:pharos" }
```

### pharos://skill/quickstart

**ID:** `skill-quickstart`

Markdown quickstart: env vars, simulate→execute flow, modes.

Defined inline in `mcp/resources.ts` as `QUICKSTART`.

## Prompts

### pay-agent-for-task

**Args:** `payee`, `amount`, `task`

Generates a user message instructing the agent to:

1. `simulate_trusted_settlement` (cooperative)
2. `execute_trusted_settlement` if ready
3. Report dealId, explorerLink, nextAction

### recover-from-ghost-payer

**Args:** `dealId`

Generates instructions to:

1. `get_settlement_status`
2. Poll until `autoReleaseAt`
3. `complete_claim_for_deal` when `canClaim`

### recover-from-ghost-payee

**Args:** `dealId`

Generates instructions to:

1. `get_settlement_status`
2. Poll until `nextAction` is `reclaim` (past deal deadline)
3. `reclaim_trusted_settlement`

## Usage in Cursor

Prompts appear in MCP prompt picker. Resources can be attached as context for contract addresses.

## Related source

- `mcp/resources.ts`
- `mcp/prompts.ts`
