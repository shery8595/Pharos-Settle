import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isRateLimitError,
  resetRpcRateLimiter,
  scheduleRpc,
  withRpcRetry,
} from "../../src/shared/rpc.js";

describe("rpc helpers", () => {
  beforeEach(() => {
    resetRpcRateLimiter();
  });

  it("isRateLimitError detects rate limit messages", () => {
    expect(isRateLimitError(new Error("cu limit exceeded"))).toBe(true);
    expect(isRateLimitError(new Error("Request too fast per second"))).toBe(true);
    expect(isRateLimitError(new Error("nonce too low"))).toBe(false);
  });

  it("withRpcRetry succeeds after transient failure", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("cu limit exceeded"))
      .mockResolvedValueOnce("ok");

    const p = withRpcRetry("test", fn, 3, 10);
    await vi.advanceTimersByTimeAsync(20);
    await expect(p).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("scheduleRpc serializes concurrent calls", async () => {
    vi.useFakeTimers();
    process.env.RPC_MIN_INTERVAL_MS = "100";
    resetRpcRateLimiter();

    const order: number[] = [];
    const first = scheduleRpc(async () => {
      order.push(1);
      await new Promise((r) => setTimeout(r, 50));
      return "a";
    });
    const second = scheduleRpc(async () => {
      order.push(2);
      return "b";
    });

    await vi.advanceTimersByTimeAsync(200);
    await expect(Promise.all([first, second])).resolves.toEqual(["a", "b"]);
    expect(order).toEqual([1, 2]);
    vi.useRealTimers();
    delete process.env.RPC_MIN_INTERVAL_MS;
  });
});
