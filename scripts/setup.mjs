#!/usr/bin/env node
/**
 * One-shot judge / developer setup: install, build, skill copy, MCP verify.
 * Run: npm run setup
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

/** Cross-platform npm invoke (Windows needs shell so npm.cmd can run). */
function run(step, args) {
  const result = isWin
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", "npm", ...args], {
        cwd: root,
        stdio: "inherit",
        windowsHide: true,
      })
    : spawnSync("npm", args, { cwd: root, stdio: "inherit" });

  if (result.error) {
    console.error(`\n✗ ${step} failed to start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`\n✗ ${step} failed (exit ${result.status ?? "unknown"})`);
    if (result.signal) console.error(`  signal: ${result.signal}`);
    process.exit(result.status ?? 1);
  }
}

function copySkill() {
  const src = join(root, "skills", "trusted-agent-settlement");
  const dest = join(root, ".cursor", "skills", "trusted-agent-settlement");
  if (!existsSync(src)) {
    console.error(`\n✗ Skill source missing: ${src}`);
    process.exit(1);
  }
  mkdirSync(join(root, ".cursor", "skills"), { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
}

function verifyMcpConfig() {
  const mcpPath = join(root, ".cursor", "mcp.json");
  if (!existsSync(mcpPath)) {
    console.error(`\n✗ MCP config missing: ${mcpPath}`);
    console.error("  Expected committed .cursor/mcp.json at repo root.");
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(mcpPath, "utf-8"));
  } catch (e) {
    console.error(`\n✗ Invalid JSON in .cursor/mcp.json: ${e.message}`);
    process.exit(1);
  }
  const servers = parsed.mcpServers ?? {};
  if (!servers["pharos-settle"]) {
    console.error('\n✗ .cursor/mcp.json must define mcpServers["pharos-settle"]');
    process.exit(1);
  }
  const entry = servers["pharos-settle"];
  if (!entry.command || !Array.isArray(entry.args)) {
    console.error("\n✗ pharos-settle MCP entry needs command and args");
    process.exit(1);
  }
  return mcpPath;
}

console.log("\nPharos Settle — setup\n");

run("Dependencies", ["install"]);
console.log("✓ Dependencies installed");

run("Build", ["run", "build"]);
console.log("✓ Project built");

copySkill();
console.log("✓ Skill installed → .cursor/skills/trusted-agent-settlement/");

const mcpPath = verifyMcpConfig();
console.log(`✓ MCP configured → ${mcpPath.replace(/\\/g, "/")}`);

console.log(`
Next:
  1. Open Pharos-Settle as workspace root (not a parent folder)
  2. Reload MCP in Cursor (Settings → MCP → restart pharos-settle)
  3. Ask your agent:
     "What settlement tools do you have?"

Mock demo (no keys):
  npm run agent:doctor:mock
  npm run demo:simulate
`);
