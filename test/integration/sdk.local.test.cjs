const { expect } = require("chai");
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { deployFullStack, mintAndApprove } = require("../helpers/hardhat-fixture.cjs");
const { buildSdkConfig, writeLocalDeployments } = require("../helpers/sdk-config.cjs");

const { ethers } = hre;

describe("SDK integration (local Hardhat)", function () {
  this.timeout(120_000);
  let fx;
  let sdk;
  let baseInput;
  let config;

  before(async function () {
    fx = await deployFullStack();
    writeLocalDeployments(fx.addresses);
    config = await buildSdkConfig(fx);
    sdk = await import("../../dist/trustedAgentSettlement.js");

    const token = await fx.token.getAddress();
    baseInput = {
      agentA: fx.payer.address,
      agentB: fx.payee.address,
      token,
      amount: ethers.parseEther("1").toString(),
      workDescription: "sdk integration task",
    };

    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), ethers.parseEther("100"));
  });

  it("cooperative legacy fund→claim via executeTrustedSettlement", async function () {
    const input = {
      ...baseInput,
      workDescription: "legacy claim " + Date.now(),
      requiresHybridRelease: false,
    };
    const result = await sdk.executeTrustedSettlement(input, config);
    expect(result.success).to.equal(true);
    expect(result.stages.settle?.claimTx).to.be.ok;
  });

  it("hybrid fund→deliver→attest→claim via executeTrustedSettlement", async function () {
    const input = {
      ...baseInput,
      workDescription: "hybrid full " + Date.now(),
      requiresHybridRelease: true,
      disputeWindowSeconds: 3600,
    };
    const result = await sdk.executeTrustedSettlement(input, config);
    expect(result.success).to.equal(true);
    expect(result.stages.settle?.deliverTx).to.be.ok;
    expect(result.stages.settle?.attestTx).to.be.ok;
  });

  it("getSettlementStatus reports nextAction after fund", async function () {
    const input = {
      ...baseInput,
      workDescription: "status check " + Date.now(),
      requiresHybridRelease: false,
    };
    const result = await sdk.executeTrustedSettlement(input, config);
    const status = await sdk.getSettlementStatus(result.dealId, config);
    expect(status.state).to.equal("Released");
    expect(status.nextAction).to.equal("done");
  });

  it("reclaimTrustedSettlement after deadline", async function () {
    const amount = ethers.parseEther("1");
    const tx = await fx.router.fundAndAcceptHybrid(
      fx.payer.address,
      fx.payee.address,
      baseInput.token,
      amount,
      100n,
      ethers.id("reclaim sdk"),
      ethers.id("reclaim pf"),
      true,
      3600n
    );
    const receipt = await tx.wait();
    const escrow = await fx.escrow.getAddress();
    const dealCreated = receipt.logs.find(
      (l) => l.address.toLowerCase() === escrow.toLowerCase() && l.topics.length >= 2
    );
    const dealId = BigInt(dealCreated.topics[1]).toString();

    await time.increase(3601);
    const reclaim = await sdk.reclaimTrustedSettlement(dealId, config);
    expect(reclaim.success).to.equal(true);
  });

  it("registerRecipients + autoOnboard settle", async function () {
    const [, , , newPayee] = await ethers.getSigners();
    const input = {
      ...baseInput,
      agentB: newPayee.address,
      workDescription: "onboard sdk " + Date.now(),
      requiresHybridRelease: false,
    };
    const result = await sdk.executeTrustedSettlement(input, {
      ...config,
      autoOnboardRecipients: true,
    });
    expect(result.stages.onboard?.recipients).to.include(newPayee.address);
    expect(result.success).to.equal(true);
  });

  it("executeBatchSettlement N=3", async function () {
    const jobs = Array.from({ length: 3 }, (_, i) => ({
      ...baseInput,
      workDescription: `batch sdk ${Date.now()} ${i}`,
      requiresHybridRelease: false,
    }));
    const batch = await sdk.executeBatchSettlement(jobs, config);
    expect(batch.succeeded).to.equal(3);
  });

  it("split saliFast batch fund then claim N=3", async function () {
    const jobs = Array.from({ length: 3 }, (_, i) => ({
      ...baseInput,
      workDescription: `split sali ${Date.now()} ${i}`,
      requiresHybridRelease: false,
    }));
    const funded = await sdk.fundDealsBatch(jobs, { ...config, batchMode: "saliFast" });
    expect(funded.succeeded).to.equal(3);
    const claims = funded.manifest.map((m) => ({
      dealId: m.dealId,
      fundTx: m.fundTx,
      amount: m.amount,
      agentB: m.agentB,
    }));
    const claimed = await sdk.claimDealsBatch(claims, config);
    expect(claimed.succeeded).to.equal(3);
  });

  it("split hybridWork batch four phases N=3", async function () {
    const jobs = Array.from({ length: 3 }, (_, i) => ({
      ...baseInput,
      workDescription: `split hybrid ${Date.now()} ${i}`,
      requiresHybridRelease: true,
      disputeWindowSeconds: 3600,
    }));
    const funded = await sdk.fundDealsBatch(jobs, { ...config, batchMode: "hybridWork" });
    expect(funded.succeeded).to.equal(3);
    const deliveries = funded.manifest.map((m) => ({
      dealId: m.dealId,
      workDescription: m.workDescription,
    }));
    const delivered = await sdk.submitDeliveriesBatch(deliveries, config);
    expect(delivered.succeeded).to.equal(3);
    const attested = await sdk.attestReleasesBatch(deliveries, config);
    expect(attested.succeeded).to.equal(3);
    const claims = funded.manifest.map((m) => ({
      dealId: m.dealId,
      fundTx: m.fundTx,
      amount: m.amount,
      agentB: m.agentB,
    }));
    const claimed = await sdk.claimDealsBatch(claims, config);
    expect(claimed.succeeded).to.equal(3);
  });

  it("simulate fails preflight on disallowed token", async function () {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const other = await MockERC20.deploy("BAD", "BAD");
    const sim = await sdk.simulateTrustedSettlement(
      { ...baseInput, token: await other.getAddress() },
      config
    );
    expect(sim.stages.preflight.ready).to.equal(false);
    expect(sim.stages.preflight.checks.some((c) => c.name === "token_allowed" && !c.passed)).to.equal(true);
  });

  it("reclaim blocked after delivery", async function () {
    const input = {
      ...baseInput,
      workDescription: "blocked reclaim " + Date.now(),
      ttlSeconds: 100,
      requiresHybridRelease: true,
    };
    const result = await sdk.executeTrustedSettlement(input, { ...config, skipAttest: true });
    expect(result.stages.settle?.deliverTx).to.be.ok;
    await time.increase(101);
    const reclaim = await sdk.reclaimTrustedSettlement(result.dealId, config);
    expect(reclaim.success).to.equal(false);
  });
});
