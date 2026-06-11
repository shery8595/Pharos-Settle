import { describe, it, expect, beforeAll } from "vitest";
import { registerSettlementTools } from "../../mcp/tools.js";

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: { text: string }[] }>;

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

describe("two-MCP cooperative flow (mock)", () => {
  const server = mockMcpServer();
  const baseArgs = {
    agentA: "0x1111111111111111111111111111111111111111",
    agentB: "0x2222222222222222222222222222222222222222",
    token: "0x3333333333333333333333333333333333333333",
    amount: "1000000000000000000",
    workDescription: "two-agent flow task",
    mock: true,
  };

  beforeAll(() => {
    registerSettlementTools(server as never);
  });

  function parse(res: { content: { text: string }[] }) {
    return JSON.parse(res.content[0].text);
  }

  it("payer funds then payee delivers then payer attests then payee claims", async () => {
    const fund = parse(await server.call("fund_deal", { ...baseArgs }));
    expect(fund.success).toBe(true);
    expect(fund.dealId).toBe("1");
    expect(fund.nextAction).toBe("deliver");
    expect(fund.terms?.workHash).toBeDefined();

    const deliver = parse(
      await server.call("submit_delivery", {
        dealId: fund.dealId,
        workDescription: baseArgs.workDescription,
        mock: true,
      })
    );
    expect(deliver.success).toBe(true);

    const attest = parse(
      await server.call("attest_release", {
        dealId: fund.dealId,
        workDescription: baseArgs.workDescription,
        mock: true,
      })
    );
    expect(attest.success).toBe(true);

    const claim = parse(
      await server.call("complete_claim_for_deal", {
        dealId: fund.dealId,
        mock: true,
      })
    );
    expect(claim.success).toBe(true);
    expect(claim.nextAction).toBe("done");
  });

  it("readiness returns role-specific allowedTools in mock", async () => {
    const body = parse(await server.call("get_agent_readiness", { mock: true }));
    expect(body.role).toBe("mock");
    expect(body.allowedTools).toContain("fund_deal");
    expect(body.allowedTools).toContain("submit_delivery");
  });

  it("status includes terms for handoff", async () => {
    const body = parse(await server.call("get_settlement_status", { dealId: "1", mock: true }));
    expect(body.terms).toBeDefined();
    expect(body.terms.payer).toBeDefined();
    expect(body.terms.workHash).toBeDefined();
  });

  it("saliFast batch: fund_deals_batch then complete_claims_batch", async () => {
    const jobs = Array.from({ length: 3 }, (_, i) => ({
      ...baseArgs,
      workDescription: `sali batch ${i + 1}`,
      requiresHybridRelease: false,
    }));
    const funded = parse(
      await server.call("fund_deals_batch", { jobs, batchMode: "saliFast", mock: true })
    );
    expect(funded.success).toBe(true);
    expect(funded.manifest).toHaveLength(3);

    const claims = funded.manifest.map((m: { dealId: string; fundTx: string; amount: string; agentB: string }) => ({
      dealId: m.dealId,
      fundTx: m.fundTx,
      amount: m.amount,
      agentB: m.agentB,
    }));
    const claimed = parse(
      await server.call("complete_claims_batch", { claims, mock: true })
    );
    expect(claimed.success).toBe(true);
    expect(claimed.succeeded).toBe(3);
  });

  it("hybridWork batch: fund -> deliver -> attest -> claim", async () => {
    const jobs = Array.from({ length: 3 }, (_, i) => ({
      ...baseArgs,
      workDescription: `hybrid batch ${i + 1}`,
      requiresHybridRelease: true,
    }));
    const funded = parse(
      await server.call("fund_deals_batch", { jobs, batchMode: "hybridWork", mock: true })
    );
    const deliveries = funded.manifest.map((m: { dealId: string; workDescription: string }) => ({
      dealId: m.dealId,
      workDescription: m.workDescription,
    }));
    const delivered = parse(
      await server.call("submit_deliveries_batch", { deliveries, mock: true })
    );
    expect(delivered.success).toBe(true);

    const attested = parse(
      await server.call("attest_releases_batch", { attestations: deliveries, mock: true })
    );
    expect(attested.success).toBe(true);

    const claims = funded.manifest.map((m: { dealId: string; fundTx: string; amount: string; agentB: string }) => ({
      dealId: m.dealId,
      fundTx: m.fundTx,
      amount: m.amount,
      agentB: m.agentB,
    }));
    const claimed = parse(
      await server.call("complete_claims_batch", { claims, mock: true })
    );
    expect(claimed.success).toBe(true);
  });
});
