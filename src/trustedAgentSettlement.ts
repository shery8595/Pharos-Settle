import { createPublicClient, type Address } from "viem";
import { transportFromConfig } from "./shared/clients.js";
import { ATLANTIC, explorerTxUrl, loadDeployments, resolveDeploymentNetwork } from "./shared/chain.js";
import type {
  TrustedSettlementInput,
  SettlementConfig,
  TrustedSettlementOutput,
  SimulationOutput,
  SettlementStatus,
  ReclaimOutput,
  RegisterRecipientsOutput,
  SettlementMode,
  FundDealOutput,
  DealTerms,
  AgentReadiness,
} from "./shared/schemas.js";
import type {
  BatchSettlementOutput,
  BatchFundOutput,
  BatchDeliveryOutput,
  BatchAttestOutput,
  BatchClaimOutput,
} from "./internal/settle/batch.js";
import { preflight } from "./internal/preflight/index.js";
import {
  settle,
  fundDeal,
  reclaimDeal,
  claimDeal,
  readCanClaim,
  executeBatchSettlement,
  fundDealsBatch,
  submitDeliveriesBatch,
  attestReleasesBatch,
  claimDealsBatch,
  submitDeliveryWithHash,
  attestReleaseWithHash,
  resultHashFromWork,
} from "./internal/settle/index.js";
import { workHash } from "./internal/preflight/index.js";
import { getAgentReadiness } from "./internal/agent/readiness.js";
import { prove } from "./internal/prove/index.js";
import { settlementRouterAbi, DEAL_STATE, type NextAction } from "./shared/abis.js";
import { getFeeQuote } from "./internal/commerce/feeQuote.js";
import { computeNextAction, computeReclaimable, type DealSnapshot } from "./internal/commerce/nextAction.js";
import { computeProofHash } from "./internal/prove/index.js";
import { onlyPayeeNeedsOnboarding } from "./internal/preflight/onboarding.js";
import { ensureRecipientsOnboarded } from "./internal/onboard/ensure.js";
import { registerRecipients, registerRecipient } from "./internal/onboard/recipients.js";

const settledCache = new Map<string, TrustedSettlementOutput>();

const pharosChain = {
  id: ATLANTIC.chainId,
  name: "Pharos Atlantic",
  nativeCurrency: { name: "PHRS", symbol: "PHRS", decimals: 18 },
  rpcUrls: { default: { http: [ATLANTIC.rpcUrl] } },
} as const;

function resolveMode(config: SettlementConfig): SettlementMode {
  if (config.mode === "safetyNet") return "safetyNet";
  return "cooperative";
}

function simulateNextAction(
  checks: { name: string; passed: boolean }[],
  ready: boolean,
  mode: SettlementMode
): NextAction {
  if (!ready) {
    if (onlyPayeeNeedsOnboarding(checks)) return "onboardRecipient";
    return "wait";
  }
  if (mode === "safetyNet") return "reclaim";
  return "fund";
}

export async function simulateTrustedSettlement(
  input: TrustedSettlementInput,
  config: SettlementConfig = {}
): Promise<SimulationOutput> {
  const start = Date.now();
  const pf = await preflight(input, config);
  const mode = resolveMode(config);
  const routerAddress =
    config.routerAddress ??
    (config.mock ? "0x" + "00".repeat(20) : loadDeployments(resolveDeploymentNetwork(config)).settlementRouter);
  const feeQuote = await getFeeQuote(input.amount, config);

  const canProceed = pf.ready || onlyPayeeNeedsOnboarding(pf.checks);

  return {
    success: canProceed,
    routerAddress,
    nextAction: simulateNextAction(pf.checks, pf.ready, mode),
    feeQuote,
    stages: {
      preflight: pf,
      prove: {
        preSettlement: { verified: pf.ready, method: "skipped" },
      },
    },
    totalDurationMs: Date.now() - start,
  };
}

export async function executeTrustedSettlement(
  input: TrustedSettlementInput,
  config: SettlementConfig = {}
): Promise<TrustedSettlementOutput> {
  const start = Date.now();
  const mode = resolveMode(config);
  const cacheKey = `${mode}:${input.agentA}:${input.agentB}:${input.amount}:${input.workDescription}`;
  const cached = settledCache.get(cacheKey);
  if (cached?.success) return cached;

  const routerAddress =
    config.routerAddress ??
    (config.mock ? "0x" + "00".repeat(20) : loadDeployments(resolveDeploymentNetwork(config)).settlementRouter);
  const feeQuote = await getFeeQuote(input.amount, config);

  if (mode === "safetyNet" && config.dealId) {
    const reclaim = await reclaimTrustedSettlement(config.dealId, config);
    return {
      success: reclaim.success,
      dealId: config.dealId,
      routerAddress,
      nextAction: reclaim.nextAction,
      feeQuote,
      stages: {
        preflight: { ready: reclaim.success, checks: [] },
        prove: {},
      },
      totalDurationMs: Date.now() - start,
    };
  }

  let pf = await preflight(input, config);
  let onboardResult: RegisterRecipientsOutput | undefined;

  if (!pf.ready && config.autoOnboardRecipients) {
    const ensured = await ensureRecipientsOnboarded(input, config, pf);
    pf = ensured.pf;
    onboardResult = ensured.onboard;
  }

  if (!pf.ready) {
    return {
      success: false,
      routerAddress,
      nextAction: simulateNextAction(pf.checks, pf.ready, mode),
      feeQuote,
      stages: { preflight: pf, prove: {} },
      totalDurationMs: Date.now() - start,
    };
  }

  const settleConfig = { ...config, mode };
  const settleResult = await settle(input, settleConfig, pf.preflightHash);

  let proveResult: TrustedSettlementOutput["stages"]["prove"] = {};
  let success = false;

  if (settleResult.claimTx) {
    proveResult = await prove(
      {
        token: input.token,
        payee: input.agentB,
        amount: input.amount,
        claimTxHash: settleResult.claimTx,
        claimBlockNumber: settleResult.settlementReceipt
          ? BigInt(settleResult.settlementReceipt.blockNumber)
          : undefined,
      },
      config
    );
    success = proveResult.postSettlement?.verified ?? false;
  }

  const nextAction: NextAction = settleResult.claimTx
    ? "done"
    : config.skipAttest
      ? "wait"
      : settleResult.attestTx
        ? "wait"
        : settleResult.deliverTx
          ? "attest"
          : "deliver";

  const output: TrustedSettlementOutput = {
    success,
    dealId: settleResult.dealId,
    routerAddress,
    nextAction,
    feeQuote,
    stages: {
      preflight: pf,
      onboard: onboardResult
        ? {
            registerTx: onboardResult.registerTx,
            recipients: onboardResult.registered,
            explorerLink: onboardResult.explorerLink,
          }
        : undefined,
      prove: proveResult,
      settle: {
        fundTx: settleResult.fundTx,
        deliverTx: settleResult.deliverTx,
        attestTx: settleResult.attestTx,
        claimTx: settleResult.claimTx,
        settlementReceipt: settleResult.settlementReceipt,
      },
    },
    explorerLink: settleResult.claimTx
      ? explorerTxUrl(
          settleResult.claimTx,
          config.mock ? ATLANTIC.chainId : loadDeployments(resolveDeploymentNetwork(config)).chainId
        )
      : undefined,
    totalDurationMs: Date.now() - start,
  };

  if (output.success) settledCache.set(cacheKey, output);
  return output;
}

async function chainNowSec(config: SettlementConfig): Promise<number> {
  if (config.mock) return Math.floor(Date.now() / 1000);
  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const client = createPublicClient({
    chain: { ...pharosChain, id: deployments.chainId },
    transport: transportFromConfig(config, rpcUrl),
  });
  const block = await client.getBlock({ blockTag: "latest" });
  return Number(block.timestamp);
}

async function fetchDealSnapshot(
  dealId: string,
  config: SettlementConfig
): Promise<{ deal: DealSnapshot; raw: Awaited<ReturnType<typeof readDeal>> }> {
  const deal = await readDeal(dealId, config);
  const canClaim = config.mock ? false : await readCanClaim(dealId, config);
  const snapshot: DealSnapshot = {
    state: Number(deal.state),
    deadline: deal.deadline,
    requiresHybridRelease: deal.requiresHybridRelease,
    deliverySubmittedAt: BigInt(deal.deliverySubmittedAt),
    disputeWindow: BigInt(deal.disputeWindow),
    payerAttested: deal.payerAttested,
    canClaim,
  };
  return { deal: snapshot, raw: deal };
}

function mockDeal(dealId: string) {
  const now = Math.floor(Date.now() / 1000);
  const zero = ("0x" + "00".repeat(32)) as `0x${string}`;
  return {
    payer: ("0x1111111111111111111111111111111111111111") as Address,
    payee: ("0x2222222222222222222222222222222222222222") as Address,
    token: ("0x3333333333333333333333333333333333333333") as Address,
    amount: 1000000000000000000n,
    state: 2,
    deadline: BigInt(now + 86400),
    workHash: zero,
    preflightHash: zero,
    proofHash: zero,
    requiresHybridRelease: true,
    resultHash: zero,
    deliverySubmittedAt: 0n,
    disputeWindow: 3600n,
    payerAttested: false,
  };
}

async function readDeal(dealId: string, config: SettlementConfig) {
  if (config.mock) return mockDeal(dealId);

  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const router = (config.routerAddress ?? deployments.settlementRouter) as Address;
  const client = createPublicClient({
    chain: pharosChain,
    transport: transportFromConfig(config, rpcUrl),
  });
  return client.readContract({
    address: router,
    abi: settlementRouterAbi,
    functionName: "getDeal",
    args: [BigInt(dealId)],
  });
}

export async function getSettlementStatus(
  dealId: string,
  config: SettlementConfig = {}
): Promise<SettlementStatus> {
  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const chainId = config.mock ? ATLANTIC.chainId : deployments.chainId;
  const { deal: snapshot, raw: deal } = await fetchDealSnapshot(dealId, config);
  const now = await chainNowSec(config);
  const state = DEAL_STATE[snapshot.state] ?? "Created";
  const reclaimable = computeReclaimable(snapshot, now);
  const nextAction = computeNextAction(snapshot, now);
  const autoReleaseAt =
    snapshot.deliverySubmittedAt > 0n
      ? (Number(snapshot.deliverySubmittedAt) + Number(snapshot.disputeWindow)).toString()
      : undefined;
  const feeQuote = await getFeeQuote(deal.amount.toString(), config);
  const zeroHash = ("0x" + "00".repeat(32)) as `0x${string}`;
  const onChainResultHash =
    deal.resultHash && deal.resultHash !== zeroHash ? String(deal.resultHash) : null;
  const terms: DealTerms = {
    payer: deal.payer,
    payee: deal.payee,
    token: deal.token,
    amount: deal.amount.toString(),
    workHash: String(deal.workHash),
    onChainResultHash,
    workDescriptionHint:
      "keccak256(workDescription) must equal workHash; submit_delivery uses keccak256(bytes('delivery:' + workDescription)) or pass matching resultHash",
  };

  return {
    dealId,
    state,
    payer: deal.payer,
    payee: deal.payee,
    token: deal.token,
    amount: deal.amount.toString(),
    deadline: deal.deadline.toString(),
    reclaimable,
    requiresHybridRelease: deal.requiresHybridRelease,
    deliverySubmitted: snapshot.deliverySubmittedAt > 0n,
    payerAttested: deal.payerAttested,
    canClaim: snapshot.canClaim,
    autoReleaseAt,
    nextAction,
    feeQuote,
    terms,
  };
}

function buildDealTerms(input: TrustedSettlementInput): DealTerms {
  const wh = workHash(input.workDescription);
  return {
    payer: input.agentA,
    payee: input.agentB,
    token: input.token,
    amount: input.amount,
    workHash: wh,
    onChainResultHash: null,
    workDescriptionHint:
      "share exact workDescription with payee; resultHash = keccak256('delivery:' + workDescription)",
  };
}

export async function fundDealSettlement(
  input: TrustedSettlementInput,
  config: SettlementConfig = {}
): Promise<FundDealOutput> {
  let pf = await preflight(input, config);
  let onboard: RegisterRecipientsOutput | undefined;

  if (!pf.ready && config.autoOnboardRecipients) {
    const ensured = await ensureRecipientsOnboarded(input, config, pf);
    pf = ensured.pf;
    onboard = ensured.onboard;
  }

  if (!pf.ready) {
    return {
      success: false,
      reason: pf.checks.filter((c) => !c.passed).map((c) => c.name).join(", "),
      stages: { preflight: pf, onboard: onboard ? { recipients: onboard.registered } : undefined },
    };
  }

  const result = await fundDeal(input, config, pf.preflightHash);
  return {
    success: true,
    dealId: result.dealId,
    fundTx: result.fundTx,
    nextAction: "deliver",
    terms: buildDealTerms(input),
    stages: { preflight: pf, onboard: onboard ? { recipients: onboard.registered } : undefined },
  };
}

export async function submitDeliveryForDeal(
  dealId: string,
  args: { workDescription?: string; resultHash?: string },
  config: SettlementConfig = {}
): Promise<{ success: boolean; deliverTx: string }> {
  const tx = await submitDeliveryWithHash(dealId, args, config);
  return { success: true, deliverTx: tx };
}

export async function attestReleaseForDeal(
  dealId: string,
  args: { workDescription?: string; resultHash?: string },
  config: SettlementConfig = {}
): Promise<{ success: boolean; attestTx: string }> {
  const tx = await attestReleaseWithHash(dealId, args, config);
  return { success: true, attestTx: tx };
}

export async function getAgentReadinessStatus(
  config: SettlementConfig = {}
): Promise<AgentReadiness> {
  return getAgentReadiness(config);
}

export { resultHashFromWork };

export async function reclaimTrustedSettlement(
  dealId: string,
  config: SettlementConfig = {}
): Promise<ReclaimOutput> {
  const status = await getSettlementStatus(dealId, config);
  if (!status.reclaimable) {
    return {
      success: false,
      dealId,
      reason:
        status.state === "Released"
          ? "already released"
          : status.deliverySubmitted
            ? "delivery submitted — reclaim blocked"
            : "not yet expired",
      nextAction: status.nextAction,
    };
  }
  const refundTx = await reclaimDeal(dealId, config);
  return { success: true, dealId, refundTx, nextAction: "done" };
}

/** Complete claim for a deal that is already eligible (e.g. after auto-release window). */
export async function completeClaimForDeal(
  dealId: string,
  input: Pick<TrustedSettlementInput, "amount" | "agentB">,
  config: SettlementConfig = {}
): Promise<TrustedSettlementOutput> {
  const canClaim = config.mock || (await readCanClaim(dealId, config));
  if (!canClaim) {
    throw new Error("deal not yet claimable");
  }
  const proofHash = computeProofHash(`deal:${dealId}`, input.amount, input.agentB);
  const claimResult = await claimDeal(dealId, proofHash, config);
  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const routerAddress = (config.routerAddress ?? deployments.settlementRouter) as string;
  const proveResult = await prove(
    {
      token: "",
      payee: input.agentB,
      amount: input.amount,
      claimTxHash: claimResult.claimTx,
      claimBlockNumber: BigInt(claimResult.blockNumber),
    },
    config
  );
  return {
    success: proveResult.postSettlement?.verified ?? true,
    dealId,
    routerAddress,
    nextAction: "done",
    stages: {
      preflight: { ready: true, checks: [] },
      prove: proveResult,
      settle: {
        claimTx: claimResult.claimTx,
        settlementReceipt: {
          txHash: claimResult.claimTx,
          blockNumber: claimResult.blockNumber,
          finalityMs: claimResult.finalityMs,
        },
      },
    },
    explorerLink: explorerTxUrl(claimResult.claimTx, deployments.chainId),
    totalDurationMs: claimResult.finalityMs,
  };
}

export {
  executeBatchSettlement,
  fundDealsBatch,
  submitDeliveriesBatch,
  attestReleasesBatch,
  claimDealsBatch,
  filterManifestForPayee,
  manifestToClaims,
  fundDeal,
  reclaimDeal,
  submitDeliveryWithHash,
  attestReleaseWithHash,
} from "./internal/settle/index.js";
export { registerRecipients, registerRecipient } from "./internal/onboard/recipients.js";
export type {
  BatchSettlementOutput,
  BatchFundOutput,
  BatchDeliveryOutput,
  BatchAttestOutput,
  BatchClaimOutput,
};
