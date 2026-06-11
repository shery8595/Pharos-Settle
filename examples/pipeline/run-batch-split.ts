/**
 * Split two-agent batch demo — simulates payer MCP and payee MCP handoff.
 *
 * BATCH_MODE=saliFast     fund_deals_batch -> complete_claims_batch
 * BATCH_MODE=hybridWork   fund -> deliver -> attest -> claim (all batch phases)
 */
import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Wallet } from "ethers";
import {
  fundDealsBatch,
  submitDeliveriesBatch,
  attestReleasesBatch,
  claimDealsBatch,
} from "../../src/trustedAgentSettlement.js";
import type { BatchMode } from "../../src/shared/schemas.js";

const N = Number(process.env.BATCH_SIZE ?? 5);
const BATCH_MODE = (process.env.BATCH_MODE ?? "saliFast") as BatchMode;

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

  const baseConfig = mock
    ? { mock: true as const, batchMode: BATCH_MODE }
    : {
        mock: false as const,
        batchMode: BATCH_MODE,
        deploymentNetwork: "atlantic",
        rpcUrl: process.env.PHAROS_RPC_URL,
        payerSigner: process.env.PRIVATE_KEY,
        payeeSigner: process.env.AGENT_B_PRIVATE_KEY,
        rpcBurstWrites: true,
        autoOnboardRecipients: true,
      };

  console.log(`\n[batch-split] N=${N} mode=${BATCH_MODE} mock=${mock}`);

  const jobs = Array.from({ length: N }, (_, i) => ({
    agentA,
    agentB,
    token: d?.mockToken ?? "0x3333333333333333333333333333333333333333",
    amount: "1000000000000000000",
    workDescription: `batch-split task #${i + 1}`,
    ttlSeconds: 3600,
    requiresHybridRelease: BATCH_MODE === "hybridWork",
  }));

  console.log("\n--- Step 1: Payer MCP fund_deals_batch ---");
  const funded = await fundDealsBatch(jobs, baseConfig);
  console.log({
    succeeded: funded.succeeded,
    fundTxPerSec: funded.fundTxPerSec.toFixed(2),
    maxParallelFundInBlock: funded.maxParallelFundInBlock,
    manifestItems: funded.manifest.length,
  });
  console.log("Manifest (handoff):", JSON.stringify(funded.manifest, null, 2));

  if (BATCH_MODE === "hybridWork") {
    console.log("\n--- Step 2: Payee MCP submit_deliveries_batch ---");
    const deliveries = funded.manifest.map((m) => ({
      index: m.index,
      dealId: m.dealId,
      workDescription: m.workDescription,
    }));
    const delivered = await submitDeliveriesBatch(deliveries, baseConfig);
    console.log({
      succeeded: delivered.succeeded,
      deliveryTxPerSec: delivered.deliveryTxPerSec.toFixed(2),
    });

    console.log("\n--- Step 3: Payer MCP attest_releases_batch ---");
    const attestations = funded.manifest.map((m) => ({
      index: m.index,
      dealId: m.dealId,
      workDescription: m.workDescription,
    }));
    const attested = await attestReleasesBatch(attestations, baseConfig);
    console.log({
      succeeded: attested.succeeded,
      attestTxPerSec: attested.attestTxPerSec.toFixed(2),
    });
  }

  console.log("\n--- Step final: Payee MCP complete_claims_batch ---");
  const claims = funded.manifest.map((m) => ({
    index: m.index,
    dealId: m.dealId,
    fundTx: m.fundTx,
    amount: m.amount,
    agentB: m.agentB,
  }));
  const claimed = await claimDealsBatch(claims, baseConfig);
  console.log({
    succeeded: claimed.succeeded,
    claimTxPerSec: claimed.claimTxPerSec.toFixed(2),
    endToEndNote: funded.saliNote,
    claimNote: claimed.saliNote,
  });

  if (!claimed.success) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
