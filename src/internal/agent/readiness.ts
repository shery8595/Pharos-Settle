import { createPublicClient, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { ATLANTIC, loadDeployments, resolveDeploymentNetwork } from "../../shared/chain.js";
import { transportFromConfig } from "../../shared/clients.js";
import type { AgentReadiness, AgentRole, SettlementConfig } from "../../shared/schemas.js";
import { agentRegistryAbi } from "../../shared/abis.js";

const PAYER_TOOLS = [
  "get_agent_readiness",
  "simulate_trusted_settlement",
  "register_recipients",
  "fund_deal",
  "fund_deals_batch",
  "attest_release",
  "attest_releases_batch",
  "reclaim_trusted_settlement",
  "reject_delivery",
  "get_settlement_status",
];

const PAYEE_TOOLS = [
  "get_agent_readiness",
  "simulate_trusted_settlement",
  "submit_delivery",
  "submit_deliveries_batch",
  "complete_claim_for_deal",
  "complete_claims_batch",
  "get_settlement_status",
];

const ARBITER_TOOLS = ["get_agent_readiness", "resolve_dispute", "get_settlement_status"];

const DEMO_TOOLS = [
  ...PAYER_TOOLS,
  "submit_delivery",
  "submit_deliveries_batch",
  "complete_claim_for_deal",
  "complete_claims_batch",
  "execute_trusted_settlement",
  "execute_batch_settlement",
  "resolve_dispute",
];

const MOCK_TOOLS = DEMO_TOOLS;

export function detectAgentRole(): AgentRole {
  const hasPayer = Boolean(process.env.PRIVATE_KEY?.trim() && process.env.PRIVATE_KEY.trim().length >= 66);
  const hasPayee = Boolean(
    process.env.AGENT_B_PRIVATE_KEY?.trim() && process.env.AGENT_B_PRIVATE_KEY.trim().length >= 66
  );
  const hasArbiter = Boolean(
    process.env.ARBITER_PRIVATE_KEY?.trim() && process.env.ARBITER_PRIVATE_KEY.trim().length >= 66
  );
  if (hasArbiter && !hasPayer && !hasPayee) return "arbiter";
  if (hasPayer && hasPayee) return "demo";
  if (hasPayer) return "payer";
  if (hasPayee) return "payee";
  return "mock";
}

export function allowedToolsForRole(role: AgentRole): string[] {
  switch (role) {
    case "payer":
      return PAYER_TOOLS;
    case "payee":
      return PAYEE_TOOLS;
    case "arbiter":
      return ARBITER_TOOLS;
    case "demo":
      return DEMO_TOOLS;
    default:
      return MOCK_TOOLS;
  }
}

async function hasContractCode(address: string, config: SettlementConfig): Promise<boolean> {
  const client = createPublicClient({
    transport: transportFromConfig(config, config.rpcUrl ?? ATLANTIC.rpcUrl),
  });
  const code = await client.getCode({ address: address as Address });
  return Boolean(code && code.length > 2);
}

export async function getAgentReadiness(config: SettlementConfig = {}): Promise<AgentReadiness> {
  const role = config.mock ? "mock" : detectAgentRole();
  const checks: AgentReadiness["checks"] = [];
  const network = resolveDeploymentNetwork(config);
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const cfg = { ...config, deploymentNetwork: network, rpcUrl };

  if (role === "mock") {
    return {
      role,
      ready: true,
      checks: [{ name: "mock_mode", passed: true, action: "no network required" }],
      allowedTools: allowedToolsForRole("mock"),
      nextStep: "mock mode — call simulate_trusted_settlement with mock:true",
    };
  }

  if (role === "arbiter") {
    return {
      role,
      ready: true,
      checks: [{ name: "arbiter_key", passed: true, action: null }],
      allowedTools: ARBITER_TOOLS,
      nextStep: "poll get_settlement_status then resolve_dispute when resolveEligible",
    };
  }

  try {
    const deployments = loadDeployments(network);
    const routerOk = await hasContractCode(deployments.settlementRouter, cfg);
    checks.push({
      name: "contracts_deployed",
      passed: routerOk,
      action: routerOk ? null : "run npm run deploy:pharos or use bundled deployments/atlantic.json",
    });

    const block = await createPublicClient({ transport: transportFromConfig(cfg, rpcUrl) }).getBlockNumber();
    checks.push({ name: "rpc_reachable", passed: block > 0n, action: null });
  } catch (e) {
    checks.push({
      name: "rpc_reachable",
      passed: false,
      action: `check PHAROS_RPC_URL: ${(e as Error).message}`,
    });
  }

  const deployments = loadDeployments(network);
  const client = createPublicClient({ transport: transportFromConfig(cfg, rpcUrl) });

  const payerAddr =
    role === "payee"
      ? undefined
      : privateKeyToAccount((process.env.PRIVATE_KEY ?? "0x" + "11".repeat(32)) as Hex).address;
  const payeeAddr =
    role === "payer"
      ? undefined
      : privateKeyToAccount((process.env.AGENT_B_PRIVATE_KEY ?? "0x" + "22".repeat(32)) as Hex).address;

  if (payerAddr) {
    const bal = await client.getBalance({ address: payerAddr });
    checks.push({
      name: "payer_phrs_balance",
      passed: bal > 0n,
      action: bal > 0n ? null : "top up payer wallet with PHRS on Atlantic",
    });
  }

  if (payeeAddr) {
    const bal = await client.getBalance({ address: payeeAddr });
    checks.push({
      name: "payee_phrs_balance",
      passed: bal > 0n,
      action: bal > 0n ? null : "top up payee wallet with PHRS for claim gas",
    });
  }

  if (payerAddr) {
    const reg = await client.readContract({
      address: deployments.agentRegistry as Address,
      abi: agentRegistryAbi,
      functionName: "isRegistered",
      args: [payerAddr],
    });
    checks.push({
      name: "payer_registered",
      passed: reg,
      action: reg ? null : "run npm run seed:pharos or register payer on AgentRegistry",
    });
  }

  if (payeeAddr) {
    const reg = await client.readContract({
      address: deployments.agentRegistry as Address,
      abi: agentRegistryAbi,
      functionName: "isRegistered",
      args: [payeeAddr],
    });
    checks.push({
      name: "payee_registered",
      passed: reg,
      action: reg ? null : "payer calls register_recipients or npm run seed:pharos",
    });
  }

  const ready = checks.every((c) => c.passed);
  const nextStep =
    role === "payer"
      ? ready
        ? "simulate_trusted_settlement then fund_deal when nextAction is fund"
        : "fix failed checks then retry get_agent_readiness"
      : role === "payee"
        ? ready
          ? "poll get_settlement_status then submit_delivery when nextAction is deliver"
          : "fix failed checks then retry get_agent_readiness"
        : ready
          ? "demo mode — execute_trusted_settlement or use split payer/payee tools"
          : "fix failed checks then retry get_agent_readiness";

  return {
    role,
    ready,
    checks,
    allowedTools: allowedToolsForRole(role),
    nextStep,
  };
}
