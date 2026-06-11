#!/usr/bin/env tsx
/**
 * One-shot live payment via SDK — do not duplicate as pay-custom.ts.
 * Prefer MCP: simulate_trusted_settlement → execute_trusted_settlement.
 *
 * Usage:
 *   npm run pay:once -- --payee 0x... --amount 5 --work "task-id"
 *   npm run pay:once -- --payee 0x... --amount 5 --simulate
 */
import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Wallet } from "ethers";
import {
  executeTrustedSettlement,
  simulateTrustedSettlement,
  getSettlementStatus,
} from "../src/trustedAgentSettlement.js";

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
  return JSON.parse(readFileSync(path, "utf-8")) as {
    deployer: string;
    mockToken: string;
  };
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

async function main() {
  const payee = arg("--payee");
  const amountHuman = arg("--amount");
  const work = arg("--work") ?? `pay-once-${Date.now()}`;
  const simulateOnly = hasFlag("--simulate");
  const mock = hasFlag("--mock");

  if (!payee || !amountHuman) {
    console.error("Usage: npm run pay:once -- --payee 0x... --amount 5 [--work task-id] [--simulate] [--mock]");
    process.exit(1);
  }

  const atlantic = loadAtlantic();
  const agentA = payerAddress(atlantic.deployer);
  const amount = toWei(amountHuman, 18);

  const input = {
    agentA,
    agentB: payee,
    token: atlantic.mockToken,
    amount,
    workDescription: work,
    ttlSeconds: 3600,
    requiresHybridRelease: true,
  };

  const config = {
    mock,
    mode: "cooperative" as const,
    deploymentNetwork: "atlantic" as const,
    rpcUrl: process.env.PHAROS_RPC_URL,
    payerSigner: process.env.PRIVATE_KEY,
    payeeSigner: process.env.AGENT_B_PRIVATE_KEY,
    autoOnboardRecipients: true,
  };

  console.log("Payer:", agentA);
  console.log("Payee:", payee);
  console.log("Amount:", amountHuman, "TEST (", amount, "wei )");
  console.log("Work:", work);

  console.log("\n→ simulate...");
  const sim = await simulateTrustedSettlement(input, config);
  for (const c of sim.stages.preflight.checks) {
    console.log(`  ${c.passed ? "✓" : "✗"} ${c.name}${c.reason ? `: ${c.reason}` : ""}`);
  }
  console.log("nextAction:", sim.nextAction);
  if (!sim.success) {
    console.error("✗ preflight failed");
    process.exit(1);
  }
  if (simulateOnly) return;

  console.log("\n→ execute cooperative settlement...");
  const result = await executeTrustedSettlement(input, config);
  console.log("success:", result.success, "nextAction:", result.nextAction, "dealId:", result.dealId);
  if (result.explorerLink) console.log("explorer:", result.explorerLink);

  if (result.dealId) {
    try {
      const status = await getSettlementStatus(result.dealId, config);
      console.log("status:", status.state, "nextAction:", status.nextAction, "canClaim:", status.canClaim);
    } catch (e) {
      console.warn("status poll failed (settlement may still be complete):", (e as Error).message);
      console.warn("  check: MCP get_settlement_status or npm run pay:once with dealId on explorer");
    }
  }

  if (!result.success) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
