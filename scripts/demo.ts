import { config as loadEnv } from "dotenv";
loadEnv({ override: Boolean(cliNetwork()) });
import {
  executeTrustedSettlement,
  simulateTrustedSettlement,
} from "../src/trustedAgentSettlement.js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Wallet } from "ethers";

function cliNetwork(): string | null {
  const i = process.argv.indexOf("--network");
  return i >= 0 ? process.argv[i + 1] : null;
}

function loadDeployments() {
  const network = cliNetwork();
  if (!network) return null;
  const file = network === "pharos" ? "atlantic.json" : `${network}.json`;
  const path = join(process.cwd(), "deployments", file);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function settlementConfig(mock: boolean) {
  const network = cliNetwork();
  if (mock || !network) return { mock: true as const };
  const signers = {
    payerSigner: process.env.PRIVATE_KEY,
    payeeSigner: process.env.AGENT_B_PRIVATE_KEY,
  };
  if (network === "localhost") {
    return {
      mock: false as const,
      deploymentNetwork: "localhost",
      rpcUrl: "http://127.0.0.1:8545",
      ...signers,
    };
  }
  return {
    mock: false as const,
    deploymentNetwork: "atlantic",
    rpcUrl: process.env.PHAROS_RPC_URL,
    proveTier: process.argv.includes("--prove-tier") ? ("spv" as const) : ("receipt" as const),
    ...signers,
  };
}

function getAgentAddresses(d: { deployer?: string } | null) {
  const agentA = process.env.DEMO_AGENT_A ?? d?.deployer;
  const agentBKey = process.env.AGENT_B_PRIVATE_KEY;
  const agentB =
    process.env.DEMO_AGENT_B ?? (agentBKey ? new Wallet(agentBKey).address : undefined);
  if (!agentA || !agentB) {
    throw new Error("Set AGENT_B_PRIVATE_KEY (or DEMO_AGENT_B) and deploy first; agent A from deployer");
  }
  return { agentA, agentB };
}

async function runSimulate(mock: boolean) {
  const d = loadDeployments();
  const { agentA, agentB } = mock
    ? { agentA: "0x" + "11".repeat(20), agentB: "0x" + "22".repeat(20) }
    : getAgentAddresses(d);

  console.log("\n[trusted-agent-settlement]");
  console.log("→ simulating safe agent payment...");
  const result = await simulateTrustedSettlement(
    {
      agentA,
      agentB,
      token: d?.mockToken ?? "0x" + "33".repeat(20),
      amount: "1000000000000000000",
      workDescription: "labeling task batch #1",
    },
    settlementConfig(mock)
  );
  console.log("→ validating deal...");
  for (const c of result.stages.preflight.checks) {
    console.log(`  ${c.passed ? "✓" : "✗"} ${c.name}${c.reason ? `: ${c.reason}` : ""}`);
  }
  if (result.success) console.log("✓ simulation passed — ready to execute");
  else console.log("✗ simulation failed");
}

async function runExecute(mock: boolean) {
  const d = loadDeployments();
  const { agentA, agentB } = mock
    ? { agentA: "0x" + "11".repeat(20), agentB: "0x" + "22".repeat(20) }
    : getAgentAddresses(d);

  console.log("\n[trusted-agent-settlement]");
  console.log("→ validating deal...");
  const result = await executeTrustedSettlement(
    {
      agentA,
      agentB,
      token: d!.mockToken,
      amount: "1000000000000000000",
      workDescription: "labeling task batch #1",
      ttlSeconds: 3600,
    },
    settlementConfig(mock)
  );

  for (const c of result.stages.preflight.checks) {
    if (!c.passed) console.log(`  ✗ ${c.name}: ${c.reason}`);
  }
  console.log("→ settling payment...");
  if (result.stages.settle?.claimTx) {
    console.log("→ verifying settlement completed...");
    if (result.stages.prove.postSettlement?.verified) {
      console.log("✓ settlement verified on-chain");
    }
    const ms = result.stages.settle.settlementReceipt?.finalityMs ?? 0;
    console.log(`✓ Settlement confirmed in ${ms}ms`);
    if (result.explorerLink) console.log(`On-chain: SettlementRouter · ${result.explorerLink}`);
  } else if (!result.success) {
    console.log("✗ settlement failed");
  }
}

async function runReclaim(mock: boolean) {
  if (mock) {
    console.log("\n[trusted-agent-settlement]");
    console.log("→ deal funded, payee never delivered...");
    console.log("→ deadline passed, reclaiming...");
    console.log("✓ funds returned to payer (Refunded) [mock]");
    return;
  }
  console.log("Reclaim flow requires a funded deal past deadline — use hardhat test or manual dealId");
}

async function main() {
  const simulateOnly = process.argv.includes("--simulate");
  const reclaim = process.argv.includes("--reclaim");
  const mock = !cliNetwork() || !loadDeployments();

  if (reclaim) await runReclaim(mock);
  else if (simulateOnly) await runSimulate(mock);
  else {
    await runSimulate(mock);
    await runExecute(mock);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
