#!/usr/bin/env tsx
/**
 * Batch payments via SDK — SALI FastPay or hybridWork. Do not duplicate as pay-batch-custom.ts.
 * Prefer MCP: execute_batch_settlement or split fund_deals_batch → complete_claims_batch.
 *
 * Usage:
 *   npm run pay:batch -- --payees 0xA,0xB,0xC --amount 1 --work-prefix "label-batch"
 *   npm run pay:batch -- --payee 0xA --count 5 --amount 2 --mode saliFast
 *   npm run pay:batch -- --jobs-file ./my-jobs.json --simulate
 *
 * jobs-file: JSON array of { agentB, amount?, workDescription? } — agentA/token filled from atlantic.json
 */
import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Wallet } from "ethers";
import { executeBatchSettlement } from "../src/trustedAgentSettlement.js";
import type { BatchMode, TrustedSettlementInput } from "../src/shared/schemas.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function loadAtlantic() {
  const path = join(process.cwd(), "deployments", "atlantic.json");
  if (!existsSync(path)) throw new Error("deployments/atlantic.json missing — run from Pharos-Settle root");
  return JSON.parse(readFileSync(path, "utf-8")) as { deployer: string; mockToken: string };
}

function payerAddress(deployer: string): string {
  const pk = process.env.PRIVATE_KEY?.trim();
  if (pk && pk.length >= 66) return new Wallet(pk).address;
  return deployer;
}

function toWei(amountHuman: string, decimals = 18): string {
  const [whole, frac = ""] = amountHuman.split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0")).toString();
}

function parseBatchMode(): BatchMode {
  const raw = arg("--mode") ?? "saliFast";
  if (raw !== "saliFast" && raw !== "hybridWork") {
    throw new Error("--mode must be saliFast or hybridWork");
  }
  return raw;
}

function buildJobs(
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

async function main() {
  const simulateOnly = hasFlag("--simulate");
  const mock = hasFlag("--mock");
  const batchMode = parseBatchMode();

  const atlantic = loadAtlantic();
  const agentA = payerAddress(atlantic.deployer);
  const jobs = buildJobs(agentA, atlantic.mockToken, batchMode);

  const config = {
    mock,
    mode: "cooperative" as const,
    batchMode,
    deploymentNetwork: "atlantic" as const,
    rpcUrl: process.env.PHAROS_RPC_URL,
    payerSigner: process.env.PRIVATE_KEY,
    payeeSigner: process.env.AGENT_B_PRIVATE_KEY,
    rpcBurstWrites: true,
    autoOnboardRecipients: true,
  };

  console.log(`Batch: ${jobs.length} jobs, mode=${batchMode}, payer=${agentA}`);
  console.log(
    "Payees:",
    [...new Set(jobs.map((j) => j.agentB))].length === 1
      ? jobs[0].agentB
      : `${[...new Set(jobs.map((j) => j.agentB))].length} unique addresses`
  );

  if (simulateOnly) {
    console.log("\n→ simulate (mock preflight via first job shape)...");
    console.log("Jobs preview:", jobs.slice(0, 3).map((j) => ({ agentB: j.agentB, amount: j.amount })));
    if (jobs.length > 3) console.log(`  ... and ${jobs.length - 3} more`);
    console.log("Run without --simulate to execute via executeBatchSettlement.");
    return;
  }

  console.log("\n→ executeBatchSettlement...");
  const batch = await executeBatchSettlement(jobs, config);

  console.log({
    deals: batch.deals,
    succeeded: batch.succeeded,
    failed: batch.failed,
    batchMode: batch.batchMode,
    endToEndDealsPerSec: batch.endToEndDealsPerSec.toFixed(2),
    maxParallelInBlock: batch.maxParallelInBlock,
    saliNote: batch.saliNote,
  });

  if (batch.failed > 0) {
    for (const r of batch.results.filter((x) => !x.success)) {
      console.error("failed deal", r.dealId, r.error);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
