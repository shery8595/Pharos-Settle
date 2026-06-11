import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import hre from "hardhat";

type AtlanticToken = { symbol: string; name: string; decimals: number; address: string };

function loadAtlanticTokens(): AtlanticToken[] {
  return JSON.parse(readFileSync(join(process.cwd(), "config", "atlantic-tokens.json"), "utf-8"));
}

function uniqueTokenAddresses(tokens: AtlanticToken[], ...extra: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...tokens.map((t) => t.address), ...extra]) {
    const key = raw.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(raw);
    }
  }
  return out;
}

function loadDeployments(network: string) {
  const file = network === "pharos" ? "atlantic.json" : `${network}.json`;
  return JSON.parse(readFileSync(join(process.cwd(), "deployments", file), "utf-8"));
}

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const d = loadDeployments(network);
  const atlanticTokens = loadAtlanticTokens();

  const agentBKey = process.env.AGENT_B_PRIVATE_KEY;
  if (!agentBKey) throw new Error("Set AGENT_B_PRIVATE_KEY in .env");
  const agentB = new hre.ethers.Wallet(agentBKey, hre.ethers.provider);

  const gasTopUp = hre.ethers.parseEther("0.01");
  const agentBGas = await hre.ethers.provider.getBalance(agentB.address);
  if (agentBGas < gasTopUp) {
    await (await owner.sendTransaction({ to: agentB.address, value: gasTopUp })).wait();
    console.log("Topped up agent B gas:", agentB.address);
  }

  const registry = await hre.ethers.getContractAt("AgentRegistry", d.agentRegistry);
  const allowlist = await hre.ethers.getContractAt("TokenAllowlist", d.tokenAllowlist);
  const escrow = await hre.ethers.getContractAt("DealEscrow", d.dealEscrow);
  const token = await hre.ethers.getContractAt("MockERC20", d.mockToken);

  await (await escrow.setFeeConfig(100, owner.address)).wait();
  await (await registry.register(owner.address)).wait();
  await (await registry.register(agentB.address)).wait();

  const tokensToAllow = uniqueTokenAddresses(atlanticTokens, d.mockToken);
  console.log(`Allowing ${tokensToAllow.length} tokens on allowlist...`);
  for (const addr of tokensToAllow) {
    const label =
      addr.toLowerCase() === d.mockToken.toLowerCase()
        ? "TEST (skill)"
        : atlanticTokens.find((t) => t.address.toLowerCase() === addr.toLowerCase())?.symbol ?? addr;
    await (await allowlist.allow(addr)).wait();
    console.log(`  ✓ ${label}: ${addr}`);
  }

  const mintAmount = hre.ethers.parseEther("10000");
  await (await token.mint(owner.address, mintAmount)).wait();
  await (await token.mint(agentB.address, hre.ethers.parseEther("100"))).wait();

  const approveAmount = hre.ethers.parseEther("100000");
  await (await token.approve(d.dealEscrow, approveAmount)).wait();

  const allowedTokens = [
    { symbol: "TEST", name: "Test Agent Token", decimals: 18, address: d.mockToken },
    ...atlanticTokens,
  ];

  if (network === "pharos") {
    writeFileSync(
      join(process.cwd(), "deployments", "atlantic.json"),
      JSON.stringify({ ...d, allowedTokens }, null, 2)
    );
    console.log("Updated deployments/atlantic.json with allowedTokens");
  }

  console.log("Seeded agents:", { agentA: owner.address, agentB: agentB.address, token: d.mockToken });
  console.log("Allowed tokens:", tokensToAllow.length, "(TEST + Atlantic registry)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
