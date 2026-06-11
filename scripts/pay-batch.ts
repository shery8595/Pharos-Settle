#!/usr/bin/env tsx
/**
 * DEMO ONLY — batch fund + claim in one process (both PRIVATE_KEY and AGENT_B_PRIVATE_KEY).
 * Production: npm run batch:fund → share manifest → npm run batch:claim (per payee MCP).
 *
 * Usage:
 *   npm run pay:batch -- --payees 0xA,0xB,0xC --amount 1 --work-prefix "label-batch"
 *   npm run pay:batch -- --payee 0xA --count 5 --amount 2 --mode saliFast
 *   npm run pay:batch -- --jobs-file ./my-jobs.json --simulate
 */
import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { executeBatchSettlement } from "../src/trustedAgentSettlement.js";
import {
  buildJobs,
  demoBatchConfig,
  hasFlag,
  loadAtlantic,
  parseBatchMode,
  payerAddress,
  summarizePayees,
} from "./lib/batch-cli.js";

async function main() {
  console.log(
    "DEMO: fund+claim in one process (both keys). Production: npm run batch:fund → manifest → npm run batch:claim\n"
  );

  const simulateOnly = hasFlag("--simulate");
  const mock = hasFlag("--mock");
  const batchMode = parseBatchMode();

  const atlantic = loadAtlantic();
  const agentA = payerAddress(atlantic.deployer);
  const jobs = buildJobs(agentA, atlantic.mockToken, batchMode);
  const config = demoBatchConfig(batchMode, mock);

  console.log(`Batch: ${jobs.length} jobs, mode=${batchMode}, payer=${agentA}`);
  console.log("Payees:", summarizePayees(jobs));

  if (simulateOnly) {
    console.log("\n→ simulate (mock preflight via first job shape)...");
    console.log("Jobs preview:", jobs.slice(0, 3).map((j) => ({ agentB: j.agentB, amount: j.amount })));
    if (jobs.length > 3) console.log(`  ... and ${jobs.length - 3} more`);
    console.log("Run without --simulate to execute via executeBatchSettlement.");
    return;
  }

  console.log("\n→ executeBatchSettlement (demo shortcut)...");
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
