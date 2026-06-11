import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import hre from "hardhat";

function loadAtlanticTokens() {
  return JSON.parse(readFileSync(join(process.cwd(), "config", "atlantic-tokens.json"), "utf-8")) as {
    symbol: string;
    name: string;
    decimals: number;
    address: string;
  }[];
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("Test Agent Token", "TEST");
  await token.waitForDeployment();

  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();

  const TokenAllowlist = await hre.ethers.getContractFactory("TokenAllowlist");
  const allowlist = await TokenAllowlist.deploy();
  await allowlist.waitForDeployment();

  const DealEscrow = await hre.ethers.getContractFactory("DealEscrow");
  const escrow = await DealEscrow.deploy();
  await escrow.waitForDeployment();

  const SettlementRouter = await hre.ethers.getContractFactory("SettlementRouter");
  const router = await SettlementRouter.deploy(
    await registry.getAddress(),
    await allowlist.getAddress(),
    await escrow.getAddress()
  );
  await router.waitForDeployment();

  await escrow.setRouter(await router.getAddress());

  const mockToken = await token.getAddress();
  const addresses = {
    mockToken,
    agentRegistry: await registry.getAddress(),
    tokenAllowlist: await allowlist.getAddress(),
    dealEscrow: await escrow.getAddress(),
    settlementRouter: await router.getAddress(),
    network,
    chainId: Number(chainId),
    deployer: deployer.address,
    allowedTokens: [
      { symbol: "TEST", name: "Test Agent Token", decimals: 18, address: mockToken },
      ...loadAtlanticTokens(),
    ],
  };

  const outDir = join(process.cwd(), "deployments");
  mkdirSync(outDir, { recursive: true });
  const file = network === "pharos" ? "atlantic.json" : `${network}.json`;
  writeFileSync(join(outDir, file), JSON.stringify(addresses, null, 2));
  console.log("Deployed:", addresses);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
