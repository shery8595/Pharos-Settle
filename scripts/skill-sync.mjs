#!/usr/bin/env node
/** Copy Skill Engine bundle (SKILL.md + assets/ + references/) → .cursor/skills/ */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, ".cursor", "skills", "trusted-agent-settlement");

if (!existsSync(join(root, "SKILL.md"))) {
  console.error("Missing root SKILL.md — run from Pharos-Settle repo root");
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
cpSync(join(root, "SKILL.md"), join(dest, "SKILL.md"), { force: true });

for (const dir of ["assets", "references"]) {
  const src = join(root, dir);
  if (existsSync(src)) {
    cpSync(src, join(dest, dir), { recursive: true, force: true });
  }
}

console.log("Synced Skill Engine bundle →", dest);
