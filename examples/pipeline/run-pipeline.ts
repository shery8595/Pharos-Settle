import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { taskSource } from "./task-source.js";
import { receiptLogger } from "./receipt-logger.js";
import { executeTrustedSettlement } from "../../src/trustedAgentSettlement.js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Wallet } from "ethers";

const agentB =
  process.env.DEMO_AGENT_B ??
  (process.env.AGENT_B_PRIVATE_KEY ? new Wallet(process.env.AGENT_B_PRIVATE_KEY).address : undefined) ??
  "0x2222222222222222222222222222222222222222";

async function main() {
  const d = existsSync(join(process.cwd(), "deployments", "atlantic.json"))
    ? JSON.parse(readFileSync(join(process.cwd(), "deployments", "atlantic.json"), "utf-8"))
    : null;
  const mock = !d;

  const upstream = taskSource(
    agentB,
    d?.mockToken ?? "0x3333333333333333333333333333333333333333"
  );
  console.log("[skill: task-source]   →", upstream);

  const receipt = await executeTrustedSettlement(
    {
      agentA: d?.deployer ?? "0x1111111111111111111111111111111111111111",
      agentB: upstream.agentB,
      token: upstream.token,
      amount: upstream.amount,
      workDescription: upstream.task,
    },
    { mock }
  );
  console.log("[trusted-agent-settlement] →", {
    success: receipt.success,
    dealId: receipt.dealId,
    txHash: receipt.stages.settle?.claimTx,
    explorerLink: receipt.explorerLink,
  });

  const log = receiptLogger(upstream.task, receipt);
  console.log("[skill: receipt-logger]  →", log);
}

main().catch(console.error);
