const { expect } = require("chai");
const hre = require("hardhat");
const { deployFullStack, allowAtlanticTokens, loadAtlanticTokenAddresses } = require("../helpers/hardhat-fixture.cjs");

const { ethers } = hre;

describe("TokenAllowlist", function () {
  it("owner allow and disallow", async function () {
    const fx = await deployFullStack();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("X", "X");
    await fx.allowlist.connect(fx.payer).allow(await token.getAddress());
    expect(await fx.allowlist.isAllowed(await token.getAddress())).to.equal(true);

    await fx.allowlist.connect(fx.payer).disallow(await token.getAddress());
    expect(await fx.allowlist.isAllowed(await token.getAddress())).to.equal(false);
  });

  it("requireAllowed reverts for unknown token", async function () {
    const fx = await deployFullStack();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("X", "X");

    await expect(fx.allowlist.requireAllowed(await token.getAddress())).to.be.revertedWith(
      "token not allowed"
    );
  });

  it("batch-allow TEST + Atlantic registry tokens", async function () {
    const fx = await deployFullStack();
    const mockToken = await fx.token.getAddress();
    const allowed = await allowAtlanticTokens(fx.allowlist, mockToken);

    expect(allowed.length).to.equal(6);
    for (const addr of allowed) {
      expect(await fx.allowlist.isAllowed(addr)).to.equal(true);
    }
    expect(loadAtlanticTokenAddresses().length).to.equal(5);
  });
});
