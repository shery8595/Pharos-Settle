import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import hre from "hardhat";

const ATLANTIC = {
  id: 688689,
  name: "Pharos Atlantic",
  nativeCurrency: { name: "PHRS", symbol: "PHRS", decimals: 18 },
  rpcUrls: { default: { http: [process.env.PHAROS_RPC_URL ?? "https://atlantic.dplabs-internal.com"] } },
} as const;

const DEPLOY_PAUSE_MS = Number(process.env.DEPLOY_PAUSE_MS ?? 8000);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 8): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      const rateLimited = /cu limit|too fast|rate limit/i.test(msg);
      if (!rateLimited || i === attempts - 1) throw e;
      const wait = DEPLOY_PAUSE_MS * (i + 1);
      console.log(`[deploy] ${label} rate limited — retry ${i + 2}/${attempts} in ${wait}ms`);
      await sleep(wait);
    }
  }
  throw last;
}

async function deployContract(name: string, args: unknown[] = []) {
  const artifact = JSON.parse(
    readFileSync(
      join(process.cwd(), "artifacts", "contracts", `${name}.sol`, `${name}.json`),
      "utf-8"
    )
  ) as { abi: unknown; bytecode: string };

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
  const rpcUrl = process.env.PHAROS_RPC_URL ?? "https://atlantic.dplabs-internal.com";
  const publicClient = createPublicClient({ chain: ATLANTIC, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: ATLANTIC, transport: http(rpcUrl) });

  const hash = await withRetry(`deploy ${name}`, () =>
    walletClient.deployContract({
      abi: artifact.abi as never,
      bytecode: artifact.bytecode as Hex,
      args: args as never,
      gas: 15_000_000n,
    })
  );
  const receipt = await withRetry(`receipt ${name}`, () =>
    publicClient.waitForTransactionReceipt({ hash })
  );
  if (!receipt.contractAddress) throw new Error(`${name} deploy: no contract address`);
  console.log(`Deployed ${name}:`, receipt.contractAddress);
  await sleep(DEPLOY_PAUSE_MS);
  return receipt.contractAddress as Address;
}

async function sendTx(
  address: Address,
  abi: unknown,
  functionName: string,
  args: unknown[] = []
) {
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
  const rpcUrl = process.env.PHAROS_RPC_URL ?? "https://atlantic.dplabs-internal.com";
  const publicClient = createPublicClient({ chain: ATLANTIC, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: ATLANTIC, transport: http(rpcUrl) });
  const hash = await withRetry(`${functionName}`, () =>
    walletClient.writeContract({
      address,
      abi: abi as never,
      functionName: functionName as never,
      args: args as never,
    })
  );
  await withRetry(`${functionName} receipt`, () => publicClient.waitForTransactionReceipt({ hash }));
  await sleep(DEPLOY_PAUSE_MS);
}

async function main() {
  await hre.run("compile");

  const token = await deployContract("MockERC20", ["Test Agent Token", "TEST"]);
  const registry = await deployContract("AgentRegistry");
  const allowlist = await deployContract("TokenAllowlist");
  const escrow = await deployContract("DealEscrow");
  const router = await deployContract("SettlementRouter", [registry, allowlist, escrow]);

  const escrowArtifact = JSON.parse(
    readFileSync(
      join(process.cwd(), "artifacts", "contracts", "DealEscrow.sol", "DealEscrow.json"),
      "utf-8"
    )
  );
  await sendTx(escrow, escrowArtifact.abi, "setRouter", [router]);

  const deployer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex).address;
  const atlanticTokens = JSON.parse(
    readFileSync(join(process.cwd(), "config", "atlantic-tokens.json"), "utf-8")
  ) as { symbol: string; name: string; decimals: number; address: string }[];
  const allowedTokens = [
    { symbol: "TEST", name: "Test Agent Token", decimals: 18, address: token },
    ...atlanticTokens,
  ];

  const addresses = {
    mockToken: token,
    agentRegistry: registry,
    tokenAllowlist: allowlist,
    dealEscrow: escrow,
    settlementRouter: router,
    network: "pharos",
    chainId: ATLANTIC.id,
    deployer,
    allowedTokens,
  };

  const outDir = join(process.cwd(), "deployments");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "atlantic.json"), JSON.stringify(addresses, null, 2));
  console.log("Saved deployments/atlantic.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
