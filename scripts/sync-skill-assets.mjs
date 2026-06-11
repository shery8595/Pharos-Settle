#!/usr/bin/env node
/** Sync contracts/ and deployments/atlantic.json → assets/ for portable Skill Engine bundle. */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const atlanticPath = join(root, "deployments", "atlantic.json");
const assetsDir = join(root, "assets");
const settlementDir = join(assetsDir, "settlement");

mkdirSync(settlementDir, { recursive: true });

for (const name of ["DealEscrow.sol", "SettlementRouter.sol", "AgentRegistry.sol", "TokenAllowlist.sol", "MockERC20.sol"]) {
  const src = join(root, "contracts", name);
  if (existsSync(src)) cpSync(src, join(settlementDir, name), { force: true });
}

if (!existsSync(atlanticPath)) {
  console.warn("[sync-skill-assets] skip deployments — atlantic.json missing");
  process.exit(0);
}

const atlantic = JSON.parse(readFileSync(atlanticPath, "utf-8"));

writeFileSync(
  join(assetsDir, "deployments.json"),
  JSON.stringify(
    {
      version: atlantic.version,
      network: "atlantic",
      settlementRouter: atlantic.settlementRouter,
      dealEscrow: atlantic.dealEscrow,
      agentRegistry: atlantic.agentRegistry,
      tokenAllowlist: atlantic.tokenAllowlist,
      mockToken: atlantic.mockToken,
      deployer: atlantic.deployer,
    },
    null,
    2
  ) + "\n"
);

writeFileSync(
  join(assetsDir, "tokens.json"),
  JSON.stringify({ atlantic: atlantic.allowedTokens ?? [] }, null, 2) + "\n"
);

const networksPath = join(assetsDir, "networks.json");
if (existsSync(networksPath)) {
  const networks = JSON.parse(readFileSync(networksPath, "utf-8"));
  networks.atlantic = {
    ...networks.atlantic,
    chainId: atlantic.chainId,
    rpcUrl: atlantic.rpcUrl,
    explorerUrl: atlantic.explorerUrl,
  };
  writeFileSync(networksPath, JSON.stringify(networks, null, 2) + "\n");
}

console.log("[sync-skill-assets] assets/ synced from contracts/ + deployments/atlantic.json");
