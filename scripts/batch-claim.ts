#!/usr/bin/env tsx
/**
 * Production batch claim — payee only. Filters manifest to AGENT_B_PRIVATE_KEY identity.
 *
 * Usage:
 *   npm run batch:claim -- --manifest ./manifest.json
 */
import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import {
  claimDealsBatch,
  filterManifestForPayee,
  manifestToClaims,
} from "../src/trustedAgentSettlement.js";
import {
  arg,
  hasFlag,
  payeeAddressFromEnv,
  payeeConfig,
  readManifestFile,
} from "./lib/batch-cli.js";

async function main() {
  const manifestPath = arg("--manifest");
  if (!manifestPath) {
    console.error("Usage: npm run batch:claim -- --manifest ./manifest.json [--mock]");
    process.exit(1);
  }

  const mock = hasFlag("--mock");
  const payee = payeeAddressFromEnv();
  const allRows = readManifestFile(manifestPath);
  const { matched, skipped } = filterManifestForPayee(allRows, payee);

  console.log(`batch:claim — payee=${payee}, manifest rows=${allRows.length}`);
  if (skipped > 0) {
    console.log(`Skipped ${skipped} row(s) for other payee addresses (multi-payee manifest).`);
  }

  if (matched.length === 0) {
    console.error(`No manifest rows match payee ${payee}. Check AGENT_B_PRIVATE_KEY and manifest path.`);
    process.exit(1);
  }

  const claims = manifestToClaims(matched);
  console.log(`\n→ claimDealsBatch (${claims.length} deal(s), payee key only)...`);
  const claimed = await claimDealsBatch(claims, payeeConfig(mock));

  console.log({
    succeeded: claimed.succeeded,
    failed: claimed.failed,
    claimTxPerSec: claimed.claimTxPerSec.toFixed(2),
    maxParallelClaimInBlock: claimed.maxParallelClaimInBlock,
    totalFeesWei: claimed.totalFeesWei,
    saliNote: claimed.saliNote,
  });

  if (claimed.failed > 0) {
    for (const r of claimed.results.filter((x) => !x.success)) {
      console.error("failed claim", r.dealId, r.error);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
