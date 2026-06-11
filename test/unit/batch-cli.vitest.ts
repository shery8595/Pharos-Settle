import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  readManifestFile,
  writeManifestFile,
  type ManifestFilePayload,
} from "../../scripts/lib/batch-cli.js";
import type { BatchFundOutput } from "../../src/shared/schemas.js";

describe("batch-cli manifest I/O", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pharos-batch-cli-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const mockFunded = (): BatchFundOutput => ({
    success: true,
    batchMode: "saliFast",
    deals: 2,
    succeeded: 2,
    failed: 0,
    fundSubmitMs: 10,
    fundTxPerSec: 20,
    maxParallelFundInBlock: 2,
    manifest: [
      {
        index: 0,
        dealId: "1",
        fundTx: "0x" + "11".repeat(32),
        amount: "1000000000000000000",
        agentA: "0x1111111111111111111111111111111111111111",
        agentB: "0x2222222222222222222222222222222222222222",
        token: "0x3333333333333333333333333333333333333333",
        workDescription: "task-1",
        workHash: "0x" + "aa".repeat(32),
      },
    ],
    saliNote: "ok",
    results: [],
  });

  it("writeManifestFile and readManifestFile round-trip wrapper", () => {
    const path = join(dir, "manifest.json");
    writeManifestFile(path, mockFunded());
    const rows = readManifestFile(path);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.dealId).toBe("1");
  });

  it("readManifestFile accepts bare array", () => {
    const path = join(dir, "bare.json");
    const rows = mockFunded().manifest;
    writeFileSync(path, JSON.stringify(rows));
    expect(readManifestFile(path)[0]?.agentB).toBe(rows[0]?.agentB);
  });

  it("writeManifestFile includes summary metadata", () => {
    const path = join(dir, "wrapped.json");
    writeManifestFile(path, mockFunded());
    const payload = JSON.parse(readFileSync(path, "utf-8")) as ManifestFilePayload;
    expect(payload.batchMode).toBe("saliFast");
    expect(payload.summary.succeeded).toBe(2);
    expect(payload.manifest).toHaveLength(1);
  });
});
