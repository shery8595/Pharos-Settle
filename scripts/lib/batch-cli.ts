/**
 * Shared batch CLI helpers — fund-only, claim-only, and demo pay:batch.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { Wallet } from "ethers";
import type { BatchFundOutput, BatchMode, BatchDealManifest, SettlementConfig, TrustedSettlementInput } from "../../src/shared/schemas.js";

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

export function loadAtlantic() {
  const path = join(process.cwd(), "deployments", "atlantic.json");
  if (!existsSync(path)) throw new Error("deployments/atlantic.json missing — run from Pharos-Settle root");
  return JSON.parse(readFileSync(path, "utf-8")) as { deployer: string; mockToken: string };
}

export function payerAddress(deployer: string): string {
  const pk = process.env.PRIVATE_KEY?.trim();
  if (pk && pk.length >= 66) return new Wallet(pk).address;
  return deployer;
}

export function payeeAddressFromEnv(): string {
  const pk = process.env.AGENT_B_PRIVATE_KEY?.trim();
  if (!pk || pk.length < 66) {
    throw new Error("AGENT_B_PRIVATE_KEY required (66+ char hex payee key)");
  }
  return new Wallet(pk).address;
}

export function toWei(amountHuman: string, decimals = 18): string {
  const [whole, frac = ""] = amountHuman.split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0")).toString();
}

export function parseBatchMode(): BatchMode {
  const raw = arg("--mode") ?? "saliFast";
  if (raw !== "saliFast" && raw !== "hybridWork") {
    throw new Error("--mode must be saliFast or hybridWork");
  }
  return raw;
}

export function buildJobs(
  agentA: string,
  token: string,
  batchMode: BatchMode
): TrustedSettlementInput[] {
  const jobsFile = arg("--jobs-file");
  const amountHuman = arg("--amount") ?? "1";
  const workPrefix = arg("--work-prefix") ?? "batch-pay";
  const amountWei = toWei(amountHuman, 18);
  const hybrid = batchMode === "hybridWork";

  if (jobsFile) {
    const raw = JSON.parse(readFileSync(jobsFile, "utf-8")) as Array<{
      agentB: string;
      amount?: string;
      workDescription?: string;
    }>;
    return raw.map((j, i) => ({
      agentA,
      agentB: j.agentB,
      token,
      amount: j.amount ?? amountWei,
      workDescription: j.workDescription ?? `${workPrefix}-${i + 1}`,
      ttlSeconds: 3600,
      requiresHybridRelease: hybrid,
    }));
  }

  const payeesCsv = arg("--payees");
  const singlePayee = arg("--payee");
  const count = Number(arg("--count") ?? "0");

  let payees: string[];
  if (payeesCsv) {
    payees = payeesCsv.split(",").map((s) => s.trim()).filter(Boolean);
  } else if (singlePayee && count > 0) {
    payees = Array.from({ length: count }, () => singlePayee);
  } else if (singlePayee) {
    payees = [singlePayee];
  } else {
    throw new Error("Provide --payees 0xA,0xB or --payee 0xA --count N or --jobs-file path");
  }

  return payees.map((agentB, i) => ({
    agentA,
    agentB,
    token,
    amount: amountWei,
    workDescription: `${workPrefix}-${i + 1}`,
    ttlSeconds: 3600,
    requiresHybridRelease: hybrid,
  }));
}

export function payerConfig(batchMode: BatchMode, mock: boolean): SettlementConfig {
  return {
    mock,
    mode: "cooperative",
    batchMode,
    deploymentNetwork: "atlantic",
    rpcUrl: process.env.PHAROS_RPC_URL,
    payerSigner: process.env.PRIVATE_KEY,
    rpcBurstWrites: true,
    autoOnboardRecipients: true,
  };
}

export function payeeConfig(mock: boolean): SettlementConfig {
  return {
    mock,
    mode: "cooperative",
    deploymentNetwork: "atlantic",
    rpcUrl: process.env.PHAROS_RPC_URL,
    payeeSigner: process.env.AGENT_B_PRIVATE_KEY,
    rpcBurstWrites: true,
  };
}

export function demoBatchConfig(batchMode: BatchMode, mock: boolean): SettlementConfig {
  return {
    ...payerConfig(batchMode, mock),
    payeeSigner: process.env.AGENT_B_PRIVATE_KEY,
  };
}

export type ManifestFilePayload = {
  batchMode: BatchMode;
  fundedAt: string;
  manifest: BatchDealManifest[];
  summary: {
    deals: number;
    succeeded: number;
    failed: number;
    saliNote?: string;
  };
};

export function defaultManifestPath(): string {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  return join(process.cwd(), ".pharos-settle", `batch-manifest-${iso}.json`);
}

export function writeManifestFile(path: string, funded: BatchFundOutput): string {
  const payload: ManifestFilePayload = {
    batchMode: funded.batchMode,
    fundedAt: new Date().toISOString(),
    manifest: funded.manifest,
    summary: {
      deals: funded.deals,
      succeeded: funded.succeeded,
      failed: funded.failed,
      saliNote: funded.saliNote,
    },
  };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  return path;
}

export function readManifestFile(path: string): BatchDealManifest[] {
  if (!existsSync(path)) throw new Error(`Manifest not found: ${path}`);
  const parsed = JSON.parse(readFileSync(path, "utf-8")) as
    | BatchDealManifest[]
    | { manifest: BatchDealManifest[] };
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.manifest)) return parsed.manifest;
  throw new Error("Manifest file must be an array or { manifest: [...] }");
}

export function summarizePayees(jobs: TrustedSettlementInput[]): string {
  const unique = [...new Set(jobs.map((j) => j.agentB))];
  return unique.length === 1 ? unique[0]! : `${unique.length} unique addresses`;
}
