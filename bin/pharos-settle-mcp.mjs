#!/usr/bin/env node
/**
 * Stdio MCP entrypoint for IDE configs (repo-local or npm bin).
 * Usage: node bin/pharos-settle-mcp.mjs  (cwd = package root)
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

const result = isWin
  ? spawnSync("cmd.exe", ["/d", "/s", "/c", "npx", "tsx", "mcp/server.ts"], {
      cwd: packageRoot,
      stdio: "inherit",
      env: process.env,
      windowsHide: true,
    })
  : spawnSync("npx", ["tsx", "mcp/server.ts"], {
      cwd: packageRoot,
      stdio: "inherit",
      env: process.env,
    });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 0);
