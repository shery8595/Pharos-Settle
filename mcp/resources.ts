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

export const QUICKSTART = `# trusted-agent-settlement quickstart

## Environment
PRIVATE_KEY=0x...          # Agent A (payer)
AGENT_B_PRIVATE_KEY=0x...  # Agent B (payee)
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com

## Flow
1. simulate_trusted_settlement (mode: cooperative)
2. execute_trusted_settlement when preflight.ready
3. get_settlement_status to poll nextAction

## Modes
- cooperative: fund → deliver → attest → claim
- safetyNet: reclaim when payee never delivered

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
