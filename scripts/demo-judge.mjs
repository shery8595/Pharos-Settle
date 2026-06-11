#!/usr/bin/env node
/**
 * One-command judge mock flow: readiness check + simulate settlement (no keys, no network).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(label, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n${"=".repeat(60)}\n${label}\n${"=".repeat(60)}\n`);
    const child = spawn("npx", ["tsx", ...args], {
      cwd: root,
      stdio: "inherit",
      shell: true,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}`));
    });
  });
}

async function main() {
  console.log("\nPharos Settle — judge mock demo (no keys required)\n");
  await run("1/2  agent:doctor:mock", ["scripts/agent-doctor.ts", "--mock"]);
  await run("2/2  demo:simulate", ["scripts/demo.ts", "--simulate"]);
  console.log(`
${"=".repeat(60)}
Judge mock flow complete
${"=".repeat(60)}

Reusable surfaces (not just a demo script):
  • Skill     SKILL.md + assets/ + references/
  • MCP       17 tools — npm run mcp
  • SDK       src/trustedAgentSettlement.ts + steps.ts
  • Contracts deployments/atlantic.json
  • Batch     fund_deals_batch → complete_claims_batch

Live Atlantic proof: SUBMISSION.md#live-proof-pharosscan
Full judge guide:    JUDGES.md
`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
