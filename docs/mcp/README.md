# MCP server

Model Context Protocol server for **Pharos Settle** — Stripe Checkout for AI agents on Pharos. Exposes 17 settlement tools to Cursor, Claude Desktop, and other MCP clients.

## Run

```bash
npm run mcp        # stdio (canonical)
npm run agent:doctor:mock
npm run mcp:http   # deprecated HTTP demo only
```

Prefer **stdio** for agent integration. See [setup.md](setup.md) for payer-only / payee-only / demo configs.

## Documentation

| Doc | Content |
|-----|---------|
| [Setup](setup.md) | Cursor / Claude configuration |
| [Roles](roles.md) | Payer vs payee tool matrix |
| [SALI FastPay](batch-sali.md) | Batch agent payroll — saliFast vs hybridWork |
| [Tools](tools.md) | Tool schemas and responses |
| [Resources and prompts](resources-and-prompts.md) | URIs and prompt templates |
| [Architecture](architecture.md) | Server wiring |

## Tools (17)

`get_agent_readiness` · `simulate_trusted_settlement` · `fund_deal` · `fund_deals_batch` · `submit_delivery` · `submit_deliveries_batch` · `attest_release` · `attest_releases_batch` · `complete_claim_for_deal` · `complete_claims_batch` · `get_settlement_status` · `register_recipients` · `reclaim_trusted_settlement` · `reject_delivery` · `resolve_dispute` · `execute_trusted_settlement` · `execute_batch_settlement`

## Mock mode

When no private key is set, tools default to `mock: true`.

## Related tests

[Tier 4: MCP](../tests/tier-mcp.md) · `test/mcp/tools.vitest.ts` · `test/mcp/two-agent-flow.vitest.ts`
