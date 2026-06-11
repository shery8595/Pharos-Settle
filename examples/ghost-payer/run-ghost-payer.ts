/**
 * Ghost-payer demo: payee delivers, payer never attests, payee claims after auto-release window.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Wallet } from "ethers";
import {
  executeTrustedSettlement,
  getSettlementStatus,
  completeClaimForDeal,
} from "../../src/trustedAgentSettlement.js";

const DISPUTE_WINDOW = Number(process.env.DEMO_DISPUTE_WINDOW ?? 5);

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
  const mock = !d || process.argv.includes("--simulate");
  const agentA = d?.deployer ?? "0x1111111111111111111111111111111111111111";
  const agentB =
    process.env.DEMO_AGENT_B ??
    (process.env.AGENT_B_PRIVATE_KEY ? new Wallet(process.env.AGENT_B_PRIVATE_KEY).address : undefined) ??
    "0x2222222222222222222222222222222222222222";

  const input = {
    agentA,
    agentB,
    token: d?.mockToken ?? "0x3333333333333333333333333333333333333333",
    amount: "1000000000000000000",
    workDescription: "labeling batch — ghost payer test",
    ttlSeconds: 3600,
    disputeWindowSeconds: DISPUTE_WINDOW,
    requiresHybridRelease: true,
  };

  const config = mock
    ? { mock: true as const, skipAttest: true }
    : {
        mock: false as const,
        deploymentNetwork: "atlantic",
        rpcUrl: process.env.PHAROS_RPC_URL,
        skipAttest: true,
        payerSigner: process.env.PRIVATE_KEY,
        payeeSigner: process.env.AGENT_B_PRIVATE_KEY,
      };

  console.log("\n[ghost-payer demo]");
  console.log("→ fund + deliver (payer will NOT attest)");

  const partial = await executeTrustedSettlement(input, config);
  console.log("→ deal", partial.dealId, "nextAction:", partial.nextAction);

  if (mock) {
    console.log("→ mock mode: completing claim after simulated wait");
    const claimed = await completeClaimForDeal(
      partial.dealId ?? "1",
      { amount: input.amount, agentB: input.agentB },
      { mock: true }
    );
    console.log(claimed.success ? "✓ payee paid after ghost payer" : "✗ failed");
    return;
  }

  if (!partial.dealId) throw new Error("no dealId");

  let status = await getSettlementStatus(partial.dealId, config);
  console.log("→ waiting for auto-release at", status.autoReleaseAt);

  const waitMs = DISPUTE_WINDOW * 1000 + 2000;
  const start = Date.now();
  while (!status.canClaim && Date.now() - start < waitMs + 60_000) {
    await sleep(2000);
    status = await getSettlementStatus(partial.dealId, config);
    process.stdout.write(`  nextAction=${status.nextAction} canClaim=${status.canClaim}\r`);
  }
  console.log("");

  if (!status.canClaim) {
    console.log("✗ still not claimable — increase DEMO_DISPUTE_WINDOW or check chain time");
    process.exit(1);
  }

  const claimed = await completeClaimForDeal(
    partial.dealId,
    { amount: input.amount, agentB: input.agentB },
    config
  );
  console.log(claimed.success ? "✓ payee paid after ghost payer" : "✗ claim failed");
  if (claimed.explorerLink) console.log(claimed.explorerLink);
}

main().catch(console.error);
