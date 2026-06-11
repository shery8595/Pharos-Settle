#!/usr/bin/env node
/**
 * One-shot judge / developer setup: install, build, skill copy, MCP verify.
 * Run: npm run setup
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { installGlobalCursorMcp } from "./lib/cursor-global-mcp.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Minimal .env parser — avoids importing dotenv before npm install. */
function parseEnvFile(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}
const isWin = process.platform === "win32";

const MCP_MODES = ["project", "global"];
const RUN_MODES = ["demo", "live"];

function getArg(name) {
  const prefix = `${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function parseMcpModeArg() {
  const raw = getArg("--mode");
  if (!raw) return null;
  if (!MCP_MODES.includes(raw)) {
    console.error(`\n✗ Invalid --mode=${raw} (use project or global)`);
    process.exit(1);
  }
  return raw;
}

function hasValidPrivateKey(value) {
  return Boolean(value?.trim() && value.trim().length >= 66);
}

function readEnvKeys(envPath) {
  if (!existsSync(envPath)) return { payer: undefined, payee: undefined };
  const parsed = parseEnvFile(readFileSync(envPath, "utf-8"));
  return { payer: parsed.PRIVATE_KEY, payee: parsed.AGENT_B_PRIVATE_KEY };
}

function parseRunModeArg() {
  const raw = getArg("--run");
  if (!raw) return null;
  if (!RUN_MODES.includes(raw)) {
    console.error(`\n✗ Invalid --run=${raw} (use demo or live)`);
    process.exit(1);
  }
  return raw;
}

async function promptChoice({ title, options, defaultIndex, parseAnswer }) {
  const rl = createInterface({ input, output });
  try {
    console.log(title);
    const answer = (await rl.question(`Choice [1-${options.length}] (default ${defaultIndex}): `)).trim();
    return parseAnswer(answer, defaultIndex);
  } finally {
    rl.close();
  }
}

async function promptMcpMode() {
  const fromArg = parseMcpModeArg();
  if (fromArg) return fromArg;
  if (!input.isTTY) return null;

  return promptChoice({
    title: `
MCP mode — how will you use Pharos Settle in your IDE?

  1) Project  — open Pharos-Settle as workspace root (default; judges / repo work)
  2) Global   — MCP from any workspace (paste global config; see docs/mcp/modes.md)
`,
    options: ["project", "global"],
    defaultIndex: 1,
    parseAnswer: (answer) => {
      if (answer === "2" || answer.toLowerCase() === "global") return "global";
      return "project";
    },
  });
}

async function promptRunMode() {
  const fromArg = parseRunModeArg();
  if (fromArg) return fromArg;
  if (!input.isTTY) return null;

  return promptChoice({
    title: `
Run mode — how do you want to test Pharos Settle?

  1) Demo  — mock / no keys (recommended first)
  2) Live  — Atlantic testnet (requires .env keys + PHRS)
`,
    options: ["demo", "live"],
    defaultIndex: 1,
    parseAnswer: (answer) => {
      if (answer === "2" || answer.toLowerCase() === "live") return "live";
      return "demo";
    },
  });
}

async function confirmLiveEnvKeys(envPath) {
  const initial = readEnvKeys(envPath);
  if (hasValidPrivateKey(initial.payer) && hasValidPrivateKey(initial.payee)) {
    return { keysConfigured: true };
  }

  console.log(`
Live mode — set wallet keys in:
  ${envPath.replace(/\\/g, "/")}

  PRIVATE_KEY=0x...             payer (Agent A) — fund + attest
  AGENT_B_PRIVATE_KEY=0x...    payee (Agent B) — deliver + claim

Keys must be full 32-byte hex (66+ chars). Fund both wallets with PHRS (Atlantic faucet).
`);

  if (!input.isTTY) {
    return { keysConfigured: false };
  }

  const rl = createInterface({ input, output });
  try {
    const answer = (
      await rl.question("Press Enter after saving both keys (or type skip): ")
    ).trim();
    if (answer.toLowerCase() === "skip") {
      return { keysConfigured: false };
    }
    const after = readEnvKeys(envPath);
    const keysConfigured =
      hasValidPrivateKey(after.payer) && hasValidPrivateKey(after.payee);
    if (!keysConfigured) {
      console.log("\n⚠ Keys not detected yet — edit .env, then run npm run agent:doctor when ready.\n");
    } else {
      console.log("\n✓ Both keys detected in .env\n");
    }
    return { keysConfigured };
  } finally {
    rl.close();
  }
}

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

function copySkillTo(dest) {
  const src = join(root, "skills", "trusted-agent-settlement");
  if (!existsSync(src)) {
    console.error(`\n✗ Skill source missing: ${src}`);
    process.exit(1);
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
  return dest;
}

function installSkill(mcpMode) {
  const projectDest = copySkillTo(join(root, ".cursor", "skills", "trusted-agent-settlement"));
  const installed = [{ label: "project", path: projectDest }];

  if (mcpMode === "global") {
    const globalDest = copySkillTo(join(homedir(), ".cursor", "skills", "trusted-agent-settlement"));
    installed.push({ label: "global", path: globalDest });
  }

  return installed;
}

function printSkippedInteractiveNotice(mcpMode, runMode) {
  if (mcpMode != null && runMode != null) return;
  console.log(`
⚠ Setup ran non-interactively (no TTY) — MCP mode and/or run mode were not chosen here.
  • Run in your own terminal:  npm run setup
  • Or tell your agent to ask:  project vs global MCP, then demo vs live
  • Flags:  npm run setup -- --mode=global --run=demo
`);
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

function createEnvFromExample() {
  const examplePath = join(root, ".env.example");
  const envPath = join(root, ".env");

  if (!existsSync(examplePath)) {
    console.error(`\n✗ .env.example missing: ${examplePath}`);
    process.exit(1);
  }

  if (existsSync(envPath)) {
    return { envPath, created: false };
  }

  copyFileSync(examplePath, envPath);
  return { envPath, created: true };
}

function modeSteps(mcpMode, runMode, keysConfigured, globalMcpInstalled) {
  const steps = [];

  if (mcpMode == null) {
    steps.push(
      "Ask user: project MCP (open Pharos-Settle as workspace root) vs global MCP (any workspace) — save mcpMode in checklist"
    );
  } else if (mcpMode === "global") {
    if (globalMcpInstalled) {
      steps.push(
        "Setup wrote pharos-settle to Cursor global MCP (~/.cursor/mcp.json) — reload MCP in Settings",
        "Open any workspace — MCP runs from the Pharos-Settle clone at repoPath"
      );
    } else {
      steps.push(
        "Run npm run mcp:install-global (or npm run setup -- --mode=global) to write ~/.cursor/mcp.json",
        "Reload MCP so pharos-settle is connected"
      );
    }
  } else {
    steps.push(
      "Open Pharos-Settle as workspace / project root (not a parent folder)",
      "Reload MCP — .cursor/mcp.json uses ${workspaceFolder}"
    );
  }

  if (runMode == null) {
    steps.push("Ask user: demo (mock) vs live Atlantic — save runMode in checklist");
  } else if (runMode === "live" && !keysConfigured) {
    steps.push(
      "User chose live — confirm PRIVATE_KEY and AGENT_B_PRIVATE_KEY are set in .env at repoPath before live MCP tools"
    );
  } else if (runMode === "live") {
    steps.push("User chose live — keys configured; use MCP without mock: true or npm run agent:doctor");
  } else {
    steps.push("User chose demo — use mock: true or npm run agent:doctor:mock");
  }

  return steps;
}

function checklistMessage(mcpMode, runMode, globalMcpInstalled) {
  if (mcpMode == null || runMode == null) {
    return "Agent: ask project vs global MCP and demo vs live (setup ran non-interactively). See AGENTS.md";
  }
  if (mcpMode === "global") {
    if (globalMcpInstalled) {
      return "Agent: global MCP installed by setup — confirm reload only (or skip if pharos-settle tools are in session). See AGENTS.md";
    }
    return "Agent: run mcp:install-global after user picks global; then confirm reload. See AGENTS.md";
  }
  return "Agent: confirm workspace root + MCP reload; runMode chosen at setup. See AGENTS.md";
}

function writePortableArtifacts(envInfo, mcpMode, runMode, keysConfigured, globalMcpInstall) {
  mkdirSync(portableDir, { recursive: true });
  const repoPath = root.replace(/\\/g, "/");

  const checklistPath = join(portableDir, "setup-checklist.json");
  writeFileSync(
    checklistPath,
    JSON.stringify(
      {
        awaitingConfirmation: true,
        setupCompletedAt: new Date().toISOString(),
        mcpMode,
        mcpModeDocs: "docs/mcp/modes.md",
        runMode,
        setupInteractive: mcpMode != null && runMode != null,
        needsSetupChoices: mcpMode == null || runMode == null,
        globalMcpInstalled: globalMcpInstall?.installed ?? false,
        globalMcpPath: globalMcpInstall?.path?.replace(/\\/g, "/") ?? null,
        globalMcpInstalledAt: globalMcpInstall?.installed ? new Date().toISOString() : null,
        keysConfigured: runMode === "live" ? keysConfigured : null,
        repoPath,
        message: checklistMessage(mcpMode, runMode, globalMcpInstall?.installed ?? false),
        env: {
          path: ".env",
          createdFromExample: envInfo.created,
          examplePath: ".env.example",
        },
        steps: modeSteps(mcpMode, runMode, keysConfigured, globalMcpInstall?.installed ?? false),
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

  return { checklistPath, mcpGeneratedPath, mcpBinPath, mcpServers: mcpBlock };
}

function installGlobalMcpIfNeeded(mcpMode, repoPath) {
  if (mcpMode !== "global") return null;
  const pharosServers = {
    "pharos-settle": {
      command: "node",
      args: [join(repoPath, "bin/pharos-settle-mcp.mjs").replace(/\\/g, "/")],
    },
  };
  try {
    const result = installGlobalCursorMcp(pharosServers);
    return { installed: true, ...result };
  } catch (e) {
    console.error(`\n⚠ Could not write Cursor global MCP: ${e.message}`);
    console.error("  Paste manually from .pharos-settle/mcp-bin.generated.json — docs/mcp/modes.md\n");
    return { installed: false, error: e.message };
  }
}

function printRunNextSteps(runMode, keysConfigured) {
  if (runMode == null) return;

  if (runMode === "live") {
    if (keysConfigured) {
      console.log(`Run mode (live):
  npm run agent:doctor
  npm run demo:pharos
  MCP tools without mock: true
`);
    } else {
      console.log(`Run mode (live) — finish .env keys, then:
  npm run agent:doctor
  npm run demo:pharos
`);
    }
    return;
  }

  console.log(`Run mode (demo):
  npm run agent:doctor:mock
  npm run demo:simulate
  MCP tools with mock: true
`);
}

function printModeNextSteps(mcpMode, { mcpGeneratedPath, mcpBinPath }, globalMcpInstall) {
  if (mcpMode == null) return;

  if (mcpMode === "global") {
    if (globalMcpInstall?.installed) {
      console.log(`
Next (global MCP — use from any workspace):
  1. Reload pharos-settle in Cursor Settings → MCP
  2. Global config → ${globalMcpInstall.path.replace(/\\/g, "/")}
  3. Skill installed globally → ~/.cursor/skills/trusted-agent-settlement/
  4. Keys still live in this clone's .env — see docs/mcp/modes.md

  Ask your agent: "What settlement tools do you have?"
`);
    } else {
      console.log(`
Next (global MCP — use from any workspace):
  1. npm run mcp:install-global   (writes ~/.cursor/mcp.json)
  2. Or paste pharos-settle from ${mcpBinPath.replace(/\\/g, "/")}
  3. Reload pharos-settle in Cursor Settings → MCP
  4. Skill installed globally → ~/.cursor/skills/trusted-agent-settlement/

  Ask your agent: "What settlement tools do you have?"
`);
    }
    return;
  }

  console.log(`
Next (project MCP — Pharos-Settle as workspace root):
  1. Open Pharos-Settle as workspace / project root
  2. Settings → MCP → reload pharos-settle (.cursor/mcp.json is committed)
  3. Agent should confirm workspace + MCP — see AGENTS.md
  4. Ask: "What settlement tools do you have?"

  Other IDEs: copy ${mcpGeneratedPath.replace(/\\/g, "/")} — docs/mcp/other-ides.md
`);
}

console.log("\nPharos Settle — setup\n");

const mcpMode = await promptMcpMode();
const runMode = await promptRunMode();

run("Dependencies", ["install"]);
console.log("✓ Dependencies installed");

run("Build", ["run", "build"]);
console.log("✓ Project built");

printSkippedInteractiveNotice(mcpMode, runMode);
console.log(
  mcpMode != null
    ? `✓ MCP mode → ${mcpMode} (docs/mcp/modes.md)`
    : "○ MCP mode → not chosen (agent will ask: project vs global)"
);
console.log(
  runMode != null ? `✓ Run mode → ${runMode}` : "○ Run mode → not chosen (agent will ask: demo vs live)"
);

const skillPaths = installSkill(mcpMode);
for (const { label, path: skillPath } of skillPaths) {
  console.log(`✓ Skill installed (${label}) → ${skillPath.replace(/\\/g, "/")}`);
}

const mcpPath = verifyMcpConfig();
console.log(`✓ MCP configured → ${mcpPath.replace(/\\/g, "/")}`);

const envInfo = createEnvFromExample();
if (envInfo.created) {
  console.log(`✓ Environment file created → ${envInfo.envPath.replace(/\\/g, "/")} (from .env.example)`);
} else {
  console.log(`✓ Environment file exists → ${envInfo.envPath.replace(/\\/g, "/")} (left unchanged)`);
}

let keysConfigured = false;
if (runMode === "live") {
  const keyStatus = await confirmLiveEnvKeys(envInfo.envPath);
  keysConfigured = keyStatus.keysConfigured;
  console.log(keysConfigured ? "✓ Live keys configured" : "⚠ Live keys pending — edit .env before on-chain tools");
}

const repoPath = root.replace(/\\/g, "/");
const globalMcpInstall = installGlobalMcpIfNeeded(mcpMode, repoPath);
const portable = writePortableArtifacts(envInfo, mcpMode, runMode, keysConfigured, globalMcpInstall);
console.log(`✓ Setup checklist → ${portable.checklistPath.replace(/\\/g, "/")}`);
console.log(`✓ MCP config (project / other IDEs) → ${portable.mcpGeneratedPath.replace(/\\/g, "/")}`);
console.log(`✓ MCP config (global / bin) → ${portable.mcpBinPath.replace(/\\/g, "/")}`);
if (globalMcpInstall?.installed) {
  console.log(`✓ Cursor global MCP → ${globalMcpInstall.path.replace(/\\/g, "/")}`);
}

printModeNextSteps(mcpMode, portable, globalMcpInstall);
printRunNextSteps(runMode, keysConfigured);
