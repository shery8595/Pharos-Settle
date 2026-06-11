import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { reloadProjectEnv, hasValidPrivateKey } from "../../mcp/reload-env.js";

const VALID_PAYER = "0x" + "ab".repeat(32);
const VALID_PAYEE = "0x" + "cd".repeat(32);

describe("hasValidPrivateKey", () => {
  it("rejects placeholders", () => {
    expect(hasValidPrivateKey("0x")).toBe(false);
    expect(hasValidPrivateKey(undefined)).toBe(false);
  });

  it("accepts 32-byte hex keys", () => {
    expect(hasValidPrivateKey(VALID_PAYER)).toBe(true);
  });
});

describe("reloadProjectEnv", () => {
  let tempDir: string;
  let envFile: string;
  let prevPayer: string | undefined;
  let prevPayee: string | undefined;
  let prevEnvFile: string | undefined;

  beforeEach(() => {
    prevPayer = process.env.PRIVATE_KEY;
    prevPayee = process.env.AGENT_B_PRIVATE_KEY;
    prevEnvFile = process.env.PHAROS_ENV_FILE;
    tempDir = mkdtempSync(join(tmpdir(), "pharos-reload-env-"));
    envFile = join(tempDir, ".env");
    process.env.PHAROS_ENV_FILE = envFile;
  });

  afterEach(() => {
    if (prevPayer === undefined) delete process.env.PRIVATE_KEY;
    else process.env.PRIVATE_KEY = prevPayer;
    if (prevPayee === undefined) delete process.env.AGENT_B_PRIVATE_KEY;
    else process.env.AGENT_B_PRIVATE_KEY = prevPayee;
    if (prevEnvFile === undefined) delete process.env.PHAROS_ENV_FILE;
    else process.env.PHAROS_ENV_FILE = prevEnvFile;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("loads valid keys written after MCP would have started", () => {
    delete process.env.PRIVATE_KEY;
    writeFileSync(
      envFile,
      `PRIVATE_KEY=${VALID_PAYER}\nAGENT_B_PRIVATE_KEY=${VALID_PAYEE}\n`,
      "utf-8"
    );

    reloadProjectEnv();

    expect(process.env.PRIVATE_KEY).toBe(VALID_PAYER);
    expect(process.env.AGENT_B_PRIVATE_KEY).toBe(VALID_PAYEE);
  });

  it("does not replace IDE-injected keys with placeholder .env values", () => {
    process.env.PRIVATE_KEY = VALID_PAYER;
    writeFileSync(envFile, "PRIVATE_KEY=0x\n", "utf-8");

    reloadProjectEnv();

    expect(process.env.PRIVATE_KEY).toBe(VALID_PAYER);
  });

  it("syncs valid keys over stale placeholder in process.env", () => {
    process.env.PRIVATE_KEY = "0x";
    writeFileSync(envFile, `PRIVATE_KEY=${VALID_PAYER}\n`, "utf-8");

    reloadProjectEnv();

    expect(process.env.PRIVATE_KEY).toBe(VALID_PAYER);
  });
});
