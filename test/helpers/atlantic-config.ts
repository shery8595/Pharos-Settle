import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ override: true });

export type AtlanticTestContext = {
  ready: boolean;
  skipReason?: string;
  deployments: Record<string, unknown>;
  agentA: string;
  agentB: string;
  token: string;
  rpcUrl: string;
};

export function getAtlanticTestContext(): AtlanticTestContext {
  const path = join(process.cwd(), "deployments", "atlantic.json");
  if (!existsSync(path)) {
    return {
      ready: false,
      skipReason: "deployments/atlantic.json missing — run deploy:pharos",
      deployments: {},
      agentA: "",
      agentB: "",
      token: "",
      rpcUrl: "",
    };
  }

  const deployments = JSON.parse(readFileSync(path, "utf-8")) as Record<string, string>;
  const pk = process.env.PRIVATE_KEY?.trim();
  const agentBKey = process.env.AGENT_B_PRIVATE_KEY?.trim();

  if (!pk || pk.length < 66) {
    return {
      ready: false,
      skipReason: "PRIVATE_KEY not set in .env",
      deployments,
      agentA: deployments.deployer ?? "",
      agentB: "",
      token: deployments.mockToken ?? "",
      rpcUrl: process.env.PHAROS_RPC_URL ?? "",
    };
  }

  if (!agentBKey || agentBKey.length < 66) {
    return {
      ready: false,
      skipReason: "AGENT_B_PRIVATE_KEY not set in .env",
      deployments,
      agentA: deployments.deployer ?? "",
      agentB: "",
      token: deployments.mockToken ?? "",
      rpcUrl: process.env.PHAROS_RPC_URL ?? "",
    };
  }

  const { Wallet } = require("ethers") as typeof import("ethers");
  const agentA = new Wallet(pk).address;
  const agentB = new Wallet(agentBKey).address;

  return {
    ready: true,
    deployments,
    agentA,
    agentB,
    token: deployments.mockToken ?? "",
    rpcUrl: process.env.PHAROS_RPC_URL ?? "https://atlantic.dplabs-internal.com",
  };
}

export function atlanticSdkConfig(ctx: AtlanticTestContext) {
  return {
    mock: false,
    deploymentNetwork: "atlantic",
    rpcUrl: ctx.rpcUrl,
    payerSigner: process.env.PRIVATE_KEY,
    payeeSigner: process.env.AGENT_B_PRIVATE_KEY,
  };
}
