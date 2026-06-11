import type { SettlementConfig, TrustedSettlementInput } from "../../shared/schemas.js";
import type { PreflightResult } from "../preflight/index.js";
import { preflight } from "../preflight/index.js";
import { onlyPayeeNeedsOnboarding, unregisteredPayeesFromJobs } from "../preflight/onboarding.js";
import { registerRecipients } from "./recipients.js";
import type { RegisterRecipientsOutput } from "../../shared/schemas.js";

export async function ensureRecipientsOnboarded(
  input: TrustedSettlementInput,
  config: SettlementConfig,
  pf: PreflightResult
): Promise<{ pf: PreflightResult; onboard?: RegisterRecipientsOutput }> {
  if (pf.ready || !config.autoOnboardRecipients) return { pf };
  if (!onlyPayeeNeedsOnboarding(pf.checks)) return { pf };

  const onboard = await registerRecipients([input.agentB], config);
  const refreshed = await preflight(input, config);
  return { pf: refreshed, onboard };
}

export async function ensureBatchRecipientsOnboarded(
  jobs: TrustedSettlementInput[],
  config: SettlementConfig,
  pf: PreflightResult
): Promise<{ pf: PreflightResult; onboard?: RegisterRecipientsOutput }> {
  if (pf.ready || !config.autoOnboardRecipients) return { pf };
  if (!onlyPayeeNeedsOnboarding(pf.checks)) return { pf };

  const payees = unregisteredPayeesFromJobs(jobs);
  const onboard = await registerRecipients(payees, config);
  const refreshed = await preflight(jobs[0]!, config);
  return { pf: refreshed, onboard };
}
