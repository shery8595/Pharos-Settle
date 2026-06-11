import { describe, it, expect } from "vitest";
import {
  canonicalJsonStringify,
  computePreflightHash,
  verifyPreflightHash,
} from "../../src/internal/preflight/hash.js";
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

  it("is independent of check array order", () => {
    const ordered = [
      check("agent_a_registered", true),
      check("token_allowed", true),
      check("sufficient_balance", true),
    ];
    const shuffled = [
      check("sufficient_balance", true),
      check("agent_a_registered", true),
      check("token_allowed", true),
    ];
    expect(computePreflightHash(input, ordered)).toBe(computePreflightHash(input, shuffled));
  });

  it("normalizes address casing", () => {
    const lower = {
      ...input,
      agentA: input.agentA.toLowerCase(),
      agentB: input.agentB.toLowerCase(),
      token: input.token.toLowerCase(),
    };
    expect(computePreflightHash(input, [check("ok", true)])).toBe(
      computePreflightHash(lower, [check("ok", true)])
    );
  });
});

describe("canonicalJsonStringify", () => {
  it("sorts object keys", () => {
    expect(canonicalJsonStringify({ z: 1, a: 2 })).toBe('{"a":2,"z":1}');
  });
});

describe("verifyPreflightHash", () => {
  const input = {
    agentA: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    agentB: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    token: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
    amount: "1000",
    workDescription: "task",
  };

  it("matches a valid preflight hash", () => {
    const checks = [check("ok", true)];
    const hash = computePreflightHash(input, checks);
    expect(verifyPreflightHash(hash, input, checks)).toBe(true);
  });

  it("rejects junk or bypassed hashes", () => {
    const checks = [check("ok", true)];
    expect(verifyPreflightHash("0x" + "00".repeat(32), input, checks)).toBe(false);
  });
});
