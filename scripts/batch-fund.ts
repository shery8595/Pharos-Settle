#!/usr/bin/env tsx
/**
 * Production batch fund — payer only. Locks escrow for N payees; writes manifest for handoff.
 *
 * Usage:
 *   npm run batch:fund -- --payees 0xA,0xB,0xC --amount 1 --work-prefix "payroll"
 *   npm run batch:fund -- --jobs-file ./jobs.json --mode saliFast --out ./manifest.json
 *
 * Payees claim later: npm run batch:claim -- --manifest ./manifest.json
 */
import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { fundDealsBatch } from "../src/trustedAgentSettlement.js";
import {
  arg,
  buildJobs,
  defaultManifestPath,
  hasFlag,
  loadAtlantic,
  parseBatchMode,
  payerAddress,
  payerConfig,
  summarizePayees,
  writeManifestFile,
} from "./lib/batch-cli.js";

async function main() {
  const simulateOnly = hasFlag("--simulate");
  const mock = hasFlag("--mock") || simulateOnly;
  const batchMode = parseBatchMode();

  const atlantic = loadAtlantic();
  const agentA = payerAddress(atlantic.deployer);
  const jobs = buildJobs(agentA, atlantic.mockToken, batchMode);
  const config = payerConfig(batchMode, mock);

  console.log(`batch:fund — ${jobs.length} jobs, mode=${batchMode}, payer=${agentA}`);
  console.log("Payees:", summarizePayees(jobs));

  if (simulateOnly) {
    console.log("\n→ simulate (mock fund only)...");
    const funded = await fundDealsBatch(jobs, config);
    console.log({
      succeeded: funded.succeeded,
      failed: funded.failed,
      manifestItems: funded.manifest.length,
      saliNote: funded.saliNote,
    });
    return;
  }

  console.log("\n→ fundDealsBatch (payer key only)...");
  const funded = await fundDealsBatch(jobs, config);

  const outPath = arg("--out") ?? defaultManifestPath();
  writeManifestFile(outPath, funded);

  console.log({
    succeeded: funded.succeeded,
    failed: funded.failed,
    batchMode: funded.batchMode,
    fundTxPerSec: funded.fundTxPerSec.toFixed(2),
    maxParallelFundInBlock: funded.maxParallelFundInBlock,
    manifestPath: outPath.replace(/\\/g, "/"),
    saliNote: funded.saliNote,
  });

  if (funded.failed > 0) {
    for (const r of funded.results.filter((x) => !x.success)) {
      console.error("failed fund", r.dealId, r.error);
    }
    process.exit(1);
  }

  console.log("\nHand off manifest to payee MCP(s): npm run batch:claim -- --manifest", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
