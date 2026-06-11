/**
 * DEPRECATED — demo-only HTTP bridge. Canonical agent integration: npm run mcp (stdio).
 * This surface may expose fewer tools than stdio MCP and is not maintained for parity.
 */
import "dotenv/config";
import { createServer } from "node:http";

const PORT = Number(process.env.MCP_PORT ?? 3921);

const DEPRECATED_TOOLS = [
  "simulate_trusted_settlement",
  "execute_trusted_settlement",
  "get_settlement_status",
  "reclaim_trusted_settlement",
];

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/tools") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        deprecated: true,
        canonical: "npm run mcp",
        tools: DEPRECATED_TOOLS,
        note: "Use stdio MCP for full tool set including fund_deal, submit_delivery, get_agent_readiness",
      })
    );
    return;
  }

  if (req.method === "POST" && req.url === "/call") {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = JSON.parse(Buffer.concat(chunks).toString()) as {
      tool: string;
      input: Record<string, unknown>;
      config?: Record<string, unknown>;
    };

    try {
      const {
        executeTrustedSettlement,
        simulateTrustedSettlement,
        getSettlementStatus,
        reclaimTrustedSettlement,
      } = await import("../src/trustedAgentSettlement.js");

      const cfg = {
        ...(body.config ?? {}),
        mock: body.config?.mock ?? !process.env.PRIVATE_KEY,
        deploymentNetwork: "atlantic",
      };

      let result: unknown;
      switch (body.tool) {
        case "simulate_trusted_settlement":
          result = await simulateTrustedSettlement(body.input as never, cfg as never);
          break;
        case "execute_trusted_settlement":
          result = await executeTrustedSettlement(body.input as never, cfg as never);
          break;
        case "get_settlement_status":
          result = await getSettlementStatus(String(body.input.dealId), cfg as never);
          break;
        case "reclaim_trusted_settlement":
          result = await reclaimTrustedSettlement(String(body.input.dealId), cfg as never);
          break;
        default:
          throw new Error(`unknown tool: ${body.tool} — use stdio MCP (npm run mcp)`);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result, deprecated: true }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: (e as Error).message, deprecated: true }));
    }
    return;
  }

  res.writeHead(404);
  res.end("not found — use stdio MCP: npm run mcp");
});

server.listen(PORT, () => {
  console.error(
    `DEPRECATED HTTP bridge on http://localhost:${PORT} — use stdio MCP: npm run mcp`
  );
});
