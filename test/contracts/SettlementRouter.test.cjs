const { expect } = require("chai");
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { deployFullStack, mintAndApprove } = require("../helpers/hardhat-fixture.cjs");

const { ethers } = hre;

describe("SettlementRouter + DealEscrow", function () {
  it("fund → accept → claim releases to payee (legacy)", async function () {
    const fx = await deployFullStack();
    const amount = ethers.parseEther("10");
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.fundAndAccept(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      3600n,
      ethers.id("task"),
      ethers.id("preflight")
    );

    await fx.router.claim(1n, ethers.id("proof"));
    expect(await fx.token.balanceOf(fx.payee.address)).to.equal(amount);
    expect((await fx.escrow.getDeal(1n)).state).to.equal(3);
  });

  it("reclaim returns funds after deadline (ghost payee)", async function () {
    const fx = await deployFullStack();
    const amount = ethers.parseEther("5");
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.fundAndAccept(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      100n,
      ethers.id("work"),
      ethers.id("pf")
    );

    await time.increase(101);
    await fx.router.reclaim(1n);

    expect(await fx.token.balanceOf(fx.payer.address)).to.equal(amount);
    expect((await fx.escrow.getDeal(1n)).state).to.equal(4);
  });

  it("atomic settle completes in one router call", async function () {
    const fx = await deployFullStack();
    const amount = ethers.parseEther("1");
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.settle(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      3600n,
      ethers.id("w"),
      ethers.id("pf"),
      ethers.id("pr")
    );

    expect(await fx.token.balanceOf(fx.payee.address)).to.equal(amount);
    expect(await fx.router.isSettled(1n)).to.equal(true);
  });

  it("collects protocol fee on release", async function () {
    const fx = await deployFullStack();
    const amount = ethers.parseEther("100");
    await fx.escrow.setFeeConfig(100, fx.feeRecipient.address);
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.fundAndAccept(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      3600n,
      ethers.id("task"),
      ethers.id("preflight")
    );
    await fx.router.claim(1n, ethers.id("proof"));

    expect(await fx.token.balanceOf(fx.payee.address)).to.equal(ethers.parseEther("99"));
    expect(await fx.token.balanceOf(fx.feeRecipient.address)).to.equal(ethers.parseEther("1"));
  });

  it("refund has no fee", async function () {
    const fx = await deployFullStack();
    const amount = ethers.parseEther("5");
    await fx.escrow.setFeeConfig(100, fx.feeRecipient.address);
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.fundAndAccept(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      100n,
      ethers.id("work"),
      ethers.id("pf")
    );
    await time.increase(101);
    await fx.router.reclaim(1n);

    expect(await fx.token.balanceOf(fx.payer.address)).to.equal(amount);
    expect(await fx.token.balanceOf(fx.feeRecipient.address)).to.equal(0n);
  });

  it("hybrid: payer attests → immediate claim", async function () {
    const fx = await deployFullStack();
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
      3600n
    );

    await fx.router.connect(fx.payer).attestRelease(1n, ethers.id("result"));
    expect(await fx.router.canClaim(1n)).to.equal(true);
    await fx.router.claim(1n, ethers.id("proof"));
    expect(await fx.token.balanceOf(fx.payee.address)).to.equal(amount);
  });

  it("hybrid: deliver + payer attest → immediate claim", async function () {
    const fx = await deployFullStack();
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
      3600n
    );

    await fx.router.connect(fx.payee).submitDelivery(1n, ethers.id("result"));
    await fx.router.connect(fx.payer).attestRelease(1n, ethers.id("result"));
    expect(await fx.router.canClaim(1n)).to.equal(true);
    await fx.router.claim(1n, ethers.id("proof"));
    expect(await fx.token.balanceOf(fx.payee.address)).to.equal(amount);
  });

  it("hybrid: ghost payer — deliver → wait → claim", async function () {
    const fx = await deployFullStack();
    const amount = ethers.parseEther("3");
    const disputeWindow = 60n;
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
      disputeWindow
    );

    await fx.router.connect(fx.payee).submitDelivery(1n, ethers.id("delivered"));
    expect(await fx.router.canClaim(1n)).to.equal(false);

    await time.increase(61);
    expect(await fx.router.canClaim(1n)).to.equal(true);
    await fx.router.claim(1n, ethers.id("proof"));
    expect(await fx.token.balanceOf(fx.payee.address)).to.equal(amount);
  });

  it("reclaim blocked after delivery submitted", async function () {
    const fx = await deployFullStack();
    const amount = ethers.parseEther("1");
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await fx.router.fundAndAcceptHybrid(
      fx.payer.address,
      fx.payee.address,
      await fx.token.getAddress(),
      amount,
      100n,
      ethers.id("work"),
      ethers.id("pf"),
      true,
      3600n
    );

    await fx.router.connect(fx.payee).submitDelivery(1n, ethers.id("delivered"));
    await time.increase(101);
    await expect(fx.router.reclaim(1n)).to.be.revertedWith("delivery submitted");
  });

  it("reverts if payer unregistered", async function () {
    const fx = await deployFullStack();
    const [, , , stranger] = await ethers.getSigners();
    const amount = ethers.parseEther("1");
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await expect(
      fx.router.fundAndAccept(
        stranger.address,
        fx.payee.address,
        await fx.token.getAddress(),
        amount,
        3600n,
        ethers.id("w"),
        ethers.id("pf")
      )
    ).to.be.revertedWith("agent not registered");
  });

  it("reverts if payee unregistered", async function () {
    const fx = await deployFullStack();
    const [, , , stranger] = await ethers.getSigners();
    const amount = ethers.parseEther("1");
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    await expect(
      fx.router.fundAndAccept(
        fx.payer.address,
        stranger.address,
        await fx.token.getAddress(),
        amount,
        3600n,
        ethers.id("w"),
        ethers.id("pf")
      )
    ).to.be.revertedWith("agent not registered");
  });

  it("reverts if token not allowlisted", async function () {
    const fx = await deployFullStack();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const otherToken = await MockERC20.deploy("OTHER", "OTH");
    const amount = ethers.parseEther("1");
    await otherToken.mint(fx.payer.address, amount);
    await otherToken.connect(fx.payer).approve(await fx.escrow.getAddress(), amount);

    await expect(
      fx.router.fundAndAccept(
        fx.payer.address,
        fx.payee.address,
        await otherToken.getAddress(),
        amount,
        3600n,
        ethers.id("w"),
        ethers.id("pf")
      )
    ).to.be.revertedWith("token not allowed");
  });

  it("submitDelivery reverts if caller is not payee", async function () {
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

    await expect(fx.router.connect(fx.payer).submitDelivery(1n, ethers.id("x"))).to.be.revertedWith(
      "only payee"
    );
  });

  it("attestRelease reverts if caller is not payer", async function () {
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

    await expect(fx.router.connect(fx.payee).attestRelease(1n, ethers.id("x"))).to.be.revertedWith(
      "only payer"
    );
  });
});
