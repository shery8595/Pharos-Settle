#!/usr/bin/env node
/**
 * Merge pharos-settle into ~/.cursor/mcp.json and update setup checklist.
 * Run automatically when `npm run setup -- --mode=global`; also: npm run mcp:install-global
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getCursorGlobalMcpPath, installGlobalCursorMcp } from "./lib/cursor-global-mcp.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const portableDir = join(root, ".pharos-settle");
const mcpBinPath = join(portableDir, "mcp-bin.generated.json");
const checklistPath = join(portableDir, "setup-checklist.json");

if (!existsSync(mcpBinPath)) {
  console.error(`\n✗ Missing ${mcpBinPath} — run npm run setup first.\n`);
  process.exit(1);
}

const { mcpServers } = JSON.parse(readFileSync(mcpBinPath, "utf-8"));
const result = installGlobalCursorMcp(mcpServers);

let checklist = {};
if (existsSync(checklistPath)) {
  try {
    checklist = JSON.parse(readFileSync(checklistPath, "utf-8"));
  } catch {
    checklist = {};
  }
}

const now = new Date().toISOString();
writeFileSync(
  checklistPath,
  JSON.stringify(
    {
      ...checklist,
      mcpMode: checklist.mcpMode ?? "global",
      globalMcpInstalled: true,
      globalMcpPath: getCursorGlobalMcpPath().replace(/\\/g, "/"),
      globalMcpInstalledAt: now,
      awaitingConfirmation: true,
      message:
        "Global MCP written by setup — reload pharos-settle in Cursor Settings → MCP. See AGENTS.md",
      steps: [
        "Reload MCP so pharos-settle is connected (Settings → MCP → restart pharos-settle)",
        "Open any workspace — MCP runs from the Pharos-Settle clone at repoPath",
        ...(checklist.runMode === "live" && !checklist.keysConfigured
          ? ["Confirm PRIVATE_KEY and AGENT_B_PRIVATE_KEY in .env before live MCP tools"]
          : checklist.runMode === "demo"
            ? ["User chose demo — use mock: true or npm run agent:doctor:mock"]
            : []),
      ],
    },
    null,
    2
  ) + "\n",
  "utf-8"
);

const action = result.created ? "created" : result.updated ? "updated" : "unchanged";
console.log(`✓ Global MCP ${action} → ${result.path.replace(/\\/g, "/")}`);
console.log(`✓ Checklist → ${checklistPath.replace(/\\/g, "/")}`);
console.log("\nReload pharos-settle in Cursor Settings → MCP, then ask your agent about settlement tools.\n");
