# AgentRegistry

On-chain allowlist of agents permitted to participate in settlements. Supports payer-sponsored onboarding.

**Source:** `contracts/AgentRegistry.sol`

## Roles

| Role | Capabilities |
|------|--------------|
| **Owner** | `register`, `remove` any agent |
| **Registered payer** | `registerRecipient`, `registerRecipients` for new payees |

## Public API

| Function | Access | Description |
|----------|--------|-------------|
| `register(agent)` | owner | Add agent (idempotent) |
| `registerRecipient(agent)` | registered caller | Sponsor one payee |
| `registerRecipients(agents[])` | registered caller | Batch sponsor (skips already registered) |
| `remove(agent)` | owner | Remove agent |
| `requireRegistered(agent)` | view | Reverts if not registered |
| `isRegistered(agent)` | view | Boolean |

## Reverts

- `"not owner"` — owner-only functions
- `"sponsor not registered"` — onboarding without registered sponsor
- `"zero address"` — invalid agent address
- `"agent not registered"` — `requireRegistered` failure

## Events

| Event | When |
|-------|------|
| `AgentRegistered` | Agent added |
| `AgentRemoved` | Agent removed |
| `AgentOnboardedBy` | Sponsor onboarded payee |

## SDK integration

- Preflight check: `payee_registered`, `payer_registered`
- `registerRecipients` in `src/internal/onboard/recipients.ts`
- `autoOnboardRecipients` on execute

## Related tests

`test/contracts/AgentRegistry.test.cjs` — 6 tests

## Related source

- `src/internal/preflight/onboarding.ts`
- `src/internal/onboard/recipients.ts`
