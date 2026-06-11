#!/usr/bin/env node
/**
 * One-shot judge / developer setup: install, build, skill copy, MCP verify.
 * Run: npm run setup
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const portableDir = join(root, ".pharos-settle");

function writePortableArtifacts() {
  mkdirSync(portableDir, { recursive: true });
  const repoPath = root.replace(/\\/g, "/");

  const checklistPath = join(portableDir, "setup-checklist.json");
  writeFileSync(
    checklistPath,
    JSON.stringify(
      {
        awaitingConfirmation: true,
        setupCompletedAt: new Date().toISOString(),
        repoPath,
        message:
          "Agent: confirm workspace root + MCP reload before pharos-settle tools. See AGENTS.md and docs/mcp/other-ides.md",
        steps: [
          "Open Pharos-Settle as workspace / project root (not a parent folder)",
          "Add MCP config from .pharos-settle/mcp.generated.json to your IDE",
          "Reload MCP so pharos-settle is connected",
        ],
        ideDocs: "docs/mcp/other-ides.md",
      },
      null,
      2
    ) + "\n",
    "utf-8"
  );

  const mcpGeneratedPath = join(portableDir, "mcp.generated.json");
  const mcpBlock = {
    "pharos-settle": {
      command: "npx",
      args: ["tsx", "mcp/server.ts"],
      cwd: repoPath,
      env: {
        PHAROS_RPC_URL: "https://atlantic.dplabs-internal.com",
      },
    },
  };
  writeFileSync(
    mcpGeneratedPath,
    JSON.stringify({ mcpServers: mcpBlock }, null, 2) + "\n",
    "utf-8"
  );

  const mcpBinPath = join(portableDir, "mcp-bin.generated.json");
  writeFileSync(
    mcpBinPath,
    JSON.stringify(
      {
        mcpServers: {
          "pharos-settle": {
            command: "node",
            args: [join(repoPath, "bin/pharos-settle-mcp.mjs").replace(/\\/g, "/")],
          },
        },
      },
      null,
      2
    ) + "\n",
    "utf-8"
  );

  return { checklistPath, mcpGeneratedPath, mcpBinPath };
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

const { checklistPath, mcpGeneratedPath, mcpBinPath } = writePortableArtifacts();
console.log(`✓ Setup checklist → ${checklistPath.replace(/\\/g, "/")}`);
console.log(`✓ MCP config (copy to your IDE) → ${mcpGeneratedPath.replace(/\\/g, "/")}`);
console.log(`✓ MCP bin alternate → ${mcpBinPath.replace(/\\/g, "/")}`);

console.log(`
Next (all IDEs):
  1. Open Pharos-Settle as workspace / project root
  2. Copy MCP block from .pharos-settle/mcp.generated.json into your IDE (see docs/mcp/other-ides.md)
  3. Reload MCP — agent should ask you to confirm (yes/no) — see AGENTS.md
  4. Ask: "What settlement tools do you have?"

Cursor: .cursor/mcp.json is already committed — just reload MCP.

Mock demo (no keys):
  npm run agent:doctor:mock
  npm run demo:simulate
`);
