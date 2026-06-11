# Glossary

| Term | Definition |
|------|------------|
| **Agent** | An Ethereum address registered in `AgentRegistry` that can participate in settlements as payer or payee. |
| **Pharos Settle Skill** | Standardized skill module at `skills/trusted-agent-settlement/`: Stripe Checkout for AI agents on Pharos — ghost protection, **15 MCP tools**, SALI FastPay. |
| **Dual-ghost protection** | Umbrella term for both safety nets: ghost payee (payer reclaims) + ghost payer (payee auto-release claim). See [WHATS-NOVEL.md](WHATS-NOVEL.md). |
| **Ghost protection** | Same as dual-ghost protection — Pharos Settle's core promise for agent-to-agent hiring. |
| **preflightHash** | Deterministic hash of simulate/preflight checks, stored on-chain when the deal is funded — binds funded terms to dry-run. |
| **SALI FastPay** | Batch agent payroll mode (`batchMode: saliFast`): one payer, many worker agents, parallel fund+claim on Pharos Atlantic (`maxParallelInBlock`). |
| **Atlantic** | Pharos Atlantic testnet (chain ID `688689`). Primary deployment target. |
| **Auto-release** | Hybrid path where payee claims after `disputeWindow` seconds once delivery is submitted, without payer attestation (ghost payer scenario). |
| **Batch settlement** | N-deal payments via `executeBatchSettlement` or split MCP tools. Modes: `saliFast` (fund+claim) or `hybridWork` (full 4-phase). Uses explicit nonces for SALI parallel execution on Atlantic. |
| **Cooperative mode** | SDK mode: fund → deliver → attest → claim. Default for paying for completed work. |
| **Deal** | An escrow record in `DealEscrow` identified by `dealId`. Holds payer, payee, token, amount, deadline, and hybrid state. |
| **DealState** | On-chain enum: `Created`, `Funded`, `Accepted`, `Released`, `Refunded`. |
| **Dispute window** | Seconds after delivery submission before payee can claim without payer attestation (`disputeWindow` on hybrid deals). |
| **Fee quote** | Off-chain estimate: `feeBps`, `feeAmount`, `payeeAmount` for a given gross amount. Fees apply on successful `claim` only. |
| **Ghost payer** | Payer funds and payee delivers, but payer never attests; payee waits for auto-release then claims. |
| **Ghost payee** | Payee never delivers; payer reclaims after `deadline` (TTL) via `reclaim`. |
| **Hybrid release** | Work-based release: requires delivery attestation and/or payer attestation before claim (`requiresHybridRelease: true`). |
| **Legacy fund→claim** | Non-hybrid deal: `fundAndAccept` with `requiresHybridRelease: false`; payee can claim immediately after accept. |
| **nextAction** | SDK hint for the single next step: `fund`, `deliver`, `attest`, `claim`, `reclaim`, `wait`, `done`, `onboardRecipient`. |
| **Onboarding** | Registered payer sponsors unregistered payee via `registerRecipient` / `registerRecipients`. |
| **Preflight** | Read-only checks before spending gas: registry, allowlist, balance, allowance. Produces `preflightHash`. |
| **Preflight hash** | Deterministic hash of input + check results, stored on-chain with each deal. |
| **Proof hash** | `keccak256(claimTxHash:amount:payee)` — binds settlement proof to claim transaction. |
| **Prove tier** | Post-settlement verification: `receipt` (default, parse Transfer log) or `spv` (Pharos SPV). |
| **Safety net mode** | SDK mode focused on `reclaimTrustedSettlement` when payee never delivered. |
| **SALI** | Pharos parallel transaction execution; batch settlements use explicit nonces to land multiple txs in the same block. |
| **SettlementRouter** | Single on-chain entrypoint; enforces registry/allowlist then delegates to `DealEscrow`. |
| **Simulate-first** | Call `simulateTrustedSettlement` before `executeTrustedSettlement` to get fee quote and readiness. |
| **TTL** | `ttlSeconds` — deal deadline from funding; after expiry payer can reclaim if no delivery. |
| **Work hash** | `keccak256(workDescription)` stored on-chain to bind payment to described work. |
