import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export function getCursorGlobalMcpPath() {
  return join(homedir(), ".cursor", "mcp.json");
}

/** Merge pharos-settle into an MCP config without dropping other servers. */
export function mergePharosSettleMcp(existingConfig, pharosServers) {
  const entry = pharosServers?.["pharos-settle"];
  if (!entry?.command || !Array.isArray(entry.args)) {
    throw new Error('pharosServers must include pharos-settle with command and args');
  }

  const config = existingConfig ?? {};
  const servers = { ...(config.mcpServers ?? {}) };
  servers["pharos-settle"] = entry;
  return { mcpServers: servers };
}

/**
 * Write pharos-settle into Cursor global MCP (~/.cursor/mcp.json).
 * @returns {{ path: string, created: boolean, updated: boolean }}
 */
export function installGlobalCursorMcp(pharosServers, options = {}) {
  const mcpPath = options.mcpPath ?? getCursorGlobalMcpPath();
  const existed = existsSync(mcpPath);

  let existing = {};
  if (existed) {
    try {
      existing = JSON.parse(readFileSync(mcpPath, "utf-8"));
    } catch (e) {
      throw new Error(`Invalid JSON in ${mcpPath}: ${e.message}`);
    }
  }

  const previous = existing.mcpServers?.["pharos-settle"];
  const merged = mergePharosSettleMcp(existing, pharosServers);
  const nextEntry = merged.mcpServers["pharos-settle"];
  const updated = !previous || JSON.stringify(previous) !== JSON.stringify(nextEntry);

  mkdirSync(dirname(mcpPath), { recursive: true });
  writeFileSync(mcpPath, JSON.stringify(merged, null, 2) + "\n", "utf-8");

  return { path: mcpPath, created: !existed, updated };
}
