import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFeeQuote } from "../../src/internal/commerce/feeQuote.js";

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      readContract: vi.fn().mockResolvedValue(100n),
    })),
  };
});

describe("getFeeQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mock mode returns zero fee", async () => {
    const q = await getFeeQuote("1000000000000000000", { mock: true });
    expect(q.feeBps).toBe(0);
    expect(q.feeAmount).toBe("0");
    expect(q.payeeAmount).toBe("1000000000000000000");
  });

  it("computes 1% fee from on-chain feeBps", async () => {
    const q = await getFeeQuote("1000000000000000000", { deploymentNetwork: "atlantic" });
    expect(q.feeBps).toBe(100);
    expect(q.feeAmount).toBe("10000000000000000");
    expect(q.payeeAmount).toBe("990000000000000000");
  });
});
