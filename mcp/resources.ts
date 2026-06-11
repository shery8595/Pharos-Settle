import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function readAtlanticDeployments(): string {
  const p = join(process.cwd(), "deployments", "atlantic.json");
  if (!existsSync(p)) {
    return JSON.stringify({ error: "Not deployed. Run npm run deploy:pharos" }, null, 2);
  }
  return readFileSync(p, "utf-8");
}

export const QUICKSTART = `# Pharos Settle quickstart (cast-first, MCP-supported)

## Default pre-checks
1. export RPC=https://atlantic.dplabs-internal.com
2. export PRIVATE_KEY=0x...
3. Read assets/deployments.json
4. cast balance $(cast wallet address --private-key $PRIVATE_KEY) --rpc-url $RPC --ether

## Cast path (preferred)
See references/settlement.md — fundAndAcceptHybrid → submitDelivery → attestRelease → claim

## MCP path (optional)
simulate_trusted_settlement → fund_deal → submit_delivery → attest_release → complete_claim_for_deal

Chain: Pharos Atlantic (688689)
`;

export function registerSettlementResources(mcpServer: McpServer) {
  mcpServer.registerResource(
    "atlantic-deployments",
    "pharos://deployments/atlantic",
    {
      title: "Atlantic Deployments",
      description: "Live Atlantic contract addresses (SettlementRouter, DealEscrow, tokens)",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "pharos://deployments/atlantic",
          mimeType: "application/json",
          text: readAtlanticDeployments(),
        },
      ],
    })
  );

  mcpServer.registerResource(
    "skill-quickstart",
    "pharos://skill/quickstart",
    {
      title: "Skill Quickstart",
      description: "Setup and usage guide for the Pharos Settle Skill",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: "pharos://skill/quickstart",
          mimeType: "text/markdown",
          text: QUICKSTART,
        },
      ],
    })
  );
}
