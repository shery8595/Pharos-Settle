import {
  createWalletClient,
  createPublicClient,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ATLANTIC, loadDeployments, resolveDeploymentNetwork } from "../../shared/chain.js";
import { settlementRouterAbi, erc20Abi } from "../../shared/abis.js";
import type {
  BatchAttestInput,
  BatchClaimInput,
  BatchDealManifest,
  BatchDeliveryInput,
  BatchMode,
  BatchPhaseDealResult,
  SettlementConfig,
  TrustedSettlementInput,
} from "../../shared/schemas.js";
import { preflight, workHash } from "../preflight/index.js";
import { computeProofHash } from "../prove/index.js";
import { getFeeQuote } from "../commerce/feeQuote.js";
import { withRpcRetry } from "../../shared/rpc.js";
import { transportFromConfig } from "../../shared/clients.js";
import { onlyPayeeNeedsOnboarding, unregisteredPayeesFromJobs } from "../preflight/onboarding.js";
import { registerRecipients, filterUnregistered } from "../onboard/recipients.js";
import { resultHashFromWork } from "./delivery.js";
import {
  normalizeBatchJobs,
  resolveBatchMode,
  validateAttestBatch,
  validateClaimBatch,
  validateDeliveryBatch,
  validatePayerBatchJobs,
  validatePayeeManifest,
} from "./batchValidation.js";

const pharosChain = {
  id: ATLANTIC.chainId,
  name: "Pharos Atlantic",
  nativeCurrency: { name: "PHRS", symbol: "PHRS", decimals: 18 },
  rpcUrls: { default: { http: [ATLANTIC.rpcUrl] } },
} as const;

/** @deprecated use BatchPhaseDealResult */
export type BatchDealResult = BatchPhaseDealResult;

export type BatchFundOutput = {
  success: boolean;
  batchMode: BatchMode;
  deals: number;
  succeeded: number;
  failed: number;
  fundSubmitMs: number;
  fundTxPerSec: number;
  maxParallelFundInBlock: number;
  manifest: BatchDealManifest[];
  saliNote: string;
  results: BatchPhaseDealResult[];
};

export type BatchDeliveryOutput = {
  success: boolean;
  deals: number;
  succeeded: number;
  failed: number;
  deliverySubmitMs: number;
  deliveryTxPerSec: number;
  maxParallelDeliveryInBlock: number;
  saliNote: string;
  results: BatchPhaseDealResult[];
};

export type BatchAttestOutput = {
  success: boolean;
  deals: number;
  succeeded: number;
  failed: number;
  attestSubmitMs: number;
  attestTxPerSec: number;
  maxParallelAttestInBlock: number;
  saliNote: string;
  results: BatchPhaseDealResult[];
};

export type BatchClaimOutput = {
  success: boolean;
  deals: number;
  succeeded: number;
  failed: number;
  claimPhaseMs: number;
  claimTxPerSec: number;
  maxParallelClaimInBlock: number;
  avgFinalityMs: number;
  totalFeesWei: string;
  saliNote: string;
  results: BatchPhaseDealResult[];
};

export type BatchSettlementOutput = {
  success: boolean;
  batchMode: BatchMode;
  deals: number;
  succeeded: number;
  failed: number;
  fundSubmitMs: number;
  fundConfirmMs: number;
  deliverySubmitMs: number;
  attestSubmitMs: number;
  claimPhaseMs: number;
  totalMs: number;
  fundTxPerSec: number;
  deliveryTxPerSec: number;
  attestTxPerSec: number;
  claimTxPerSec: number;
  endToEndDealsPerSec: number;
  avgFinalityMs: number;
  totalFeesWei: string;
  maxParallelInBlock: number;
  maxParallelFundInBlock: number;
  maxParallelDeliveryInBlock: number;
  maxParallelAttestInBlock: number;
  maxParallelClaimInBlock: number;
  manifest: BatchDealManifest[];
  saliNote: string;
  results: BatchPhaseDealResult[];
};


function payerKey(config: SettlementConfig): Hex {
  const pk = (config.payerSigner ?? process.env.PRIVATE_KEY)?.trim();
  if (!pk || pk.length < 66) throw new Error("Missing PRIVATE_KEY");
  return pk as Hex;
}

function payeeKey(config: SettlementConfig): Hex {
  const pk = (config.payeeSigner ?? process.env.AGENT_B_PRIVATE_KEY)?.trim();
  if (!pk || pk.length < 66) throw new Error("Missing AGENT_B_PRIVATE_KEY");
  return pk as Hex;
}

function dealIdFromReceipt(
  logs: { address: Address; topics: readonly `0x${string}`[] }[],
  escrowAddress: Address
): string | undefined {
  const log = logs.find(
    (l) => l.address.toLowerCase() === escrowAddress.toLowerCase() && l.topics[1]
  );
  return log?.topics[1] ? BigInt(log.topics[1]).toString() : undefined;
}

function blockCounts(blocks: string[]): number {
  const counts = new Map<string, number>();
  for (const b of blocks) counts.set(b, (counts.get(b) ?? 0) + 1);
  return Math.max(0, ...counts.values());
}

function burstConfig(config: SettlementConfig): SettlementConfig {
  return { ...config, rpcBurstWrites: true };
}

function createBatchClients(config: SettlementConfig) {
  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const router = (config.routerAddress ?? deployments.settlementRouter) as Address;
  const chain = {
    ...pharosChain,
    id: deployments.chainId,
    rpcUrls: { default: { http: [rpcUrl] } },
  } as const;
  const readConfig = config;
  const writeConfig = burstConfig(config);
  const publicClient = createPublicClient({
    chain,
    transport: transportFromConfig(readConfig, rpcUrl),
  });
  const payerAccount = privateKeyToAccount(payerKey(config));
  const payeeAccount = privateKeyToAccount(payeeKey(config));
  const payerClient = createWalletClient({
    account: payerAccount,
    chain,
    transport: transportFromConfig(writeConfig, rpcUrl),
  });
  const payeeClient = createWalletClient({
    account: payeeAccount,
    chain,
    transport: transportFromConfig(writeConfig, rpcUrl),
  });
  return {
    deployments,
    rpcUrl,
    router,
    chain,
    readConfig,
    writeConfig,
    publicClient,
    payerClient,
    payeeClient,
    payerAccount,
    payeeAccount,
    sequentialLocal: Boolean(config.inProcessProvider),
  };
}

type BatchClients = ReturnType<typeof createBatchClients>;

async function runPreflightForBatch(
  jobs: TrustedSettlementInput[],
  config: SettlementConfig,
  clients: BatchClients
): Promise<{ ready: boolean; pf: Awaited<ReturnType<typeof preflight>>; error?: string }> {
  let pf = await withRpcRetry("batch preflight", () => preflight(jobs[0]!, config));
  const totalAmount = jobs.reduce((s, j) => s + BigInt(j.amount), 0n);
  let batchReady = pf.ready || onlyPayeeNeedsOnboarding(pf.checks);

  if (batchReady && config.autoOnboardRecipients) {
    const payees = unregisteredPayeesFromJobs(jobs);
    const missing = config.mock ? payees : await filterUnregistered(payees, config);
    if (missing.length > 0) {
      await withRpcRetry("batch onboard", () => registerRecipients(missing, config));
      pf = await withRpcRetry("batch preflight refresh", () => preflight(jobs[0]!, config));
    }
  } else if (batchReady && !config.mock) {
    const payees = unregisteredPayeesFromJobs(jobs);
    const missing = await filterUnregistered(payees, config);
    if (missing.length > 0) {
      batchReady = false;
      pf.checks.push({
        name: "batch_payees_registered",
        passed: false,
        reason: `${missing.length} payee(s) need onboarding: ${missing.join(", ")}`,
      });
    }
  }

  batchReady = batchReady && pf.ready;

  if (batchReady) {
    try {
      const allowance = await withRpcRetry("batch allowance", () =>
        clients.publicClient.readContract({
          address: jobs[0]!.token as Address,
          abi: erc20Abi,
          functionName: "allowance",
          args: [jobs[0]!.agentA as Address, clients.deployments.dealEscrow as Address],
        })
      );
      if (allowance < totalAmount) {
        batchReady = false;
        pf.checks.push({
          name: "batch_allowance",
          passed: false,
          reason: `need allowance ≥ ${totalAmount} for ${jobs.length} deals`,
        });
      }
    } catch (e) {
      batchReady = false;
      pf.checks.push({ name: "batch_allowance_read", passed: false, reason: (e as Error).message });
    }
  }

  const error = batchReady
    ? undefined
    : pf.checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.reason ?? "failed"}`).join("; ");

  return { ready: batchReady, pf, error };
}

export async function fundDealsBatch(
  jobs: TrustedSettlementInput[],
  config: SettlementConfig = {}
): Promise<BatchFundOutput> {
  const batchMode = resolveBatchMode(config);
  const normalized = normalizeBatchJobs(jobs, batchMode);
  if (!config.mock) validatePayerBatchJobs(normalized, config, batchMode);

  const empty: BatchFundOutput = {
    success: false,
    batchMode,
    deals: jobs.length,
    succeeded: 0,
    failed: jobs.length,
    fundSubmitMs: 0,
    fundTxPerSec: 0,
    maxParallelFundInBlock: 0,
    manifest: [],
    saliNote: "",
    results: [],
  };

  if (jobs.length === 0) return { ...empty, success: true, failed: 0 };

  if (config.mock) {
    const manifest: BatchDealManifest[] = normalized.map((job, i) => ({
      index: i,
      dealId: String(i + 1),
      fundTx: "0x" + "11".repeat(32),
      amount: job.amount,
      agentA: job.agentA,
      agentB: job.agentB,
      token: job.token,
      workDescription: job.workDescription,
      workHash: workHash(job.workDescription),
      fundBlock: "100",
    }));
    return {
      success: true,
      batchMode,
      deals: jobs.length,
      succeeded: jobs.length,
      failed: 0,
      fundSubmitMs: 50,
      fundTxPerSec: jobs.length * 20,
      maxParallelFundInBlock: jobs.length,
      manifest,
      saliNote: `Mock fund batch (${batchMode}) — manifest ready for payee handoff.`,
      results: manifest.map((m) => ({
        index: m.index,
        success: true,
        dealId: m.dealId,
        fundTx: m.fundTx,
        fundBlock: m.fundBlock,
      })),
    };
  }

  const clients = createBatchClients(config);
  const { ready, pf, error } = await runPreflightForBatch(normalized, config, clients);
  const results: BatchPhaseDealResult[] = normalized.map((_, index) => ({
    index,
    success: false,
    error: ready ? undefined : error ?? "preflight failed",
  }));

  if (!ready) {
    return {
      ...empty,
      results,
      saliNote: error ? `Preflight: ${error}` : "No jobs passed preflight.",
    };
  }

  const readyJobs = normalized.map((job, index) => ({ job, index, pf }));
  const useHybrid = batchMode === "hybridWork";
  const fundSubmitStart = Date.now();
  const manifest: BatchDealManifest[] = [];

  async function submitFund(
    job: TrustedSettlementInput,
    index: number,
    pfHash: `0x${string}`,
    nonce?: number
  ): Promise<Hash> {
    const ttl = BigInt(job.ttlSeconds ?? 3600);
    const amount = BigInt(job.amount);
    const wh = workHash(job.workDescription);
    if (useHybrid) {
      const disputeWindow = BigInt(job.disputeWindowSeconds ?? 72 * 3600);
      return withRpcRetry(`fund #${index}`, () =>
        clients.payerClient.writeContract({
          address: clients.router,
          abi: settlementRouterAbi,
          functionName: "fundAndAcceptHybrid",
          args: [
            job.agentA as Address,
            job.agentB as Address,
            job.token as Address,
            amount,
            ttl,
            wh,
            pfHash,
            true,
            disputeWindow,
          ],
          ...(nonce !== undefined ? { nonce } : {}),
        })
      );
    }
    return withRpcRetry(`fund #${index}`, () =>
      clients.payerClient.writeContract({
        address: clients.router,
        abi: settlementRouterAbi,
        functionName: "fundAndAccept",
        args: [
          job.agentA as Address,
          job.agentB as Address,
          job.token as Address,
          amount,
          ttl,
          wh,
          pfHash,
        ],
        ...(nonce !== undefined ? { nonce } : {}),
      })
    );
  }

  async function confirmFund(
    index: number,
    job: TrustedSettlementInput,
    hash: Hash
  ): Promise<BatchDealManifest | null> {
    try {
      const receipt = await withRpcRetry(`fund receipt #${index}`, () =>
        clients.publicClient.waitForTransactionReceipt({ hash })
      );
      const dealId = dealIdFromReceipt(receipt.logs, clients.deployments.dealEscrow as Address);
      if (!dealId) throw new Error("dealId not found in logs");
      const fundBlock = receipt.blockNumber.toString();
      results[index] = { ...results[index], dealId, fundTx: hash, fundBlock, success: false };
      return {
        index,
        dealId,
        fundTx: hash,
        amount: job.amount,
        agentA: job.agentA,
        agentB: job.agentB,
        token: job.token,
        workDescription: job.workDescription,
        workHash: workHash(job.workDescription),
        fundBlock,
      };
    } catch (e) {
      results[index] = { ...results[index], error: (e as Error).message };
      return null;
    }
  }

  if (clients.sequentialLocal) {
    for (const { job, index, pf } of readyJobs) {
      try {
        const hash = await submitFund(job, index, pf.preflightHash as `0x${string}`);
        const m = await confirmFund(index, job, hash);
        if (m) manifest.push(m);
      } catch (e) {
        results[index] = { ...results[index], error: (e as Error).message };
      }
    }
  } else {
    const payerNonce = await withRpcRetry("payer nonce", () =>
      clients.publicClient.getTransactionCount({ address: clients.payerAccount.address })
    );
    const submissions = await Promise.all(
      readyJobs.map(async ({ job, index, pf }, i) => {
        try {
          const hash = await submitFund(job, index, pf.preflightHash as `0x${string}`, payerNonce + i);
          return { index, job, hash };
        } catch (e) {
          results[index] = { ...results[index], error: (e as Error).message };
          return null;
        }
      })
    );
    const confirmed = await Promise.all(
      submissions
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .map(({ index, job, hash }) => confirmFund(index, job, hash))
    );
    manifest.push(...confirmed.filter((x): x is BatchDealManifest => x !== null));
  }

  const fundSubmitMs = Date.now() - fundSubmitStart;
  const fundBlocks = manifest.map((m) => m.fundBlock).filter(Boolean) as string[];
  const maxParallelFundInBlock = blockCounts(fundBlocks);
  const succeeded = manifest.length;

  return {
    success: succeeded === jobs.length,
    batchMode,
    deals: jobs.length,
    succeeded,
    failed: jobs.length - succeeded,
    fundSubmitMs,
    fundTxPerSec: succeeded / Math.max(fundSubmitMs / 1000, 0.001),
    maxParallelFundInBlock,
    manifest,
    saliNote:
      clients.sequentialLocal
        ? "Local Hardhat — fund txs submitted sequentially."
        : maxParallelFundInBlock > 1
          ? `${maxParallelFundInBlock} fund txs in same block — Pharos SALI parallel execution.`
          : "Fund batch submitted with explicit nonces.",
    results,
  };
}

function resolveDeliveryHash(item: BatchDeliveryInput): `0x${string}` {
  if (item.resultHash?.startsWith("0x") && item.resultHash.length === 66) {
    return item.resultHash as `0x${string}`;
  }
  if (item.workDescription) return resultHashFromWork(item.workDescription);
  throw new Error("workDescription or resultHash required");
}

export async function submitDeliveriesBatch(
  deliveries: BatchDeliveryInput[],
  config: SettlementConfig = {}
): Promise<BatchDeliveryOutput> {
  validateDeliveryBatch(deliveries);
  const empty: BatchDeliveryOutput = {
    success: false,
    deals: deliveries.length,
    succeeded: 0,
    failed: deliveries.length,
    deliverySubmitMs: 0,
    deliveryTxPerSec: 0,
    maxParallelDeliveryInBlock: 0,
    saliNote: "",
    results: [],
  };
  if (deliveries.length === 0) return { ...empty, success: true, failed: 0 };

  const results: BatchPhaseDealResult[] = deliveries.map((d, index) => ({
    index: d.index ?? index,
    success: false,
    dealId: d.dealId,
  }));

  if (config.mock) {
    for (let i = 0; i < deliveries.length; i++) {
      results[i] = {
        ...results[i],
        success: true,
        deliverTx: "0x" + "33".repeat(32),
        deliverBlock: "102",
      };
    }
    return {
      success: true,
      deals: deliveries.length,
      succeeded: deliveries.length,
      failed: 0,
      deliverySubmitMs: 40,
      deliveryTxPerSec: deliveries.length * 25,
      maxParallelDeliveryInBlock: deliveries.length,
      saliNote: "Mock delivery batch complete.",
      results,
    };
  }

  const clients = createBatchClients(config);
  const start = Date.now();

  async function submitOne(item: BatchDeliveryInput, index: number, nonce?: number): Promise<void> {
    try {
      const hash = resolveDeliveryHash(item);
      const tx = await withRpcRetry(`deliver #${index}`, () =>
        clients.payeeClient.writeContract({
          address: clients.router,
          abi: settlementRouterAbi,
          functionName: "submitDelivery",
          args: [BigInt(item.dealId), hash],
          ...(nonce !== undefined ? { nonce } : {}),
        })
      );
      const receipt = await withRpcRetry(`deliver receipt #${index}`, () =>
        clients.publicClient.waitForTransactionReceipt({ hash: tx })
      );
      results[index] = {
        ...results[index],
        success: true,
        deliverTx: tx,
        deliverBlock: receipt.blockNumber.toString(),
      };
    } catch (e) {
      results[index] = { ...results[index], error: (e as Error).message };
    }
  }

  if (clients.sequentialLocal) {
    for (let i = 0; i < deliveries.length; i++) {
      await submitOne(deliveries[i]!, results[i]!.index, undefined);
    }
  } else {
    const nonce = await withRpcRetry("payee nonce deliver", () =>
      clients.publicClient.getTransactionCount({ address: clients.payeeAccount.address })
    );
    await Promise.all(deliveries.map((item, i) => submitOne(item, results[i]!.index, nonce + i)));
  }

  const deliverySubmitMs = Date.now() - start;
  const blocks = results.filter((r) => r.deliverBlock).map((r) => r.deliverBlock!);
  const succeeded = results.filter((r) => r.success).length;

  return {
    success: succeeded === deliveries.length,
    deals: deliveries.length,
    succeeded,
    failed: deliveries.length - succeeded,
    deliverySubmitMs,
    deliveryTxPerSec: succeeded / Math.max(deliverySubmitMs / 1000, 0.001),
    maxParallelDeliveryInBlock: blockCounts(blocks),
    saliNote:
      succeeded === deliveries.length
        ? "Delivery batch complete — payer may attest_release batch."
        : "Some deliveries failed.",
    results,
  };
}

export async function attestReleasesBatch(
  attestations: BatchAttestInput[],
  config: SettlementConfig = {}
): Promise<BatchAttestOutput> {
  validateAttestBatch(attestations);
  const empty: BatchAttestOutput = {
    success: false,
    deals: attestations.length,
    succeeded: 0,
    failed: attestations.length,
    attestSubmitMs: 0,
    attestTxPerSec: 0,
    maxParallelAttestInBlock: 0,
    saliNote: "",
    results: [],
  };
  if (attestations.length === 0) return { ...empty, success: true, failed: 0 };

  const results: BatchPhaseDealResult[] = attestations.map((a, index) => ({
    index: a.index ?? index,
    success: false,
    dealId: a.dealId,
  }));

  if (config.mock) {
    for (let i = 0; i < attestations.length; i++) {
      results[i] = {
        ...results[i],
        success: true,
        attestTx: "0x" + "44".repeat(32),
        attestBlock: "103",
      };
    }
    return {
      success: true,
      deals: attestations.length,
      succeeded: attestations.length,
      failed: 0,
      attestSubmitMs: 40,
      attestTxPerSec: attestations.length * 25,
      maxParallelAttestInBlock: attestations.length,
      saliNote: "Mock attest batch complete.",
      results,
    };
  }

  const clients = createBatchClients(config);
  const start = Date.now();

  async function submitOne(item: BatchAttestInput, index: number, nonce?: number): Promise<void> {
    try {
      const hash = resolveDeliveryHash(item);
      const tx = await withRpcRetry(`attest #${index}`, () =>
        clients.payerClient.writeContract({
          address: clients.router,
          abi: settlementRouterAbi,
          functionName: "attestRelease",
          args: [BigInt(item.dealId), hash],
          ...(nonce !== undefined ? { nonce } : {}),
        })
      );
      const receipt = await withRpcRetry(`attest receipt #${index}`, () =>
        clients.publicClient.waitForTransactionReceipt({ hash: tx })
      );
      results[index] = {
        ...results[index],
        success: true,
        attestTx: tx,
        attestBlock: receipt.blockNumber.toString(),
      };
    } catch (e) {
      results[index] = { ...results[index], error: (e as Error).message };
    }
  }

  if (clients.sequentialLocal) {
    for (let i = 0; i < attestations.length; i++) {
      await submitOne(attestations[i]!, results[i]!.index, undefined);
    }
  } else {
    const nonce = await withRpcRetry("payer nonce attest", () =>
      clients.publicClient.getTransactionCount({ address: clients.payerAccount.address })
    );
    await Promise.all(attestations.map((item, i) => submitOne(item, results[i]!.index, nonce + i)));
  }

  const attestSubmitMs = Date.now() - start;
  const blocks = results.filter((r) => r.attestBlock).map((r) => r.attestBlock!);
  const succeeded = results.filter((r) => r.success).length;

  return {
    success: succeeded === attestations.length,
    deals: attestations.length,
    succeeded,
    failed: attestations.length - succeeded,
    attestSubmitMs,
    attestTxPerSec: succeeded / Math.max(attestSubmitMs / 1000, 0.001),
    maxParallelAttestInBlock: blockCounts(blocks),
    saliNote:
      succeeded === attestations.length
        ? "Attest batch complete — payee may complete_claims_batch."
        : "Some attests failed.",
    results,
  };
}

export async function claimDealsBatch(
  claims: BatchClaimInput[],
  config: SettlementConfig = {}
): Promise<BatchClaimOutput> {
  validateClaimBatch(claims);
  if (!config.mock) validatePayeeManifest(claims, config);

  const empty: BatchClaimOutput = {
    success: false,
    deals: claims.length,
    succeeded: 0,
    failed: claims.length,
    claimPhaseMs: 0,
    claimTxPerSec: 0,
    maxParallelClaimInBlock: 0,
    avgFinalityMs: 0,
    totalFeesWei: "0",
    saliNote: "",
    results: [],
  };
  if (claims.length === 0) return { ...empty, success: true, failed: 0 };

  const results: BatchPhaseDealResult[] = claims.map((c, index) => ({
    index: c.index ?? index,
    success: false,
    dealId: c.dealId,
    fundTx: c.fundTx,
  }));

  if (config.mock) {
    const feeQuote = await getFeeQuote(claims[0]?.amount ?? "0", { mock: true });
    const perFee = BigInt(feeQuote.feeAmount);
    for (let i = 0; i < claims.length; i++) {
      results[i] = {
        ...results[i],
        success: true,
        claimTx: "0x" + "22".repeat(32),
        claimBlock: "104",
        finalityMs: 400 + i * 10,
        feeAmount: perFee.toString(),
      };
    }
    return {
      success: true,
      deals: claims.length,
      succeeded: claims.length,
      failed: 0,
      claimPhaseMs: 60,
      claimTxPerSec: claims.length * 16,
      maxParallelClaimInBlock: claims.length,
      avgFinalityMs: 450,
      totalFeesWei: (perFee * BigInt(claims.length)).toString(),
      saliNote: "Mock claim batch complete.",
      results,
    };
  }

  const clients = createBatchClients(config);
  const feeQuote = await getFeeQuote(claims[0]!.amount, config);
  const feePerDeal = BigInt(feeQuote.feeAmount);
  const start = Date.now();

  async function submitOne(item: BatchClaimInput, index: number, nonce?: number): Promise<void> {
    try {
      const proofHash = computeProofHash(item.fundTx, item.amount, item.agentB);
      const claimStart = Date.now();
      const tx = await withRpcRetry(`claim #${index}`, () =>
        clients.payeeClient.writeContract({
          address: clients.router,
          abi: settlementRouterAbi,
          functionName: "claim",
          args: [BigInt(item.dealId), proofHash],
          ...(nonce !== undefined ? { nonce } : {}),
        })
      );
      const receipt = await withRpcRetry(`claim receipt #${index}`, () =>
        clients.publicClient.waitForTransactionReceipt({ hash: tx })
      );
      const finalityMs = Date.now() - claimStart;
      results[index] = {
        ...results[index],
        success: true,
        claimTx: tx,
        claimBlock: receipt.blockNumber.toString(),
        finalityMs,
        feeAmount: feePerDeal.toString(),
      };
    } catch (e) {
      results[index] = { ...results[index], error: (e as Error).message };
    }
  }

  if (clients.sequentialLocal) {
    for (let i = 0; i < claims.length; i++) {
      await submitOne(claims[i]!, results[i]!.index, undefined);
    }
  } else {
    const nonce = await withRpcRetry("payee nonce claim", () =>
      clients.publicClient.getTransactionCount({ address: clients.payeeAccount.address })
    );
    await Promise.all(claims.map((item, i) => submitOne(item, results[i]!.index, nonce + i)));
  }

  const claimPhaseMs = Date.now() - start;
  const blocks = results.filter((r) => r.claimBlock).map((r) => r.claimBlock!);
  const succeeded = results.filter((r) => r.success).length;
  const avgFinality =
    results.filter((r) => r.finalityMs).reduce((s, r) => s + (r.finalityMs ?? 0), 0) /
    Math.max(succeeded, 1);

  return {
    success: succeeded === claims.length,
    deals: claims.length,
    succeeded,
    failed: claims.length - succeeded,
    claimPhaseMs,
    claimTxPerSec: succeeded / Math.max(claimPhaseMs / 1000, 0.001),
    maxParallelClaimInBlock: blockCounts(blocks),
    avgFinalityMs: Math.round(avgFinality),
    totalFeesWei: (feePerDeal * BigInt(succeeded)).toString(),
    saliNote:
      succeeded === claims.length
        ? `${succeeded} claims confirmed — batch settlement complete.`
        : "Some claims failed.",
    results,
  };
}

function manifestToClaims(manifest: BatchDealManifest[]): BatchClaimInput[] {
  return manifest.map((m) => ({
    index: m.index,
    dealId: m.dealId,
    fundTx: m.fundTx,
    amount: m.amount,
    agentB: m.agentB,
  }));
}

function manifestToDeliveries(manifest: BatchDealManifest[]): BatchDeliveryInput[] {
  return manifest.map((m) => ({
    index: m.index,
    dealId: m.dealId,
    workDescription: m.workDescription,
    resultHash: resultHashFromWork(m.workDescription),
  }));
}

function manifestToAttestations(manifest: BatchDealManifest[]): BatchAttestInput[] {
  return manifest.map((m) => ({
    index: m.index,
    dealId: m.dealId,
    workDescription: m.workDescription,
    resultHash: resultHashFromWork(m.workDescription),
  }));
}

function mergePhaseResults(
  fund: BatchFundOutput,
  claim: BatchClaimOutput,
  delivery?: BatchDeliveryOutput,
  attest?: BatchAttestOutput
): BatchPhaseDealResult[] {
  const byIndex = new Map<number, BatchPhaseDealResult>();
  for (const r of fund.results) byIndex.set(r.index, { ...r });
  if (delivery) {
    for (const r of delivery.results) {
      const prev = byIndex.get(r.index) ?? { index: r.index, success: false };
      byIndex.set(r.index, { ...prev, ...r });
    }
  }
  if (attest) {
    for (const r of attest.results) {
      const prev = byIndex.get(r.index) ?? { index: r.index, success: false };
      byIndex.set(r.index, { ...prev, ...r });
    }
  }
  for (const r of claim.results) {
    const prev = byIndex.get(r.index) ?? { index: r.index, success: false };
    byIndex.set(r.index, { ...prev, ...r, success: r.success });
  }
  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

export async function executeBatchSettlement(
  jobs: TrustedSettlementInput[],
  config: SettlementConfig = {}
): Promise<BatchSettlementOutput> {
  const start = Date.now();
  const batchMode = resolveBatchMode(config);
  const burstCfg = { ...config, batchMode, rpcBurstWrites: true };

  const empty: BatchSettlementOutput = {
    success: false,
    batchMode,
    deals: jobs.length,
    succeeded: 0,
    failed: jobs.length,
    fundSubmitMs: 0,
    fundConfirmMs: 0,
    deliverySubmitMs: 0,
    attestSubmitMs: 0,
    claimPhaseMs: 0,
    totalMs: 0,
    fundTxPerSec: 0,
    deliveryTxPerSec: 0,
    attestTxPerSec: 0,
    claimTxPerSec: 0,
    endToEndDealsPerSec: 0,
    avgFinalityMs: 0,
    totalFeesWei: "0",
    maxParallelInBlock: 0,
    maxParallelFundInBlock: 0,
    maxParallelDeliveryInBlock: 0,
    maxParallelAttestInBlock: 0,
    maxParallelClaimInBlock: 0,
    manifest: [],
    saliNote: "",
    results: [],
  };

  if (jobs.length === 0) return { ...empty, success: true, failed: 0 };

  const funded = await fundDealsBatch(jobs, burstCfg);
  if (!funded.success && !config.mock) {
    return {
      ...empty,
      totalMs: Date.now() - start,
      fundSubmitMs: funded.fundSubmitMs,
      fundTxPerSec: funded.fundTxPerSec,
      maxParallelFundInBlock: funded.maxParallelFundInBlock,
      maxParallelInBlock: funded.maxParallelFundInBlock,
      manifest: funded.manifest,
      saliNote: funded.saliNote,
      results: funded.results,
    };
  }

  let delivery: BatchDeliveryOutput | undefined;
  let attest: BatchAttestOutput | undefined;

  if (batchMode === "hybridWork") {
    delivery = await submitDeliveriesBatch(manifestToDeliveries(funded.manifest), burstCfg);
    if (!delivery.success && !config.mock) {
      return {
        ...empty,
        totalMs: Date.now() - start,
        fundSubmitMs: funded.fundSubmitMs,
        deliverySubmitMs: delivery.deliverySubmitMs,
        fundTxPerSec: funded.fundTxPerSec,
        deliveryTxPerSec: delivery.deliveryTxPerSec,
        maxParallelFundInBlock: funded.maxParallelFundInBlock,
        maxParallelDeliveryInBlock: delivery.maxParallelDeliveryInBlock,
        maxParallelInBlock: funded.maxParallelFundInBlock,
        manifest: funded.manifest,
        saliNote: delivery.saliNote,
        results: mergePhaseResults(funded, { ...empty, results: [], claimPhaseMs: 0, claimTxPerSec: 0, maxParallelClaimInBlock: 0, avgFinalityMs: 0, totalFeesWei: "0", saliNote: "", deals: 0, succeeded: 0, failed: 0 }, delivery),
      };
    }
    attest = await attestReleasesBatch(manifestToAttestations(funded.manifest), burstCfg);
    if (!attest.success && !config.mock) {
      return {
        ...empty,
        totalMs: Date.now() - start,
        fundSubmitMs: funded.fundSubmitMs,
        deliverySubmitMs: delivery.deliverySubmitMs,
        attestSubmitMs: attest.attestSubmitMs,
        manifest: funded.manifest,
        saliNote: attest.saliNote,
        results: mergePhaseResults(
          funded,
          { ...empty, results: [], claimPhaseMs: 0, claimTxPerSec: 0, maxParallelClaimInBlock: 0, avgFinalityMs: 0, totalFeesWei: "0", saliNote: "", deals: 0, succeeded: 0, failed: 0 },
          delivery,
          attest
        ),
      };
    }
  }

  const claimed = await claimDealsBatch(manifestToClaims(funded.manifest), burstCfg);
  const totalMs = Date.now() - start;
  const results = mergePhaseResults(funded, claimed, delivery, attest);
  const succeeded = results.filter((r) => r.success).length;

  const saliNote =
    batchMode === "hybridWork"
      ? succeeded === jobs.length
        ? `${succeeded} full work-settlement deals across fund→deliver→attest→claim phases.`
        : "Hybrid batch completed with some failures."
      : funded.maxParallelFundInBlock > 1
        ? `${funded.maxParallelFundInBlock} fund txs in same block — Pharos SALI parallel execution.`
        : funded.saliNote;

  return {
    success: succeeded === jobs.length,
    batchMode,
    deals: jobs.length,
    succeeded,
    failed: jobs.length - succeeded,
    fundSubmitMs: funded.fundSubmitMs,
    fundConfirmMs: 0,
    deliverySubmitMs: delivery?.deliverySubmitMs ?? 0,
    attestSubmitMs: attest?.attestSubmitMs ?? 0,
    claimPhaseMs: claimed.claimPhaseMs,
    totalMs,
    fundTxPerSec: funded.fundTxPerSec,
    deliveryTxPerSec: delivery?.deliveryTxPerSec ?? 0,
    attestTxPerSec: attest?.attestTxPerSec ?? 0,
    claimTxPerSec: claimed.claimTxPerSec,
    endToEndDealsPerSec: succeeded / Math.max(totalMs / 1000, 0.001),
    avgFinalityMs: claimed.avgFinalityMs,
    totalFeesWei: claimed.totalFeesWei,
    maxParallelInBlock: funded.maxParallelFundInBlock,
    maxParallelFundInBlock: funded.maxParallelFundInBlock,
    maxParallelDeliveryInBlock: delivery?.maxParallelDeliveryInBlock ?? 0,
    maxParallelAttestInBlock: attest?.maxParallelAttestInBlock ?? 0,
    maxParallelClaimInBlock: claimed.maxParallelClaimInBlock,
    manifest: funded.manifest,
    saliNote,
    results,
  };
}
