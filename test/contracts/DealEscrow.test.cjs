const { expect } = require("chai");
const hre = require("hardhat");
const { deployFullStack, mintAndApprove } = require("../helpers/hardhat-fixture.cjs");

const { ethers } = hre;

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
      3600n
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
      3600n
    );

    await fx.router.connect(fx.payee).submitDelivery(1n, ethers.id("junk"));
    await expect(fx.escrow.connect(fx.payer).rejectDelivery(1n)).to.be.revertedWith("only router");
  });

  it("rejectDelivery transitions to Refunded", async function () {
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
      3600n
    );

    await fx.router.connect(fx.payee).submitDelivery(1n, ethers.ZeroHash);
    await fx.router.connect(fx.payer).rejectDelivery(1n);

    expect((await fx.escrow.getDeal(1n)).state).to.equal(4);
  });
});
