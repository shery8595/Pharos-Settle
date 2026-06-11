import {
  createWalletClient,
  createPublicClient,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ATLANTIC, loadDeployments, resolveDeploymentNetwork } from "../../shared/chain.js";
import { settlementRouterAbi } from "../../shared/abis.js";
import type { SettlementConfig, SettlementMode, TrustedSettlementInput } from "../../shared/schemas.js";
import { workHash } from "../preflight/index.js";
import { computeProofHash } from "../prove/index.js";
import { transportFromConfig } from "../../shared/clients.js";
import { attestRelease, claimDeal, submitDelivery, readCanClaim } from "./delivery.js";

const pharosChain = {
  id: ATLANTIC.chainId,
  name: "Pharos Atlantic",
  nativeCurrency: { name: "PHRS", symbol: "PHRS", decimals: 18 },
  rpcUrls: { default: { http: [ATLANTIC.rpcUrl] } },
} as const;

export type SettleResult = {
  dealId: string;
  fundTx?: Hash;
  deliverTx?: Hash;
  attestTx?: Hash;
  claimTx?: Hash;
  settlementReceipt?: { txHash: string; blockNumber: string; finalityMs: number };
};

function normalizePrivateKey(key?: string): Hex {
  const pk = (key ?? process.env.PRIVATE_KEY)?.trim();
  if (!pk || pk === "0x" || pk.length < 66) {
    throw new Error("Missing payer private key (PRIVATE_KEY)");
  }
  return pk as Hex;
}

function accountFromKey(key?: string) {
  return privateKeyToAccount(normalizePrivateKey(key));
}

function hybridEnabled(input: TrustedSettlementInput): boolean {
  return input.requiresHybridRelease ?? true;
}

export async function fundDeal(
  input: TrustedSettlementInput,
  config: SettlementConfig,
  preflightHash: string
): Promise<SettleResult> {
  if (config.mock) {
    return { dealId: "1", fundTx: ("0x" + "11".repeat(32)) as Hash };
  }

  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const router = (config.routerAddress ?? deployments.settlementRouter) as Address;
  const payerAccount = accountFromKey(config.payerSigner);

  const chain = {
    ...pharosChain,
    id: deployments.chainId,
    rpcUrls: { default: { http: [rpcUrl] } },
  } as const;

  const transport = transportFromConfig(config, rpcUrl);
  const publicClient = createPublicClient({ chain, transport });
  const payerClient = createWalletClient({
    account: payerAccount,
    chain,
    transport,
  });

  const ttl = BigInt(input.ttlSeconds ?? 3600);
  const amount = BigInt(input.amount);
  const wh = workHash(input.workDescription);
  const useHybrid = hybridEnabled(input);
  const disputeWindow = BigInt(input.disputeWindowSeconds ?? 72 * 3600);

  const fundHash = useHybrid
    ? await payerClient.writeContract({
        address: router,
        abi: settlementRouterAbi,
        functionName: "fundAndAcceptHybrid",
        args: [
          input.agentA as Address,
          input.agentB as Address,
          input.token as Address,
          amount,
          ttl,
          wh,
          preflightHash as `0x${string}`,
          true,
          disputeWindow,
        ],
      })
    : await payerClient.writeContract({
        address: router,
        abi: settlementRouterAbi,
        functionName: "fundAndAccept",
        args: [
          input.agentA as Address,
          input.agentB as Address,
          input.token as Address,
          amount,
          ttl,
          wh,
          preflightHash as `0x${string}`,
        ],
      });

  const fundReceipt = await publicClient.waitForTransactionReceipt({ hash: fundHash });
  const escrow = deployments.dealEscrow as Address;
  const dealCreatedLog = fundReceipt.logs.find(
    (l) => l.address.toLowerCase() === escrow.toLowerCase() && l.topics[1]
  );
  const dealId = dealCreatedLog?.topics[1] ? BigInt(dealCreatedLog.topics[1]).toString() : "1";

  return { dealId, fundTx: fundHash };
}

export async function settle(
  input: TrustedSettlementInput,
  config: SettlementConfig,
  preflightHash: string
): Promise<SettleResult> {
  const mode: SettlementMode =
    config.mode === "cooperative" || config.mode === "safetyNet" ? config.mode : "cooperative";

  if (config.mock) {
    const mockFund = ("0x" + "11".repeat(32)) as Hash;
    const mockClaim = ("0x" + "22".repeat(32)) as Hash;
    if (config.skipAttest) {
      return {
        dealId: "1",
        fundTx: mockFund,
        deliverTx: ("0x" + "33".repeat(32)) as Hash,
      };
    }
    return {
      dealId: "1",
      fundTx: mockFund,
      deliverTx: ("0x" + "33".repeat(32)) as Hash,
      attestTx: ("0x" + "44".repeat(32)) as Hash,
      claimTx: mockClaim,
      settlementReceipt: { txHash: mockClaim, blockNumber: "1", finalityMs: 842 },
    };
  }

  if (mode === "safetyNet" && config.dealId) {
    return { dealId: config.dealId };
  }

  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const router = (config.routerAddress ?? deployments.settlementRouter) as Address;
  const payerAccount = accountFromKey(config.payerSigner);

  const chain = {
    ...pharosChain,
    id: deployments.chainId,
    rpcUrls: { default: { http: [rpcUrl] } },
  } as const;

  const transport = transportFromConfig(config, rpcUrl);
  const publicClient = createPublicClient({ chain, transport });
  const payerClient = createWalletClient({
    account: payerAccount,
    chain,
    transport,
  });

  const ttl = BigInt(input.ttlSeconds ?? 3600);
  const amount = BigInt(input.amount);
  const wh = workHash(input.workDescription);
  const useHybrid = hybridEnabled(input);
  const disputeWindow = BigInt(input.disputeWindowSeconds ?? 72 * 3600);

  const fundHash = useHybrid
    ? await payerClient.writeContract({
        address: router,
        abi: settlementRouterAbi,
        functionName: "fundAndAcceptHybrid",
        args: [
          input.agentA as Address,
          input.agentB as Address,
          input.token as Address,
          amount,
          ttl,
          wh,
          preflightHash as `0x${string}`,
          true,
          disputeWindow,
        ],
      })
    : await payerClient.writeContract({
        address: router,
        abi: settlementRouterAbi,
        functionName: "fundAndAccept",
        args: [
          input.agentA as Address,
          input.agentB as Address,
          input.token as Address,
          amount,
          ttl,
          wh,
          preflightHash as `0x${string}`,
        ],
      });

  const fundReceipt = await publicClient.waitForTransactionReceipt({ hash: fundHash });
  const escrow = deployments.dealEscrow as Address;
  const dealCreatedLog = fundReceipt.logs.find(
    (l) => l.address.toLowerCase() === escrow.toLowerCase() && l.topics[1]
  );
  const dealId = dealCreatedLog?.topics[1] ? BigInt(dealCreatedLog.topics[1]).toString() : "1";

  if (!useHybrid) {
    const finalProofHash = computeProofHash(fundHash, input.amount, input.agentB);
    const claimResult = await claimDeal(dealId, finalProofHash, config);
    return {
      dealId,
      fundTx: fundHash,
      claimTx: claimResult.claimTx,
      settlementReceipt: {
        txHash: claimResult.claimTx,
        blockNumber: claimResult.blockNumber,
        finalityMs: claimResult.finalityMs,
      },
    };
  }

  let deliverTx: Hash | undefined;
  let attestTx: Hash | undefined;

  deliverTx = await submitDelivery(dealId, input.workDescription, config);
  await publicClient.waitForTransactionReceipt({ hash: deliverTx });

  if (!config.skipAttest) {
    attestTx = await attestRelease(dealId, input.workDescription, config);
    await publicClient.waitForTransactionReceipt({ hash: attestTx });
  } else {
    const canClaimNow = await readCanClaim(dealId, config);
    if (!canClaimNow) {
      return { dealId, fundTx: fundHash, deliverTx };
    }
  }

  const canClaim = await readCanClaim(dealId, config);
  if (!canClaim) {
    return { dealId, fundTx: fundHash, deliverTx, attestTx };
  }

  const finalProofHash = computeProofHash(fundHash, input.amount, input.agentB);
  const claimResult = await claimDeal(dealId, finalProofHash, config);

  return {
    dealId,
    fundTx: fundHash,
    deliverTx,
    attestTx,
    claimTx: claimResult.claimTx,
    settlementReceipt: {
      txHash: claimResult.claimTx,
      blockNumber: claimResult.blockNumber,
      finalityMs: claimResult.finalityMs,
    },
  };
}

export async function reclaimDeal(dealId: string, config: SettlementConfig = {}): Promise<Hash> {
  if (config.mock) return ("0x" + "55".repeat(32)) as Hash;

  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const router = (config.routerAddress ?? deployments.settlementRouter) as Address;
  const payerAccount = accountFromKey(config.payerSigner);
  const chain = {
    ...pharosChain,
    id: deployments.chainId,
    rpcUrls: { default: { http: [rpcUrl] } },
  } as const;
  const client = createWalletClient({
    account: payerAccount,
    chain,
    transport: transportFromConfig(config, rpcUrl),
  });
  return client.writeContract({
    address: router,
    abi: settlementRouterAbi,
    functionName: "reclaim",
    args: [BigInt(dealId)],
  });
}

export {
  submitDelivery,
  submitDeliveryWithHash,
  attestRelease,
  attestReleaseWithHash,
  claimDeal,
  readCanClaim,
  resultHashFromWork,
} from "./delivery.js";
export {
  executeBatchSettlement,
  fundDealsBatch,
  submitDeliveriesBatch,
  attestReleasesBatch,
  claimDealsBatch,
} from "./batch.js";
export {
  filterManifestForPayee,
  manifestToClaims,
} from "./batchValidation.js";
export type {
  BatchSettlementOutput,
  BatchDealResult,
  BatchFundOutput,
  BatchDeliveryOutput,
  BatchAttestOutput,
  BatchClaimOutput,
} from "./batch.js";
