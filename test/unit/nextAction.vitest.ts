import { describe, it, expect } from "vitest";
import {
  computeNextAction,
  computeReclaimable,
  computeRejectEligible,
  type DealSnapshot,
} from "../../src/internal/commerce/nextAction.js";

function snap(overrides: Partial<DealSnapshot>): DealSnapshot {
  return {
    state: 2,
    deadline: 9999999999n,
    requiresHybridRelease: false,
    deliverySubmittedAt: 0n,
    disputeWindow: 3600n,
    payerAttested: false,
    canClaim: true,
    ...overrides,
  };
}

describe("computeNextAction", () => {
  it("returns done for Released and Refunded", () => {
    expect(computeNextAction(snap({ state: 3 }), 1000)).toBe("done");
    expect(computeNextAction(snap({ state: 4 }), 1000)).toBe("done");
  });

  it("returns fund for Created and Funded", () => {
    expect(computeNextAction(snap({ state: 0 }), 1000)).toBe("fund");
    expect(computeNextAction(snap({ state: 1 }), 1000)).toBe("fund");
  });

  it("legacy Accepted returns claim when canClaim", () => {
    expect(computeNextAction(snap({ requiresHybridRelease: false, canClaim: true }), 1000)).toBe(
      "claim"
    );
    expect(computeNextAction(snap({ requiresHybridRelease: false, canClaim: false }), 1000)).toBe(
      "wait"
    );
  });

  it("hybrid deliver when no delivery", () => {
    expect(
      computeNextAction(snap({ requiresHybridRelease: true, deliverySubmittedAt: 0n }), 1000)
    ).toBe("deliver");
  });

  it("hybrid claim after payer attested", () => {
    expect(
      computeNextAction(
        snap({ requiresHybridRelease: true, deliverySubmittedAt: 100n, payerAttested: true, canClaim: true }),
        1000
      )
    ).toBe("claim");
  });

  it("hybrid attest during dispute window", () => {
    expect(
      computeNextAction(
        snap({
          requiresHybridRelease: true,
          deliverySubmittedAt: 1000n,
          disputeWindow: 3600n,
          canClaim: false,
        }),
        2000
      )
    ).toBe("attest");
  });
});

describe("computeReclaimable", () => {
  it("false when released or refunded", () => {
    expect(computeReclaimable(snap({ state: 3 }), 2000)).toBe(false);
    expect(computeReclaimable(snap({ state: 4 }), 2000)).toBe(false);
  });

  it("false when delivery submitted", () => {
    expect(computeReclaimable(snap({ deliverySubmittedAt: 1n, deadline: 100n }), 200)).toBe(false);
  });

  it("true after deadline with no delivery", () => {
    expect(computeReclaimable(snap({ deadline: 100n }), 200)).toBe(true);
  });
});

describe("computeRejectEligible", () => {
  it("true during dispute window after delivery", () => {
    expect(
      computeRejectEligible(
        snap({
          requiresHybridRelease: true,
          deliverySubmittedAt: 1000n,
          disputeWindow: 3600n,
        }),
        2000
      )
    ).toBe(true);
  });

  it("false when no delivery", () => {
    expect(
      computeRejectEligible(snap({ requiresHybridRelease: true, deliverySubmittedAt: 0n }), 2000)
    ).toBe(false);
  });

  it("false after dispute window elapsed", () => {
    expect(
      computeRejectEligible(
        snap({
          requiresHybridRelease: true,
          deliverySubmittedAt: 1000n,
          disputeWindow: 3600n,
        }),
        5000
      )
    ).toBe(false);
  });

  it("false when payer attested", () => {
    expect(
      computeRejectEligible(
        snap({
          requiresHybridRelease: true,
          deliverySubmittedAt: 1000n,
          payerAttested: true,
        }),
        2000
      )
    ).toBe(false);
  });
});
