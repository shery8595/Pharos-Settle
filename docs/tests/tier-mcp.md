# Tier 4: MCP tests

**Runner:** Vitest  
**Path:** `test/mcp/tools.vitest.ts`  
**Count:** 19 tests (`tools.vitest.ts` + `two-agent-flow.vitest.ts`)

## Coverage

### `test/mcp/tools.vitest.ts` (14 tests)

Smoke MCP tool handlers with mock config — single payment, batch (`saliFast` / `hybridWork`), readiness, and error paths.

| Area | Tools |
|------|-------|
| Single payment | `simulate_trusted_settlement`, `execute_trusted_settlement`, `fund_deal`, `submit_delivery`, `attest_release`, `complete_claim_for_deal` |
| Batch | `fund_deals_batch`, `submit_deliveries_batch`, `attest_releases_batch`, `complete_claims_batch`, `execute_batch_settlement` |
| Other | `get_settlement_status`, `register_recipients`, `reclaim_trusted_settlement`, `get_agent_readiness` |

### `test/mcp/two-agent-flow.vitest.ts` (5 tests)

Payer/payee role split: fund → deliver → attest → claim without demo shortcuts.

## Approach

Calls tool handler logic directly (or via in-memory MCP server) with `mock: true`.

Asserts JSON response shape: `success`, `nextAction`, no throw.

## Run

Included in `npm run test:unit` and `npm test`.

## Related docs

- [MCP tools](../mcp/tools.md)
- [MCP architecture](../mcp/architecture.md)
