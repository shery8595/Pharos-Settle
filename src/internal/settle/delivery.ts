import {
  createWalletClient,
  createPublicClient,
  keccak256,
  toBytes,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ATLANTIC, loadDeployments, resolveDeploymentNetwork } from "../../shared/chain.js";
import { settlementRouterAbi } from "../../shared/abis.js";
import { transportFromConfig } from "../../shared/clients.js";
import type { SettlementConfig } from "../../shared/schemas.js";

const pharosChain = {
  id: ATLANTIC.chainId,
  name: "Pharos Atlantic",
  nativeCurrency: { name: "PHRS", symbol: "PHRS", decimals: 18 },
  rpcUrls: { default: { http: [ATLANTIC.rpcUrl] } },
} as const;

function payeeAccountFromKey(key?: string) {
  const pk = (key ?? process.env.AGENT_B_PRIVATE_KEY)?.trim();
  if (!pk || pk === "0x" || pk.length < 66) {
    throw new Error("Missing payee private key (AGENT_B_PRIVATE_KEY)");
  }
  return privateKeyToAccount(pk as Hex);
}

function payerAccountFromKey(key?: string) {
  const pk = (key ?? process.env.PRIVATE_KEY)?.trim();
  if (!pk || pk === "0x" || pk.length < 66) {
    throw new Error("Missing payer private key (PRIVATE_KEY)");
  }
  return privateKeyToAccount(pk as Hex);
}

function chainConfig(deployments: { chainId: number }, rpcUrl: string) {
  return {
    ...pharosChain,
    id: deployments.chainId,
    rpcUrls: { default: { http: [rpcUrl] } },
  } as const;
}

export function resultHashFromWork(workDescription: string): `0x${string}` {
  return keccak256(toBytes(`delivery:${workDescription}`));
}

function resolveResultHash(workDescription?: string, resultHash?: string): `0x${string}` {
  if (resultHash?.startsWith("0x") && resultHash.length === 66) {
    return resultHash as `0x${string}`;
  }
  if (workDescription) {
    return resultHashFromWork(workDescription);
  }
  throw new Error("workDescription or resultHash required");
}

export async function submitDelivery(
  dealId: string,
  workDescription: string,
  config: SettlementConfig = {}
): Promise<Hash> {
  return submitDeliveryWithHash(dealId, { workDescription }, config);
}

export async function submitDeliveryWithHash(
  dealId: string,
  args: { workDescription?: string; resultHash?: string },
  config: SettlementConfig = {}
): Promise<Hash> {
  if (config.mock) return ("0x" + "33".repeat(32)) as Hash;

  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const router = (config.routerAddress ?? deployments.settlementRouter) as Address;
  const payee = payeeAccountFromKey(config.payeeSigner);
  const client = createWalletClient({
    account: payee,
    chain: chainConfig(deployments, rpcUrl),
    transport: transportFromConfig(config, rpcUrl),
  });
  const hash = resolveResultHash(args.workDescription, args.resultHash);
  return client.writeContract({
    address: router,
    abi: settlementRouterAbi,
    functionName: "submitDelivery",
    args: [BigInt(dealId), hash],
  });
}

export async function attestRelease(
  dealId: string,
  workDescription: string,
  config: SettlementConfig = {}
): Promise<Hash> {
  return attestReleaseWithHash(dealId, { workDescription }, config);
}

export async function attestReleaseWithHash(
  dealId: string,
  args: { workDescription?: string; resultHash?: string },
  config: SettlementConfig = {}
): Promise<Hash> {
  if (config.mock) return ("0x" + "44".repeat(32)) as Hash;

  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const router = (config.routerAddress ?? deployments.settlementRouter) as Address;
  const payer = payerAccountFromKey(config.payerSigner);
  const client = createWalletClient({
    account: payer,
    chain: chainConfig(deployments, rpcUrl),
    transport: transportFromConfig(config, rpcUrl),
  });
  const hash = resolveResultHash(args.workDescription, args.resultHash);
  return client.writeContract({
    address: router,
    abi: settlementRouterAbi,
    functionName: "attestRelease",
    args: [BigInt(dealId), hash],
  });
}

export async function claimDeal(
  dealId: string,
  proofHash: `0x${string}`,
  config: SettlementConfig = {}
): Promise<{ claimTx: Hash; blockNumber: string; finalityMs: number }> {
  if (config.mock) {
    const mockClaim = ("0x" + "22".repeat(32)) as Hash;
    return { claimTx: mockClaim, blockNumber: "1", finalityMs: 842 };
  }

  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const router = (config.routerAddress ?? deployments.settlementRouter) as Address;
  const payee = payeeAccountFromKey(config.payeeSigner);
  const chain = chainConfig(deployments, rpcUrl);
  const transport = transportFromConfig(config, rpcUrl);
  const publicClient = createPublicClient({ chain, transport });
  const client = createWalletClient({ account: payee, chain, transport });

  const start = Date.now();
  const claimTx = await client.writeContract({
    address: router,
    abi: settlementRouterAbi,
    functionName: "claim",
    args: [BigInt(dealId), proofHash],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: claimTx });
  return {
    claimTx,
    blockNumber: receipt.blockNumber.toString(),
    finalityMs: Date.now() - start,
  };
}

export async function readCanClaim(dealId: string, config: SettlementConfig = {}): Promise<boolean> {
  if (config.mock) return true;
  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const router = (config.routerAddress ?? deployments.settlementRouter) as Address;
  const client = createPublicClient({ transport: transportFromConfig(config, rpcUrl) });
  return client.readContract({
    address: router,
    abi: settlementRouterAbi,
    functionName: "canClaim",
    args: [BigInt(dealId)],
  });
}
