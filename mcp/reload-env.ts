import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const SIGNING_ENV_KEYS = ["PRIVATE_KEY", "AGENT_B_PRIVATE_KEY"] as const;

export function hasValidPrivateKey(value?: string): boolean {
  return Boolean(value?.trim() && value.trim().length >= 66);
}

function projectRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

function envFilePath(): string {
  return process.env.PHAROS_ENV_FILE ?? join(projectRoot(), ".env");
}

/**
 * Re-read Pharos-Settle/.env so a long-lived MCP process picks up keys saved after startup.
 * Valid keys in .env override stale values; placeholder .env keys do not wipe IDE-injected keys.
 */
export function reloadProjectEnv(): void {
  const envPath = envFilePath();
  if (!existsSync(envPath)) return;

  const parsed = parse(readFileSync(envPath, "utf-8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (SIGNING_ENV_KEYS.includes(key as (typeof SIGNING_ENV_KEYS)[number])) {
      const next = value.trim();
      const current = process.env[key]?.trim();
      if (hasValidPrivateKey(next)) {
        process.env[key] = next;
      } else if (!hasValidPrivateKey(current)) {
        process.env[key] = next;
      }
    } else {
      process.env[key] = value;
    }
  }
}
