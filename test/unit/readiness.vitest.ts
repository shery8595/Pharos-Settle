import { describe, it, expect } from "vitest";
import { detectAgentRole, allowedToolsForRole } from "../../src/internal/agent/readiness.js";
import { getAgentReadiness } from "../../src/internal/agent/readiness.js";

describe("agent readiness", () => {
  it("detectAgentRole returns mock without keys", () => {
    const prevA = process.env.PRIVATE_KEY;
    const prevB = process.env.AGENT_B_PRIVATE_KEY;
    delete process.env.PRIVATE_KEY;
    delete process.env.AGENT_B_PRIVATE_KEY;
    expect(detectAgentRole()).toBe("mock");
    process.env.PRIVATE_KEY = prevA;
    process.env.AGENT_B_PRIVATE_KEY = prevB;
  });

  it("payer role allowedTools exclude submit_delivery-only confusion", () => {
    const tools = allowedToolsForRole("payer");
    expect(tools).toContain("fund_deal");
    expect(tools).toContain("attest_release");
    expect(tools).not.toContain("execute_trusted_settlement");
  });

  it("payee role allowedTools include deliver and claim", () => {
    const tools = allowedToolsForRole("payee");
    expect(tools).toContain("submit_delivery");
    expect(tools).toContain("complete_claim_for_deal");
    expect(tools).not.toContain("fund_deal");
  });

  it("mock readiness is ready without keys", async () => {
    const r = await getAgentReadiness({ mock: true, deploymentNetwork: "atlantic" });
    expect(r.role).toBe("mock");
    expect(r.ready).toBe(true);
    expect(r.checks[0]?.name).toBe("mock_mode");
    expect(r.allowedTools.length).toBe(17);
  });
});
