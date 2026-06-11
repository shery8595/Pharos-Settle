const hre = require("hardhat");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { ethers } = hre;

async function deployFullStack() {
  const [payer, payee, feeRecipient] = await ethers.getSigners();
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("TEST", "TEST");
  const registry = await (await ethers.getContractFactory("AgentRegistry")).deploy();
  const allowlist = await (await ethers.getContractFactory("TokenAllowlist")).deploy();
  const escrow = await (await ethers.getContractFactory("DealEscrow")).deploy();
  const router = await (
    await ethers.getContractFactory("SettlementRouter")
  ).deploy(await registry.getAddress(), await allowlist.getAddress(), await escrow.getAddress());
  await escrow.setRouter(await router.getAddress());

  await registry.register(payer.address);
  await registry.register(payee.address);
  await allowlist.allow(await token.getAddress());

  const addresses = {
    mockToken: await token.getAddress(),
    agentRegistry: await registry.getAddress(),
    tokenAllowlist: await allowlist.getAddress(),
    dealEscrow: await escrow.getAddress(),
    settlementRouter: await router.getAddress(),
    network: "localhost",
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: payer.address,
  };

  return {
    payer,
    payee,
    feeRecipient,
    token,
    registry,
    allowlist,
    escrow,
    router,
    addresses,
  };
}

async function approveEscrow(token, payer, escrowAddress, amount) {
  await token.connect(payer).approve(escrowAddress, amount);
}

async function mintAndApprove(token, payer, escrowAddress, amount) {
  await token.mint(payer.address, amount);
  await approveEscrow(token, payer, escrowAddress, amount);
}

function loadAtlanticTokenAddresses() {
  const raw = readFileSync(join(process.cwd(), "config", "atlantic-tokens.json"), "utf-8");
  return JSON.parse(raw).map((t) => t.address);
}

async function allowAtlanticTokens(allowlist, mockTokenAddress) {
  const addrs = [mockTokenAddress, ...loadAtlanticTokenAddresses()];
  const seen = new Set();
  for (const addr of addrs) {
    const key = addr.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    await allowlist.allow(addr);
  }
  return [...seen];
}

module.exports = {
  deployFullStack,
  approveEscrow,
  mintAndApprove,
  allowAtlanticTokens,
  loadAtlanticTokenAddresses,
};
