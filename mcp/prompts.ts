import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerSettlementPrompts(mcpServer: McpServer) {
  mcpServer.registerPrompt(
    "pay-agent-for-task",
    {
      description: "Cooperative flow: pay another agent on Pharos for completed work (e.g. data labeling)",
      argsSchema: {
        payee: z.string().describe("Payee agent address"),
        amount: z.string().describe("Amount in wei"),
        task: z.string().describe("Work description"),
      },
    },
    async ({ payee, amount, task }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Use trusted-agent-settlement MCP tools to safely pay agent ${payee} ${amount} TEST on Pharos Atlantic for: "${task}".

Steps:
1. Call simulate_trusted_settlement with mode cooperative
2. If preflight.ready, call execute_trusted_settlement
3. Report dealId, explorerLink, and nextAction`,
          },
        },
      ],
    })
  );

  mcpServer.registerPrompt(
    "recover-from-ghost-payer",
    {
      description: "Safety net: payee delivered but payer ghosted — poll until auto-release",
      argsSchema: {
        dealId: z.string().describe("Deal ID"),
      },
    },
    async ({ dealId }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Deal ${dealId} on Pharos: payer may have ghosted after payee delivered work.

1. Call get_settlement_status for deal ${dealId}
2. If nextAction is wait, poll until autoReleaseAt passes
3. When canClaim is true, complete the payment flow`,
          },
        },
      ],
    })
  );
}
