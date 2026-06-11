const { expect } = require("chai");
const hre = require("hardhat");
const { deployFullStack, mintAndApprove } = require("../helpers/hardhat-fixture.cjs");

const { ethers } = hre;

const REASON = ethers.id("junk-delivery");
const HYBRID_TTL = 3600n;
const HYBRID_DW = 1800n;

describe("DealEscrow", function () {
  it("setFeeConfig rejects fee above MAX_FEE_BPS", async function () {
    const fx = await deployFullStack();
    await expect(fx.escrow.setFeeConfig(1001, fx.feeRecipient.address)).to.be.revertedWith(
      "fee too high"
    );
  });

  it("only router can fund", async function () {
    const fx = await deployFullStack();
    await expect(fx.escrow.connect(fx.payer).fund(1n)).to.be.revertedWith("only router");
  });

  it("only router can claim", async function () {
    const fx = await deployFullStack();
    await expect(fx.escrow.connect(fx.payer).claim(1n, ethers.id("proof"))).to.be.revertedWith(
      "only router"
    );
  });

  it("canClaim false before delivery on hybrid deal", async function () {
    const fx = await deployFullStack();
    const amount = ethers.parseEther("1");
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.fundAndAcceptHybrid(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      3600n,
      ethers.id("work"),
      ethers.id("pf"),
      true,
      HYBRID_DW,
      ethers.ZeroAddress
    );

    expect(await fx.escrow.canClaim(1n)).to.equal(false);
  });

  it("only router can rejectDelivery", async function () {
    const fx = await deployFullStack();
    const amount = ethers.parseEther("1");
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.fundAndAcceptHybrid(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      3600n,
      ethers.id("work"),
      ethers.id("pf"),
      true,
      HYBRID_DW,
      ethers.ZeroAddress
    );

    await fx.router.connect(fx.payee).submitDelivery(1n, ethers.id("junk"));
    await expect(fx.escrow.connect(fx.payer).rejectDelivery(1n, REASON)).to.be.revertedWith(
      "only router"
    );
  });

  it("rejectDelivery requires non-zero reasonHash", async function () {
    const fx = await deployFullStack();
    const amount = ethers.parseEther("1");
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.fundAndAcceptHybrid(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      3600n,
      ethers.id("work"),
      ethers.id("pf"),
      true,
      HYBRID_DW,
      ethers.ZeroAddress
    );

    await fx.router.connect(fx.payee).submitDelivery(1n, ethers.ZeroHash);
    await expect(fx.router.connect(fx.payer).rejectDelivery(1n, ethers.ZeroHash)).to.be.revertedWith(
      "zero reason"
    );
  });

  it("cooperative rejectDelivery transitions to Refunded", async function () {
    const fx = await deployFullStack();
    const amount = ethers.parseEther("1");
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.fundAndAcceptHybrid(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      3600n,
      ethers.id("work"),
      ethers.id("pf"),
      true,
      HYBRID_DW,
      ethers.ZeroAddress
    );

    await fx.router.connect(fx.payee).submitDelivery(1n, ethers.ZeroHash);
    await fx.router.connect(fx.payer).rejectDelivery(1n, REASON);

    const deal = await fx.escrow.getDeal(1n);
    expect(deal.state).to.equal(5);
    expect(deal.rejectionReasonHash).to.equal(REASON);
  });

  it("arbiter rejectDelivery transitions to Disputed", async function () {
    const fx = await deployFullStack();
    const [, , , arbiter] = await ethers.getSigners();
    const amount = ethers.parseEther("1");
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.fundAndAcceptHybrid(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      3600n,
      ethers.id("work"),
      ethers.id("pf"),
      true,
      HYBRID_DW,
      arbiter.address
    );

    await fx.router.connect(fx.payee).submitDelivery(1n, ethers.id("delivered"));
    await fx.router.connect(fx.payer).rejectDelivery(1n, REASON);

    const deal = await fx.escrow.getDeal(1n);
    expect(deal.state).to.equal(3);
    expect(deal.rejectionReasonHash).to.equal(REASON);
    expect(await fx.token.balanceOf(fx.payer.address)).to.equal(0n);
  });

  it("resolveDispute ReleaseToPayee pays payee with fee", async function () {
    const fx = await deployFullStack();
    const [, , , arbiter] = await ethers.getSigners();
    const amount = ethers.parseEther("100");
    await fx.escrow.setFeeConfig(100, fx.feeRecipient.address);
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.fundAndAcceptHybrid(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      3600n,
      ethers.id("work"),
      ethers.id("pf"),
      true,
      HYBRID_DW,
      arbiter.address
    );

    await fx.router.connect(fx.payee).submitDelivery(1n, ethers.id("delivered"));
    await fx.router.connect(fx.payer).rejectDelivery(1n, REASON);
    await fx.router.connect(arbiter).resolveDispute(1n, 0, 0);

    expect((await fx.escrow.getDeal(1n)).state).to.equal(4);
    expect(await fx.token.balanceOf(fx.payee.address)).to.equal(ethers.parseEther("99"));
    expect(await fx.token.balanceOf(fx.feeRecipient.address)).to.equal(ethers.parseEther("1"));
  });

  it("resolveDispute RefundPayer returns full amount", async function () {
    const fx = await deployFullStack();
    const [, , , arbiter] = await ethers.getSigners();
    const amount = ethers.parseEther("2");
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.fundAndAcceptHybrid(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      3600n,
      ethers.id("work"),
      ethers.id("pf"),
      true,
      HYBRID_DW,
      arbiter.address
    );

    await fx.router.connect(fx.payee).submitDelivery(1n, ethers.id("delivered"));
    await fx.router.connect(fx.payer).rejectDelivery(1n, REASON);
    await fx.router.connect(arbiter).resolveDispute(1n, 1, 0);

    expect((await fx.escrow.getDeal(1n)).state).to.equal(5);
    expect(await fx.token.balanceOf(fx.payer.address)).to.equal(amount);
  });

  it("resolveDispute Split applies fee on payee share only", async function () {
    const fx = await deployFullStack();
    const [, , , arbiter] = await ethers.getSigners();
    const amount = ethers.parseEther("100");
    await fx.escrow.setFeeConfig(100, fx.feeRecipient.address);
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.fundAndAcceptHybrid(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      3600n,
      ethers.id("work"),
      ethers.id("pf"),
      true,
      HYBRID_DW,
      arbiter.address
    );

    await fx.router.connect(fx.payee).submitDelivery(1n, ethers.id("delivered"));
    await fx.router.connect(fx.payer).rejectDelivery(1n, REASON);
    await fx.router.connect(arbiter).resolveDispute(1n, 2, 7000);

    expect((await fx.escrow.getDeal(1n)).state).to.equal(4);
    expect(await fx.token.balanceOf(fx.payee.address)).to.equal(ethers.parseEther("69.3"));
    expect(await fx.token.balanceOf(fx.payer.address)).to.equal(ethers.parseEther("30"));
    expect(await fx.token.balanceOf(fx.feeRecipient.address)).to.equal(ethers.parseEther("0.7"));
  });
});
