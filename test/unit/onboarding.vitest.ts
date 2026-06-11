import { describe, it, expect } from "vitest";
import {
  onlyPayeeNeedsOnboarding,
  canProceedWithOnboarding,
  unregisteredPayeesFromJobs,
} from "../../src/internal/preflight/onboarding.js";
import type { CheckResult } from "../../src/shared/schemas.js";

describe("onboarding helpers", () => {
  it("onlyPayeeNeedsOnboarding when only agent_b fails", () => {
    const checks: CheckResult[] = [
      { name: "agent_a_registered", passed: true },
      { name: "agent_b_registered", passed: false, reason: "agent B not registered" },
    ];
    expect(onlyPayeeNeedsOnboarding(checks)).toBe(true);
    expect(canProceedWithOnboarding(checks)).toBe(true);
  });

  it("not only payee when payer also fails", () => {
    const checks: CheckResult[] = [
      { name: "agent_a_registered", passed: false },
      { name: "agent_b_registered", passed: false },
    ];
    expect(onlyPayeeNeedsOnboarding(checks)).toBe(false);
  });

  it("unregisteredPayeesFromJobs dedupes", () => {
    const jobs = [
      { agentB: "0x2222222222222222222222222222222222222222" },
      { agentB: "0x2222222222222222222222222222222222222222" },
      { agentB: "0x3333333333333333333333333333333333333333" },
    ];
    expect(unregisteredPayeesFromJobs(jobs)).toHaveLength(2);
  });
});
