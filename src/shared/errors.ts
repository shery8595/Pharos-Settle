import type { CheckResult } from "./schemas.js";

export function check(name: string, passed: boolean, reason?: string): CheckResult {
  return { name, passed, reason: passed ? undefined : reason };
}

export function allPassed(checks: CheckResult[]): boolean {
  return checks.every((c) => c.passed);
}
