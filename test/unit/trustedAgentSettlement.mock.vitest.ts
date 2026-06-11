import { describe, it, expect } from "vitest";
import {
  executeTrustedSettlement,
  executeBatchSettlement,
  simulateTrustedSettlement,
  registerRecipients,
} from "../../src/trustedAgentSettlement.js";

describe("trustedAgentSettlement (mock)", () => {
  const input = {
    agentA: "0x1111111111111111111111111111111111111111",
    agentB: "0x2222222222222222222222222222222222222222",
    token: "0x3333333333333333333333333333333333333333",
    amount: "1000000000000000000",
    workDescription: "pipeline test task",
  };

  it("simulate passes with mock", async () => {
    const r = await simulateTrustedSettlement(input, { mock: true });
    expect(r.success).toBe(true);
    expect(r.stages.preflight.ready).toBe(true);
    expect(r.nextAction).toBe("fund");
    expect(r.feeQuote?.grossAmount).toBe(input.amount);
  });

  it("execute mock returns receipt tier verification", async () => {
    const r = await executeTrustedSettlement(input, { mock: true });
    expect(r.success).toBe(true);
    expect(r.stages.prove.postSettlement?.method).toBe("receipt");
    expect(r.stages.settle?.settlementReceipt?.finalityMs).toBeGreaterThan(0);
  });

  it("idempotent execute returns cached receipt", async () => {
    const a = await executeTrustedSettlement(input, { mock: true });
    const b = await executeTrustedSettlement(input, { mock: true });
    expect(a.dealId).toBe(b.dealId);
    expect(a.stages.settle?.claimTx).toBe(b.stages.settle?.claimTx);
  });

  it("simulate suggests onboardRecipient when only payee unregistered", async () => {
    const unregistered = "0x4444444444444444444444444444444444444444";
    const r = await simulateTrustedSettlement(
      { ...input, agentB: unregistered },
      { mock: true }
    );
    expect(r.nextAction).toBe("onboardRecipient");
    expect(r.success).toBe(true);
  });

  it("auto onboard then execute mock settlement", async () => {
    const unregistered = "0x4444444444444444444444444444444444444444";
    const r = await executeTrustedSettlement(
      { ...input, agentB: unregistered },
      { mock: true, autoOnboardRecipients: true }
    );
    expect(r.success).toBe(true);
    expect(r.stages.onboard?.recipients).toContain(unregistered);
  });

  it("registerRecipients mock registers batch", async () => {
    const addrs = [
      "0x4444444444444444444444444444444444444444",
      "0x5555555555555555555555555555555555555555",
    ];
    const r = await registerRecipients(addrs, { mock: true });
    expect(r.success).toBe(true);
    expect(r.registered).toEqual(addrs);
  });

  it("batch settlement mock completes N deals", async () => {
    const jobs = Array.from({ length: 3 }, (_, i) => ({
      ...input,
      workDescription: `batch task ${i}`,
      requiresHybridRelease: false,
    }));
    const batch = await executeBatchSettlement(jobs, { mock: true });
    expect(batch.success).toBe(true);
    expect(batch.succeeded).toBe(3);
    expect(batch.maxParallelInBlock).toBe(3);
    expect(batch.endToEndDealsPerSec).toBeGreaterThan(0);
  });

  it("fails preflight on bad address", async () => {
    const r = await simulateTrustedSettlement({ ...input, agentA: "bad" }, { mock: true });
    expect(r.success).toBe(false);
  });
});
