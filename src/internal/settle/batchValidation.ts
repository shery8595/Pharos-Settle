import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import type {
  BatchAttestInput,
  BatchClaimInput,
  BatchDeliveryInput,
  BatchMode,
  SettlementConfig,
  TrustedSettlementInput,
} from "../../shared/schemas.js";

function payerAddress(config: SettlementConfig): string {
  const pk = (config.payerSigner ?? process.env.PRIVATE_KEY)?.trim();
  if (!pk || pk.length < 66) throw new Error("Missing PRIVATE_KEY");
  return privateKeyToAccount(pk as Hex).address;
}

function payeeAddress(config: SettlementConfig): string {
  const pk = (config.payeeSigner ?? process.env.AGENT_B_PRIVATE_KEY)?.trim();
  if (!pk || pk.length < 66) throw new Error("Missing AGENT_B_PRIVATE_KEY");
  return privateKeyToAccount(pk as Hex).address;
}

export function resolveBatchMode(config: SettlementConfig): BatchMode {
  return config.batchMode ?? "saliFast";
}

export function normalizeBatchJobs(
  jobs: TrustedSettlementInput[],
  batchMode: BatchMode
): TrustedSettlementInput[] {
  return jobs.map((job) => ({
    ...job,
    requiresHybridRelease: batchMode === "hybridWork",
  }));
}

export function validatePayerBatchJobs(
  jobs: TrustedSettlementInput[],
  config: SettlementConfig,
  batchMode: BatchMode
): void {
  if (jobs.length === 0) throw new Error("batch requires at least one job");
  const payer = payerAddress(config).toLowerCase();
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]!;
    if (job.agentA.toLowerCase() !== payer) {
      throw new Error(`job[${i}] agentA must match payer signer ${payer}`);
    }
    const hybrid = job.requiresHybridRelease ?? batchMode === "hybridWork";
    if (batchMode === "saliFast" && hybrid) {
      throw new Error(`job[${i}] saliFast requires requiresHybridRelease false`);
    }
    if (batchMode === "hybridWork" && !hybrid) {
      throw new Error(`job[${i}] hybridWork requires requiresHybridRelease true`);
    }
  }
}

export function validatePayeeManifest(
  items: { agentB: string }[],
  config: SettlementConfig
): void {
  const payee = payeeAddress(config).toLowerCase();
  for (let i = 0; i < items.length; i++) {
    if (items[i]!.agentB.toLowerCase() !== payee) {
      throw new Error(`manifest[${i}] agentB must match payee signer ${payee}`);
    }
  }
}

export function validateDeliveryBatch(items: BatchDeliveryInput[]): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (!item.dealId) throw new Error(`delivery[${i}] dealId required`);
    if (!item.workDescription && !item.resultHash) {
      throw new Error(`delivery[${i}] workDescription or resultHash required`);
    }
  }
}

export function validateAttestBatch(items: BatchAttestInput[]): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (!item.dealId) throw new Error(`attest[${i}] dealId required`);
    if (!item.workDescription && !item.resultHash) {
      throw new Error(`attest[${i}] workDescription or resultHash required`);
    }
  }
}

export function validateClaimBatch(items: BatchClaimInput[]): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (!item.dealId) throw new Error(`claim[${i}] dealId required`);
    if (!item.fundTx) throw new Error(`claim[${i}] fundTx required`);
    if (!item.amount) throw new Error(`claim[${i}] amount required`);
    if (!item.agentB) throw new Error(`claim[${i}] agentB required`);
  }
}
