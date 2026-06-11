const { expect } = require("chai");
const hre = require("hardhat");
const { deployFullStack, mintAndApprove } = require("../helpers/hardhat-fixture.cjs");

const { ethers } = hre;

describe("AgentRegistry", function () {
  it("owner register and remove", async function () {
    const fx = await deployFullStack();
    const [, , , agent] = await ethers.getSigners();

    await fx.registry.connect(fx.payer).register(agent.address);
    expect(await fx.registry.isRegistered(agent.address)).to.equal(true);

    await fx.registry.connect(fx.payer).remove(agent.address);
    expect(await fx.registry.isRegistered(agent.address)).to.equal(false);
  });

  it("registered payer onboards payee then settles", async function () {
    const fx = await deployFullStack();
    const [, , , newPayee] = await ethers.getSigners();
    const amount = ethers.parseEther("2");
    await mintAndApprove(fx.token, fx.payer, await fx.escrow.getAddress(), amount);

    expect(await fx.registry.isRegistered(newPayee.address)).to.equal(false);
    await fx.registry.connect(fx.payer).registerRecipient(newPayee.address);
    expect(await fx.registry.isRegistered(newPayee.address)).to.equal(true);

    await fx.router.fundAndAccept(
      fx.payer.address,
      newPayee.address,
      await fx.token.getAddress(),
      amount,
      3600n,
      ethers.id("onboard-task"),
      ethers.id("onboard-pf")
    );

    await fx.router.claim(1n, ethers.id("proof"));
    expect(await fx.token.balanceOf(newPayee.address)).to.equal(amount);
  });

  it("registerRecipient is idempotent", async function () {
    const fx = await deployFullStack();
    const [, , , newPayee] = await ethers.getSigners();

    await fx.registry.connect(fx.payer).registerRecipient(newPayee.address);
    await fx.registry.connect(fx.payer).registerRecipient(newPayee.address);
    expect(await fx.registry.isRegistered(newPayee.address)).to.equal(true);
  });

  it("batch onboard multiple payees", async function () {
    const fx = await deployFullStack();
    const [, , , payeeA, payeeB] = await ethers.getSigners();

    await fx.registry.connect(fx.payer).registerRecipients([payeeA.address, payeeB.address]);
    expect(await fx.registry.isRegistered(payeeA.address)).to.equal(true);
    expect(await fx.registry.isRegistered(payeeB.address)).to.equal(true);
  });

  it("batch register skips already registered", async function () {
    const fx = await deployFullStack();
    const [, , , payeeA, payeeB] = await ethers.getSigners();

    await fx.registry.connect(fx.payer).registerRecipient(payeeA.address);
    await fx.registry.connect(fx.payer).registerRecipients([payeeA.address, payeeB.address]);
    expect(await fx.registry.isRegistered(payeeA.address)).to.equal(true);
    expect(await fx.registry.isRegistered(payeeB.address)).to.equal(true);
  });

  it("unregistered sponsor cannot onboard", async function () {
    const fx = await deployFullStack();
    const [, , , newPayee, stranger] = await ethers.getSigners();
    await expect(fx.registry.connect(stranger).registerRecipient(newPayee.address)).to.be.revertedWith(
      "sponsor not registered"
    );
  });
});
