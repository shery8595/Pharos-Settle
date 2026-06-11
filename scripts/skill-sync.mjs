#!/usr/bin/env node
/** Copy skills/trusted-agent-settlement → .cursor/skills/ (project-scoped). */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "skills", "trusted-agent-settlement");
const dest = join(root, ".cursor", "skills", "trusted-agent-settlement");

if (!existsSync(src)) {
  console.error("Missing", src);
  process.exit(1);
}
mkdirSync(join(root, ".cursor", "skills"), { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("Synced skill →", dest);
