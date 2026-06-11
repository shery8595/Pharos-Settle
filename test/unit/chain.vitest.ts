import { describe, it, expect } from "vitest";
import { explorerTxUrl, loadAllowedTokens } from "../../src/shared/chain.js";

describe("chain helpers", () => {
  it("explorerTxUrl builds Atlantic link", () => {
    const url = explorerTxUrl("0xabc", 688689);
    expect(url).toContain("atlantic.pharosscan.xyz/tx/0xabc");
  });

  it("explorerTxUrl local placeholder", () => {
    expect(explorerTxUrl("0xabc", 31337)).toBe("local://tx/0xabc");
  });

  it("loadAllowedTokens reads atlantic deployments", () => {
    const tokens = loadAllowedTokens("atlantic");
    expect(tokens.length).toBeGreaterThanOrEqual(6);
    expect(tokens.some((t) => t.symbol === "USDC")).toBe(true);
    expect(tokens.some((t) => t.symbol === "TEST")).toBe(true);
  });
});
