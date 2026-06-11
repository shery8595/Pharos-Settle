import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ATLANTIC = {
  chainId: 688689,
  rpcUrl: process.env.PHAROS_RPC_URL ?? "https://atlantic.dplabs-internal.com",
  explorerUrl: "https://atlantic.pharosscan.xyz",
  networkId: "eip155:688689",
  rateLimitNote: "500 req / 5 min on public RPC",
} as const;

export type AtlanticTokenRef = {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
};

export type DeploymentAddresses = {
  mockToken: string;
  agentRegistry: string;
  tokenAllowlist: string;
  dealEscrow: string;
  settlementRouter: string;
  network: string;
  chainId: number;
  deployer?: string;
  /** Skill-deployed TEST token + official Atlantic testnet ERC-20s allowed at seed. */
  allowedTokens?: AtlanticTokenRef[];
};

export function resolveDeploymentNetwork(config?: { deploymentNetwork?: string }): string {
  return config?.deploymentNetwork ?? process.env.DEPLOYMENT_NETWORK ?? "atlantic";
}

export function loadAllowedTokens(network = "atlantic"): AtlanticTokenRef[] {
  const d = loadDeployments(network);
  if (d.allowedTokens?.length) return d.allowedTokens;
  return JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../config/atlantic-tokens.json"), "utf-8")
  ) as AtlanticTokenRef[];
}

export function loadDeployments(network = "atlantic"): DeploymentAddresses {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
  const path = join(root, "deployments", `${network}.json`);
  if (!existsSync(path)) {
    throw new Error(`Missing deployments/${network}.json — run deploy first`);
  }
  return JSON.parse(readFileSync(path, "utf-8")) as DeploymentAddresses;
}

export function explorerTxUrl(hash: string, chainId: number = ATLANTIC.chainId): string {
  if (chainId === 31337) return `local://tx/${hash}`;
  return `${ATLANTIC.explorerUrl}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${ATLANTIC.explorerUrl}/address/${address}`;
}
