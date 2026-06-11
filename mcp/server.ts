#!/usr/bin/env node
/**
 * Protocol-compliant MCP server (stdio) for trusted-agent-settlement.
 * Run: npm run mcp
 */
import { reloadProjectEnv } from "./reload-env.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSettlementTools } from "./tools.js";
import { registerSettlementResources } from "./resources.js";
import { registerSettlementPrompts } from "./prompts.js";

reloadProjectEnv();

const mcpServer = new McpServer({
  name: "trusted-agent-settlement",
  version: "1.3.0",
});

registerSettlementTools(mcpServer);
registerSettlementResources(mcpServer);
registerSettlementPrompts(mcpServer);

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  process.stderr.write("trusted-agent-settlement MCP server ready\n");
}

main().catch((err) => {
  console.error("MCP server error:", err);
  process.exit(1);
});
