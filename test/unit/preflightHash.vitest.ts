import { describe, it, expect } from "vitest";
import { computePreflightHash } from "../../src/internal/preflight/hash.js";
import { check } from "../../src/shared/errors.js";

describe("computePreflightHash", () => {
  const input = {
    agentA: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    agentB: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    token: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
    amount: "1000",
    workDescription: "task",
  };

  it("is deterministic", () => {
    const checks = [check("ok", true)];
    const a = computePreflightHash(input, checks);
    const b = computePreflightHash(input, checks);
    expect(a).toBe(b);
  });

  it("changes when checks change", () => {
    const a = computePreflightHash(input, [check("ok", true)]);
    const b = computePreflightHash(input, [check("ok", false)]);
    expect(a).not.toBe(b);
  });
});
