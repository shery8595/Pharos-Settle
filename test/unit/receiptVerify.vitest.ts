import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Address, Hash, TransactionReceipt } from "viem";
import { encodeEventTopics, encodeAbiParameters, parseAbiParameters } from "viem";

const waitForTransactionReceipt = vi.fn();

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({ waitForTransactionReceipt })),
  };
});

import { verifySettlementReceipt } from "../../src/internal/prove/receiptVerify.js";

describe("verifySettlementReceipt", () => {
  const token = "0x1111111111111111111111111111111111111111" as Address;
  const payee = "0x2222222222222222222222222222222222222222" as Address;
  const escrow = "0x3333333333333333333333333333333333333333" as Address;
  const amount = 1000000000000000000n;
  const claimTx = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hash;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies transfer log in receipt", async () => {
    const topics = encodeEventTopics({
      abi: [
        {
          type: "event",
          name: "Transfer",
          inputs: [
            { name: "from", type: "address", indexed: true },
            { name: "to", type: "address", indexed: true },
            { name: "value", type: "uint256", indexed: false },
          ],
        },
      ],
      eventName: "Transfer",
      args: { from: escrow, to: payee },
    });
    const data = encodeAbiParameters(parseAbiParameters("uint256"), [amount]);

    const receipt = {
      blockNumber: 42n,
      logs: [{ address: token, topics, data }],
    } as unknown as TransactionReceipt;

    waitForTransactionReceipt.mockResolvedValue(receipt);

    const result = await verifySettlementReceipt({
      token,
      payee,
      escrowAddress: escrow,
      amount,
      claimTxHash: claimTx,
    });

    expect(result.verified).toBe(true);
    expect(result.method).toBe("receipt");
    expect(result.blockNumber).toBe("42");
  });

  it("fails when transfer not found", async () => {
    waitForTransactionReceipt.mockResolvedValue({ blockNumber: 1n, logs: [] });

    const result = await verifySettlementReceipt({
      token,
      payee,
      escrowAddress: escrow,
      amount,
      claimTxHash: claimTx,
    });

    expect(result.verified).toBe(false);
    expect(result.reason).toContain("Transfer event");
  });
});
