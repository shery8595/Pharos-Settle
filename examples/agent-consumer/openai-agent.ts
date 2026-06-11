/**
 * Reusability proof: generic agent invokes trusted-agent-settlement from a NL-style task.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import {
  executeTrustedSettlement,
  simulateTrustedSettlement,
} from "../../src/trustedAgentSettlement.js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Wallet } from "ethers";

const agentBFromEnv =
  process.env.DEMO_AGENT_B ??
  (process.env.AGENT_B_PRIVATE_KEY ? new Wallet(process.env.AGENT_B_PRIVATE_KEY).address : undefined) ??
  "0x2222222222222222222222222222222222222222";

const NL_TASK = {
  agentB: agentBFromEnv,
  amount: "1000000000000000000",
  task: "labeling task for Pharos demo",
};

function deployments() {
  const p = join(process.cwd(), "deployments", "atlantic.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf-8"));
}

async function main() {
  const d = deployments();
  const mock = !d || process.argv.includes("--simulate");
  const agentA = d?.deployer ?? "0x1111111111111111111111111111111111111111";

  console.log("\n[generic agent — Pharos Settle Skill, no settlement code]");
  console.log(`User: "Pay agent B 1 TEST on Pharos for ${NL_TASK.task}"`);

  const input = {
    agentA,
    agentB: NL_TASK.agentB,
    token: d?.mockToken ?? "0x3333333333333333333333333333333333333333",
    amount: NL_TASK.amount,
    workDescription: NL_TASK.task,
    ttlSeconds: 3600,
    requiresHybridRelease: true,
  };

  const config = { mock, mode: "cooperative" as const };

  const sim = await simulateTrustedSettlement(input, config);
  console.log(sim.success ? `Agent: → simulate ✓ nextAction=${sim.nextAction}` : "Agent: → simulate ✗");
  if (sim.feeQuote) {
    console.log(`Agent: → fee ${sim.feeQuote.feeBps}bps payee gets ${sim.feeQuote.payeeAmount} wei`);
  }

  const result = await executeTrustedSettlement(input, config);
  const ms = result.stages.settle?.settlementReceipt?.finalityMs ?? 0;
  console.log(
    result.success
      ? `Agent: → execute ✓ settled in ${ms}ms nextAction=${result.nextAction}`
      : `Agent: → execute pending nextAction=${result.nextAction}`
  );
  if (result.explorerLink) console.log(`Agent: "Done — PharosScan ${result.explorerLink}"`);
}

main().catch(console.error);
