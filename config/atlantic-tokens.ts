import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export type AtlanticToken = {
  symbol: string;
  name: string;
  decimals: number;
  address: `0x${string}`;
};

const root = join(dirname(fileURLToPath(import.meta.url)));

export const ATLANTIC_TESTNET_TOKENS: AtlanticToken[] = JSON.parse(
  readFileSync(join(root, "atlantic-tokens.json"), "utf-8")
);

export function uniqueTokenAddresses(...extra: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...ATLANTIC_TESTNET_TOKENS.map((t) => t.address), ...extra]) {
    const key = raw.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(raw);
    }
  }
  return out;
}
