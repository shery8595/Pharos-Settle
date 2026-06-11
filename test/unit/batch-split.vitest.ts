import { describe, it, expect } from "vitest";
import {
  fundDealsBatch,
  submitDeliveriesBatch,
  attestReleasesBatch,
  claimDealsBatch,
  executeBatchSettlement,
  filterManifestForPayee,
  manifestToClaims,
} from "../../src/trustedAgentSettlement.js";

const agentA = "0x1111111111111111111111111111111111111111";
const agentB = "0x2222222222222222222222222222222222222222";
const token = "0x3333333333333333333333333333333333333333";

function jobs(n: number, hybrid: boolean) {
  return Array.from({ length: n }, (_, i) => ({
    agentA,
    agentB,
    token,
    amount: "1000000000000000000",
    workDescription: `batch unit #${i + 1}`,
    requiresHybridRelease: hybrid,
  }));
}

describe("batch split phases (mock)", () => {
  it("fundDealsBatch saliFast returns manifest", async () => {
    const funded = await fundDealsBatch(jobs(5, false), { mock: true, batchMode: "saliFast" });
    expect(funded.success).toBe(true);
    expect(funded.manifest).toHaveLength(5);
    expect(funded.manifest[0]?.fundTx).toMatch(/^0x/);
    expect(funded.batchMode).toBe("saliFast");
  });

  it("fundDealsBatch hybridWork returns manifest with workHash", async () => {
    const funded = await fundDealsBatch(jobs(3, true), { mock: true, batchMode: "hybridWork" });
    expect(funded.success).toBe(true);
    expect(funded.manifest[0]?.workHash).toMatch(/^0x/);
  });

  it("saliFast split fund then claim", async () => {
    const funded = await fundDealsBatch(jobs(5, false), { mock: true, batchMode: "saliFast" });
    const claims = funded.manifest.map((m) => ({
      dealId: m.dealId,
      fundTx: m.fundTx,
      amount: m.amount,
      agentB: m.agentB,
    }));
    const claimed = await claimDealsBatch(claims, { mock: true });
    expect(claimed.success).toBe(true);
    expect(claimed.succeeded).toBe(5);
  });

  it("hybridWork full four-phase batch mock", async () => {
    const funded = await fundDealsBatch(jobs(3, true), { mock: true, batchMode: "hybridWork" });
    const deliveries = funded.manifest.map((m) => ({
      dealId: m.dealId,
      workDescription: m.workDescription,
    }));
    const delivered = await submitDeliveriesBatch(deliveries, { mock: true });
    expect(delivered.success).toBe(true);

    const attested = await attestReleasesBatch(deliveries, { mock: true });
    expect(attested.success).toBe(true);

    const claims = funded.manifest.map((m) => ({
      dealId: m.dealId,
      fundTx: m.fundTx,
      amount: m.amount,
      agentB: m.agentB,
    }));
    const claimed = await claimDealsBatch(claims, { mock: true });
    expect(claimed.success).toBe(true);
  });

  it("executeBatchSettlement hybridWork orchestrator", async () => {
    const batch = await executeBatchSettlement(jobs(3, true), {
      mock: true,
      batchMode: "hybridWork",
    });
    expect(batch.success).toBe(true);
    expect(batch.batchMode).toBe("hybridWork");
    expect(batch.deliverySubmitMs).toBeGreaterThan(0);
    expect(batch.attestSubmitMs).toBeGreaterThan(0);
  });

  it("executeBatchSettlement saliFast backward compatible", async () => {
    const batch = await executeBatchSettlement(jobs(3, false), { mock: true });
    expect(batch.success).toBe(true);
    expect(batch.succeeded).toBe(3);
    expect(batch.maxParallelInBlock).toBe(3);
  });

  it("filterManifestForPayee keeps matching rows only", async () => {
    const funded = await fundDealsBatch(
      [
        { ...jobs(1, false)[0]!, agentB: agentA },
        { ...jobs(1, false)[0]!, agentB },
        { ...jobs(1, false)[0]!, agentB: "0x4444444444444444444444444444444444444444" },
      ],
      { mock: true, batchMode: "saliFast" }
    );
    const { matched, skipped } = filterManifestForPayee(funded.manifest, agentB);
    expect(matched).toHaveLength(1);
    expect(skipped).toBe(2);
    expect(matched[0]?.agentB.toLowerCase()).toBe(agentB.toLowerCase());
  });

  it("manifestToClaims maps claim fields", async () => {
    const funded = await fundDealsBatch(jobs(2, false), { mock: true, batchMode: "saliFast" });
    const claims = manifestToClaims(funded.manifest);
    expect(claims[0]).toMatchObject({
      dealId: funded.manifest[0]?.dealId,
      fundTx: funded.manifest[0]?.fundTx,
      amount: funded.manifest[0]?.amount,
      agentB: funded.manifest[0]?.agentB,
    });
  });
});
