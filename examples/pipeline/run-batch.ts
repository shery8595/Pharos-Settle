/**
 * Batch settlement demo — parallel agent payments on Pharos Atlantic (SALI throughput proof).
 *
 * Uses explicit nonce assignment so N fund + N claim txs submit concurrently without
 * nonce collisions from the same payer/payee wallets.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Wallet } from "ethers";
import { executeBatchSettlement } from "../../src/trustedAgentSettlement.js";
import { explorerTxUrl } from "../../src/shared/chain.js";

const N = Number(process.env.BATCH_SIZE ?? 5);

function loadDeployments() {
  const path = join(process.cwd(), "deployments", "atlantic.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

async function main() {
  const d = loadDeployments();
  const mock = !d || process.argv.includes("--simulate");
  const agentA = d?.deployer ?? "0x1111111111111111111111111111111111111111";
  const agentB =
    process.env.DEMO_AGENT_B ??
    (process.env.AGENT_B_PRIVATE_KEY ? new Wallet(process.env.AGENT_B_PRIVATE_KEY).address : undefined) ??
    "0x2222222222222222222222222222222222222222";

  const batchMode = (process.env.BATCH_MODE ?? "saliFast") as "saliFast" | "hybridWork";

  const baseConfig = mock
    ? { mock: true as const, batchMode }
    : {
        mock: false as const,
        batchMode,
        deploymentNetwork: "atlantic",
        rpcUrl: process.env.PHAROS_RPC_URL,
        payerSigner: process.env.PRIVATE_KEY,
        payeeSigner: process.env.AGENT_B_PRIVATE_KEY,
        rpcBurstWrites: true,
        autoOnboardRecipients: true,
      };

  console.log(`\n[batch / SALI demo] N=${N} mode=${batchMode} mock=${mock}`);
  if (!mock) {
    console.log(
      `Ensure deployer allowance ≥ ${N} TEST (re-run seed:pharos if needed). BATCH_SIZE=${N}`
    );
  }

  const jobs = Array.from({ length: N }, (_, i) => ({
    agentA,
    agentB,
    token: d?.mockToken ?? "0x3333333333333333333333333333333333333333",
    amount: "1000000000000000000",
    workDescription: `batch labeling task #${i + 1}`,
    ttlSeconds: 3600,
    requiresHybridRelease: batchMode === "hybridWork",
  }));

  const batch = await executeBatchSettlement(jobs, baseConfig);

  console.log("\n--- throughput ---");
  console.log({
    deals: batch.deals,
    succeeded: batch.succeeded,
    failed: batch.failed,
    totalMs: batch.totalMs,
    fundSubmitMs: batch.fundSubmitMs,
    fundConfirmMs: batch.fundConfirmMs,
    claimPhaseMs: batch.claimPhaseMs,
    fundTxPerSec: batch.fundTxPerSec.toFixed(2),
    claimTxPerSec: batch.claimTxPerSec.toFixed(2),
    endToEndDealsPerSec: batch.endToEndDealsPerSec.toFixed(2),
    avgFinalityMs: batch.avgFinalityMs,
    totalFeesWei: batch.totalFeesWei,
    maxParallelInBlock: batch.maxParallelInBlock,
  });
  console.log(`\nSALI: ${batch.saliNote}`);

  if (!mock && batch.results[0]?.claimTx) {
    console.log(`\nSample claim: ${explorerTxUrl(batch.results[0].claimTx)}`);
  }

  if (batch.failed > 0) {
    console.log("\nFailures:");
    for (const r of batch.results.filter((x) => !x.success)) {
      console.log(`  #${r.index}: ${r.error ?? "unknown"}`);
    }
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
