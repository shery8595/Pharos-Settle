import { describe, it, expect, beforeAll } from "vitest";
import { createPublicClient } from "viem";
import { transportFromConfig } from "../../src/shared/clients.js";
import { tokenAllowlistAbi } from "../../src/shared/abis.js";
import { preflight } from "../../src/internal/preflight/index.js";
import { simulateTrustedSettlement, registerRecipients } from "../../src/trustedAgentSettlement.js";
import { loadAllowedTokens } from "../../src/shared/chain.js";
import { getAtlanticTestContext, atlanticSdkConfig } from "../helpers/atlantic-config.js";
import type { Address } from "viem";

const ctx = getAtlanticTestContext();
const describeAtlantic = ctx.ready ? describe.sequential : describe.skip;

describeAtlantic("Atlantic smoke", () => {
  const config = atlanticSdkConfig(ctx);
  const usdc = "0xcfC8330f4BCAB529c625D12781b1C19466A9Fc8B";

  beforeAll(() => {
    if (!ctx.ready) {
      throw new Error(ctx.skipReason ?? "Atlantic context not ready");
    }
  });

  it("preflight ready for seeded agents + TEST", async () => {
    const pf = await preflight(
      {
        agentA: ctx.agentA,
        agentB: ctx.agentB,
        token: ctx.token,
        amount: "1000000000000000000",
        workDescription: "atlantic smoke",
      },
      config
    );
    const failed = pf.checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.reason ?? "failed"}`);
    expect(pf.ready, `preflight failed — ${failed.join("; ")} — run npm run seed:pharos`).toBe(true);
  });

  it("simulate returns fee quote and fund nextAction", async () => {
    const sim = await simulateTrustedSettlement(
      {
        agentA: ctx.agentA,
        agentB: ctx.agentB,
        token: ctx.token,
        amount: "1000000000000000000",
        workDescription: "atlantic simulate",
      },
      config
    );
    const failed = sim.stages.preflight.checks
      .filter((c) => !c.passed)
      .map((c) => `${c.name}: ${c.reason ?? "failed"}`);
    expect(sim.success, `simulate failed — ${failed.join("; ")}`).toBe(true);
    expect(sim.nextAction).toBe("fund");
    expect(sim.feeQuote?.feeBps).toBe(100);
  });

  it("loadAllowedTokens includes USDC and TEST", () => {
    const tokens = loadAllowedTokens("atlantic");
    expect(tokens.length).toBeGreaterThanOrEqual(6);
    expect(tokens.some((t) => t.symbol === "USDC")).toBe(true);
    expect(tokens.some((t) => t.symbol === "TEST")).toBe(true);
  });

  it("allowlist isAllowed for USDC", async () => {
    const deployments = ctx.deployments as { tokenAllowlist: string };
    const client = createPublicClient({
      transport: transportFromConfig(config, ctx.rpcUrl),
    });
    const allowed = await client.readContract({
      address: deployments.tokenAllowlist as Address,
      abi: tokenAllowlistAbi,
      functionName: "isAllowed",
      args: [usdc as Address],
    });
    expect(allowed).toBe(true);
  });

  it("registerRecipients reports agentB already registered", async () => {
    const result = await registerRecipients([ctx.agentB], config);
    expect(result.success).toBe(true);
    expect(result.alreadyRegistered.map((a) => a.toLowerCase())).toContain(ctx.agentB.toLowerCase());
  });
});

if (!ctx.ready) {
  describe("Atlantic smoke (skipped)", () => {
    it(ctx.skipReason ?? "skipped", () => {
      expect(ctx.skipReason).toBeTruthy();
    });
  });
}
