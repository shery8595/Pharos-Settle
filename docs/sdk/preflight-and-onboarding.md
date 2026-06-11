# Preflight and onboarding

## Preflight

**Function:** `preflight(input, config)` from `steps.ts`

### Checks

| Name | Pass condition |
|------|----------------|
| `payer_registered` | `agentA` in AgentRegistry |
| `payee_registered` | `agentB` in AgentRegistry |
| `token_allowed` | Token in TokenAllowlist |
| `payer_balance` | balance ≥ amount |
| `payer_allowance` | allowance to DealEscrow ≥ amount |

### Output

```typescript
{
  ready: boolean;           // all checks passed
  checks: CheckResult[];
  preflightHash: string;    // stored on-chain with deal
}
```

### workHash

`workHash(description) = keccak256(description)` — binds deal to work description.

### Preflight hash

`computePreflightHash(input, checks)` — canonical JSON (sorted keys, checks sorted by `name`); changes when any check result changes.

`verifyPreflightHash(onChainHash, input, checks)` — off-chain audit helper. Contracts store `preflightHash` at fund time but do **not** enforce it (Phase 1); integrators re-run `preflight` and compare.

## Onboarding helpers

**Module:** `src/internal/preflight/onboarding.ts`

| Function | Purpose |
|----------|---------|
| `onlyPayeeNeedsOnboarding(checks)` | Only `payee_registered` failed |
| `canProceedWithOnboarding(checks)` | Safe to onboard then proceed |
| `unregisteredPayeesFromJobs(jobs)` | Deduped payee addresses from batch |

## registerRecipients

**Function:** `registerRecipients(addresses, config)`

1. Filter already-registered (unless mock)
2. Payer signs `registerRecipients` on AgentRegistry
3. Returns `{ registered, alreadyRegistered, registerTx }`

### autoOnboardRecipients

On `executeTrustedSettlement`, when preflight fails only due to payee:

```typescript
const ensured = await ensureRecipientsOnboarded(input, config, pf);
pf = ensured.pf;  // re-preflight after onboard
```

## Batch preflight

`executeBatchSettlement` runs one preflight on `jobs[0]` plus:

- Cumulative allowance check for `sum(amounts)`
- All payees registered (or batch onboard if `autoOnboardRecipients`)

## Mock preflight

`mock: true` uses `mockRegistry` — pre-registered demo addresses without RPC.

## Related tests

- `test/unit/onboarding.vitest.ts`
- `test/unit/preflightHash.vitest.ts`
- `test/contracts/AgentRegistry.test.cjs`

## Related source

- `src/internal/preflight/index.ts`
- `src/internal/onboard/recipients.ts`
