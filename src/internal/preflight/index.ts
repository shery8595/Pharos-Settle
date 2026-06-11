import { createPublicClient, keccak256, toBytes, type Address } from "viem";
import { transportFromConfig } from "../../shared/clients.js";
import { ATLANTIC } from "../../shared/chain.js";
import type { SettlementConfig, TrustedSettlementInput, CheckResult } from "../../shared/schemas.js";
import { check, allPassed } from "../../shared/errors.js";
import { agentRegistryAbi, erc20Abi, tokenAllowlistAbi } from "../../shared/abis.js";
import { loadDeployments, resolveDeploymentNetwork } from "../../shared/chain.js";
import { computePreflightHash, verifyPreflightHash } from "./hash.js";

export { computePreflightHash, verifyPreflightHash, canonicalJsonStringify } from "./hash.js";
import { mockIsRegistered } from "../onboard/mockRegistry.js";

export type PreflightResult = {
  ready: boolean;
  checks: CheckResult[];
  preflightHash: string;
};

export async function preflight(
  input: TrustedSettlementInput,
  config: SettlementConfig = {}
): Promise<PreflightResult> {
  if (config.mock) {
    const checks = [
      check("agent_a_format", /^0x[a-fA-F0-9]{40}$/.test(input.agentA)),
      check("agent_b_format", /^0x[a-fA-F0-9]{40}$/.test(input.agentB)),
      check("amount_positive", BigInt(input.amount) > 0n),
      check("agent_a_registered", mockIsRegistered(input.agentA), "agent A not registered"),
      check("agent_b_registered", mockIsRegistered(input.agentB), "agent B not registered"),
    ];
    const preflightHash = computePreflightHash(input, checks);
    return { ready: allPassed(checks), checks, preflightHash };
  }

  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const routerAddress = (config.routerAddress ?? deployments.settlementRouter) as Address;
  const client = createPublicClient({ transport: transportFromConfig(config, rpcUrl) });

  const checks: CheckResult[] = [];
  checks.push(check("agent_a_format", /^0x[a-fA-F0-9]{40}$/.test(input.agentA), "invalid agentA"));
  checks.push(check("agent_b_format", /^0x[a-fA-F0-9]{40}$/.test(input.agentB), "invalid agentB"));
  checks.push(check("amount_positive", BigInt(input.amount) > 0n, "amount must be > 0"));

  try {
    const [regA, regB, allowed, balance, allowance] = await Promise.all([
      client.readContract({
        address: deployments.agentRegistry as Address,
        abi: agentRegistryAbi,
        functionName: "isRegistered",
        args: [input.agentA as Address],
      }),
      client.readContract({
        address: deployments.agentRegistry as Address,
        abi: agentRegistryAbi,
        functionName: "isRegistered",
        args: [input.agentB as Address],
      }),
      client.readContract({
        address: deployments.tokenAllowlist as Address,
        abi: tokenAllowlistAbi,
        functionName: "isAllowed",
        args: [input.token as Address],
      }),
      client.readContract({
        address: input.token as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [input.agentA as Address],
      }),
      client.readContract({
        address: input.token as Address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [input.agentA as Address, deployments.dealEscrow as Address],
      }),
    ]);

    checks.push(check("agent_a_registered", regA, "agent A not registered"));
    checks.push(check("agent_b_registered", regB, "agent B not registered"));
    checks.push(check("token_allowed", allowed, "token not on allowlist"));
    checks.push(
      check("sufficient_balance", balance >= BigInt(input.amount), `need ${input.amount} tokens`)
    );
    checks.push(
      check(
        "sufficient_allowance",
        allowance >= BigInt(input.amount),
        "approve DealEscrow for tokens"
      )
    );
    checks.push(check("router_configured", routerAddress.length === 42, "router missing"));
  } catch (e) {
    checks.push(check("rpc_reads", false, (e as Error).message));
  }

  const preflightHash = computePreflightHash(input, checks);
  return { ready: allPassed(checks), checks, preflightHash };
}

export function workHash(description: string): `0x${string}` {
  return keccak256(toBytes(description));
}
