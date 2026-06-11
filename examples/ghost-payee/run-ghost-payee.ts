/**
 * Ghost-payee demo: payer funds, payee never delivers, payer reclaims after TTL.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Wallet } from "ethers";
import {
  fundDealSettlement,
  getSettlementStatus,
  reclaimTrustedSettlement,
  reclaimDeal,
} from "../../src/trustedAgentSettlement.js";
import { explorerTxUrl } from "../../src/shared/chain.js";

const TTL_SECONDS = Number(process.env.DEMO_TTL_SECONDS ?? 120);

function loadDeployments() {
  const path = join(process.cwd(), "deployments", "atlantic.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const d = loadDeployments();
  const simulate = process.argv.includes("--simulate");
  const mock = simulate || !d;
  const agentA = simulate
    ? "0x1111111111111111111111111111111111111111"
    : (d?.deployer ?? "0x1111111111111111111111111111111111111111");
  const agentB = simulate
    ? "0x2222222222222222222222222222222222222222"
    : (process.env.DEMO_AGENT_B ??
        (process.env.AGENT_B_PRIVATE_KEY ? new Wallet(process.env.AGENT_B_PRIVATE_KEY).address : undefined) ??
        "0x2222222222222222222222222222222222222222");

  const input = {
    agentA,
    agentB,
    token: d?.mockToken ?? "0x3333333333333333333333333333333333333333",
    amount: "1000000000000000000",
    workDescription: "labeling batch — ghost payee test",
    ttlSeconds: mock ? 5 : TTL_SECONDS,
    requiresHybridRelease: true,
  };

  const config = mock
    ? { mock: true as const }
    : {
        mock: false as const,
        deploymentNetwork: "atlantic",
        rpcUrl: process.env.PHAROS_RPC_URL,
        payerSigner: process.env.PRIVATE_KEY,
        payeeSigner: process.env.AGENT_B_PRIVATE_KEY,
        autoOnboardRecipients: true,
      };

  console.log("\n[ghost-payee demo]");
  console.log("→ fund deal (payee will NOT deliver)");

  const funded = await fundDealSettlement(input, config);
  if (!funded.success || !funded.dealId) {
    console.log("✗ fund failed:", funded.reason ?? "unknown");
    process.exit(1);
  }
  console.log("→ deal", funded.dealId, "nextAction:", funded.nextAction);

  if (mock) {
    console.log("→ mock mode: reclaiming after simulated TTL expiry");
    const refundTx = await reclaimDeal(funded.dealId, { mock: true });
    console.log(refundTx ? "✓ funds returned to payer (Refunded) [mock]" : "✗ failed");
    return;
  }

  const waitMs = TTL_SECONDS * 1000 + 5000;
  console.log(`→ waiting ${TTL_SECONDS}s for TTL (DEMO_TTL_SECONDS) — payee never delivers`);

  let status = await getSettlementStatus(funded.dealId, config);
  const start = Date.now();
  while (status.nextAction !== "reclaim" && Date.now() - start < waitMs + 60_000) {
    await sleep(3000);
    status = await getSettlementStatus(funded.dealId, config);
    process.stdout.write(`  nextAction=${status.nextAction} reclaimable=${status.reclaimable}\r`);
  }
  console.log("");

  if (!status.reclaimable) {
    console.log("✗ not yet reclaimable — increase DEMO_TTL_SECONDS or check chain time");
    process.exit(1);
  }

  const reclaimed = await reclaimTrustedSettlement(funded.dealId, config);
  console.log(reclaimed.success ? "✓ funds returned to payer (ghost payee)" : `✗ reclaim failed: ${reclaimed.reason}`);
  if (reclaimed.refundTx) {
    console.log(explorerTxUrl(reclaimed.refundTx, d?.chainId ?? 688689));
  }
}

main().catch(console.error);
