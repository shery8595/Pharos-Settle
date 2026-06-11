import { describe, it, expect, beforeAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSettlementTools } from "../../mcp/tools.js";

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: { text: string }[]; isError?: boolean }>;

type RegisteredTools = Record<string, { enabled: boolean; handler: ToolHandler }>;

export const EXPECTED_MCP_TOOLS = [
  "attest_release",
  "attest_releases_batch",
  "complete_claim_for_deal",
  "complete_claims_batch",
  "execute_batch_settlement",
  "execute_trusted_settlement",
  "fund_deal",
  "fund_deals_batch",
  "get_agent_readiness",
  "get_settlement_status",
  "reclaim_trusted_settlement",
  "reject_delivery",
  "register_recipients",
  "simulate_trusted_settlement",
  "submit_delivery",
  "submit_deliveries_batch",
] as const;

function mockMcpServer() {
  const tools = new Map<string, ToolHandler>();
  return {
    registerTool: (name: string, _meta: unknown, handler: ToolHandler) => {
      tools.set(name, handler);
    },
    call: async (name: string, args: Record<string, unknown>) => {
      const handler = tools.get(name);
      if (!handler) throw new Error(`missing tool ${name}`);
      return handler(args);
    },
  };
}

function getRegisteredTools(server: McpServer): RegisteredTools {
  return (server as unknown as { _registeredTools: RegisteredTools })._registeredTools;
}

describe("MCP settlement tools", () => {
  const server = mockMcpServer();
  const baseArgs = {
    agentA: "0x1111111111111111111111111111111111111111",
    agentB: "0x2222222222222222222222222222222222222222",
    token: "0x3333333333333333333333333333333333333333",
    amount: "1000000000000000000",
    workDescription: "mcp test task",
    mock: true,
  };

  beforeAll(() => {
    registerSettlementTools(server as never);
  });

  function parse(res: { content: { text: string }[] }) {
    return JSON.parse(res.content[0].text);
  }

  it("get_agent_readiness mock", async () => {
    const body = parse(await server.call("get_agent_readiness", { mock: true }));
    expect(body.role).toBe("mock");
    expect(body.allowedTools).toContain("fund_deal");
  });

  it("simulate_trusted_settlement", async () => {
    const res = await server.call("simulate_trusted_settlement", { ...baseArgs, mode: "cooperative" });
    const body = parse(res);
    expect(body.success).toBe(true);
    expect(body.nextAction).toBe("fund");
  });

  it("fund_deal", async () => {
    const res = await server.call("fund_deal", {
      ...baseArgs,
      workDescription: "fund " + Date.now(),
    });
    const body = parse(res);
    expect(body.success).toBe(true);
    expect(body.dealId).toBe("1");
    expect(body.terms?.workHash).toBeDefined();
  });

  it("submit_delivery", async () => {
    const res = await server.call("submit_delivery", {
      dealId: "1",
      workDescription: baseArgs.workDescription,
      mock: true,
    });
    const body = parse(res);
    expect(body.success).toBe(true);
  });

  it("attest_release", async () => {
    const res = await server.call("attest_release", {
      dealId: "1",
      workDescription: baseArgs.workDescription,
      mock: true,
    });
    const body = parse(res);
    expect(body.success).toBe(true);
  });

  it("execute_trusted_settlement", async () => {
    const res = await server.call("execute_trusted_settlement", {
      ...baseArgs,
      workDescription: "mcp execute " + Date.now(),
      mode: "cooperative",
    });
    const body = parse(res);
    expect(body.success).toBe(true);
  });

  it("get_settlement_status with terms", async () => {
    const res = await server.call("get_settlement_status", { dealId: "1", mock: true });
    const body = parse(res);
    expect(body.dealId).toBe("1");
    expect(body.nextAction).toBeDefined();
    expect(body.terms).toBeDefined();
  });

  it("complete_claim_for_deal in mock", async () => {
    const res = await server.call("complete_claim_for_deal", {
      dealId: "1",
      mock: true,
    });
    const body = parse(res);
    expect(body.success).toBe(true);
    expect(body.nextAction).toBe("done");
  });

  it("register_recipients", async () => {
    const addrs = [
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    ];
    const res = await server.call("register_recipients", { recipients: addrs, mock: true });
    const body = parse(res);
    expect(body.success).toBe(true);
    expect(body.registered).toEqual(addrs);
  });

  it("reject_delivery not eligible in mock default state", async () => {
    const res = await server.call("reject_delivery", { dealId: "1", mock: true });
    const body = parse(res);
    expect(body.success).toBe(false);
  });

  it("reclaim_trusted_settlement not reclaimable in mock", async () => {
    const res = await server.call("reclaim_trusted_settlement", { dealId: "1", mock: true });
    const body = parse(res);
    expect(body.success).toBe(false);
  });

  it("execute with autoOnboardRecipients", async () => {
    const res = await server.call("execute_trusted_settlement", {
      ...baseArgs,
      agentB: "0xcccccccccccccccccccccccccccccccccccccccc",
      workDescription: "mcp onboard " + Date.now(),
      autoOnboardRecipients: true,
    });
    const body = parse(res);
    expect(body.success).toBe(true);
    expect(body.stages.onboard?.recipients?.length).toBeGreaterThan(0);
  });

  it("execute_batch_settlement mock", async () => {
    const res = await server.call("execute_batch_settlement", {
      jobs: [baseArgs, { ...baseArgs, agentB: "0xdddddddddddddddddddddddddddddddddddddddd" }],
      mock: true,
    });
    const body = parse(res);
    expect(body.deals).toBe(2);
  });
});

describe("McpServer Zod v4 registration", () => {
  it("registers all sixteen tools without schema errors", () => {
    const mcp = new McpServer({ name: "test", version: "1.0.0" });
    expect(() => registerSettlementTools(mcp)).not.toThrow();
    const names = Object.keys(getRegisteredTools(mcp)).sort();
    expect(names).toEqual([...EXPECTED_MCP_TOOLS].sort());
  });

  it("invokes simulate via registered handler (post-Zod validation path)", async () => {
    const mcp = new McpServer({ name: "test", version: "1.0.0" });
    registerSettlementTools(mcp);
    const tool = getRegisteredTools(mcp).simulate_trusted_settlement;
    const res = await tool.handler({
      agentA: "0x1111111111111111111111111111111111111111",
      agentB: "0x2222222222222222222222222222222222222222",
      token: "0x3333333333333333333333333333333333333333",
      amount: "1000000000000000000",
      workDescription: "zod registration test",
      mock: true,
      mode: "cooperative",
    });
    const body = JSON.parse(res.content[0].text);
    expect(body.success).toBe(true);
    expect(body.nextAction).toBe("fund");
  });
});
