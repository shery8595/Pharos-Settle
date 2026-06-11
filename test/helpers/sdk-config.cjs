const hre = require("hardhat");
const { derivePrivateKeys } = require("hardhat/internal/core/providers/util");
const { bytesToHex } = require("@ethereumjs/util");

function hardhatPrivateKeys() {
  const cfg = hre.network.config.accounts;
  if (Array.isArray(cfg)) {
    return cfg.map((entry) => (typeof entry === "string" ? entry : entry.privateKey));
  }
  return derivePrivateKeys(
    cfg.mnemonic,
    cfg.path,
    cfg.initialIndex ?? 0,
    cfg.count ?? 20,
    cfg.passphrase ?? ""
  ).map((pk) => {
    const hex = bytesToHex(pk);
    return hex.startsWith("0x") ? hex : `0x${hex}`;
  });
}

async function keyForSigner(signer) {
  const signers = await hre.ethers.getSigners();
  const keys = hardhatPrivateKeys();
  const idx = signers.findIndex((s) => s.address.toLowerCase() === signer.address.toLowerCase());
  if (idx < 0 || idx >= keys.length) {
    throw new Error(`No hardhat key for ${signer.address} (index ${idx})`);
  }
  return keys[idx];
}

async function buildSdkConfig(fixture, overrides = {}) {
  const payer = fixture.payer;
  const payee = fixture.payee;

  return {
    mock: false,
    mode: "cooperative",
    deploymentNetwork: "localhost",
    rpcUrl: hre.network.config.url ?? "http://127.0.0.1:8545",
    routerAddress: fixture.addresses.settlementRouter,
    payerSigner: overrides.payerSigner ?? (await keyForSigner(payer)),
    payeeSigner: overrides.payeeSigner ?? (await keyForSigner(payee)),
    inProcessProvider: hre.network.provider,
    ...overrides,
  };
}

function writeLocalDeployments(addresses) {
  const { writeFileSync, mkdirSync } = require("node:fs");
  const { join } = require("node:path");
  const outDir = join(process.cwd(), "deployments");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "localhost.json"), JSON.stringify(addresses, null, 2));
}

module.exports = { buildSdkConfig, writeLocalDeployments, hardhatPrivateKeys, keyForSigner };
