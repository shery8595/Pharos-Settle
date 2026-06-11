import type { CheckResult } from "../../shared/schemas.js";

const ONBOARDABLE_FAILURES = new Set(["agent_b_registered"]);

export function onlyPayeeNeedsOnboarding(checks: CheckResult[]): boolean {
  const failed = checks.filter((c) => !c.passed);
  return failed.length > 0 && failed.every((c) => ONBOARDABLE_FAILURES.has(c.name));
}

export function canProceedWithOnboarding(checks: CheckResult[]): boolean {
  return checks.every((c) => c.passed || ONBOARDABLE_FAILURES.has(c.name));
}

export function unregisteredPayeesFromJobs(jobs: { agentB: string }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const job of jobs) {
    const addr = job.agentB.toLowerCase();
    if (!seen.has(addr)) {
      seen.add(addr);
      out.push(job.agentB);
    }
  }
  return out;
}
