---
name: trusted-agent-settlement
description: >
  Stripe Checkout for AI agents on Pharos — agent-to-agent work settlement with ghost protection.
  Cast-first (Foundry), MCP-supported. Triggers on "pharos settle", "pay agent on pharos",
  "agent commerce", "safe agent payment", "agent escrow", "ghost protection", "batch agent payroll".
---

# Pharos Settle — Skill Engine

**Stripe Checkout for AI agents on Pharos** — escrow with ghost protection when agents hire each other.

> Payee ghosts → payer reclaims. Payer ghosts → payee still gets paid. Both cooperate → instant settlement.

## Prerequisites

1. **Foundry** — `cast --version` and `forge --version` must work. Install: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
2. **Wallet** — `export PRIVATE_KEY=0x...` (never commit to git)
3. **Convenience vars:**

```bash
export RPC=$(jq -r .atlantic.rpcUrl assets/networks.json)
export DEPLOYER=$(cast wallet address --private-key $PRIVATE_KEY)
```

## Network and contracts

| File | Contents |
|------|----------|
| `assets/networks.json` | RPC, chainId, explorer URLs |
| `assets/tokens.json` | Allowed ERC-20 addresses + decimals |
| `assets/deployments.json` | SettlementRouter, DealEscrow, registries (Atlantic) |
| `assets/settlement/` | Solidity contract templates |

## Default pre-checks (tier 1 cast)

Run **#0 first** on any cast path. Do **not** ask about MCP global/local or demo/live unless escalation requires it.

| # | Check | Command |
|---|-------|---------|
| 0 | Foundry installed | `cast --version` (clone does **not** install Foundry) |
| 1 | RPC reachable | `cast chain-id --rpc-url $RPC` → `688689` |
| 2 | Private key set | `cast wallet address --private-key $PRIVATE_KEY` |
| 3 | Contracts deployed | `assets/deployments.json` has non-zero `settlementRouter` |
| 4 | Balance sufficient | `cast balance $DEPLOYER --rpc-url $RPC --ether` |

### If pre-check #0 fails (Foundry not installed)

**Stop** the cast path. Do not auto-install Foundry (needs user approval). Offer choices — see [references/execution.md#foundry-gate](references/execution.md#foundry-gate):

- **A)** Install Foundry, then retry cast  
- **B)** Tier 2 npm: `npm run pay:once` (reads `.env`)  
- **C)** Tier 3 MCP if `pharos-settle` is connected  
- **D)** Mock: `npm run demo:judge`  

If user said **“cast only”**, do not silently switch tiers — require Foundry install first.

Then execute. Pass `--private-key $PRIVATE_KEY` and `--rpc-url $RPC` on **every** `cast send` (Foundry does not auto-read env).

### If pre-check #2 fails (no key for writes)

**Stop** before any `cast send`. Prompt the user — do not proceed with live settlement.

Reads (`cast balance`, `cast call`) do **not** need a key.

**If the user wants live settlement:**

1. `cp .env.example .env` and set `PRIVATE_KEY` (66+ char hex)
2. For payee deliver/claim steps: `AGENT_B_PRIVATE_KEY` in `.env`
3. **Export for cast** (Foundry does not load `.env`): `export PRIVATE_KEY=0x...`
4. Fund wallet with PHRS on Atlantic
5. Re-run pre-check #2: `cast wallet address --private-key $PRIVATE_KEY`

**When user says “keys are set, proceed”:** load `.env` into the shell (cast cannot read the file alone), re-run pre-check #2, **stay on cast** — do not switch to npm/MCP. See [references/execution.md#when-user-confirms-keys-are-set--stay-on-cast](references/execution.md#when-user-confirms-keys-are-set--stay-on-cast).

**If the user wants mock / no keys:** escalate per [references/execution.md](references/execution.md) — `npm run demo:judge` or MCP `mock: true`. Do not ask for keys.

Full key gate: [references/execution.md#cast-key-gate](references/execution.md#cast-key-gate)

## Execution Priority Order

1. **cast** — atomic on-chain (default)
2. **npm scripts** — SDK shortcuts when cast cannot express the workflow
3. **MCP** — orchestration when npm is insufficient and tools are connected
4. **setup guidance** — if nothing above is available

Full matrix: [references/execution.md](references/execution.md)

**Rule:** If cast cannot safely or fully express the task → escalate upward. Agents decide; MCP is never auto-enabled.

## Capability Index

### Preferred path — Foundry (cast / forge)

| User need | Capability | Instructions |
|-----------|------------|--------------|
| Check PHRS / token balance | `cast balance` / `cast call` | → [references/query.md](references/query.md) |
| Read deal state / can claim | `cast call getDeal` / `canClaim` | → [references/query.md](references/query.md) |
| Approve token / register payee | `cast send` | → [references/transaction.md](references/transaction.md) |
| Pay agent / fund escrow | `cast send fundAndAcceptHybrid` | → [references/settlement.md#settlement-operations-pharos-settle](references/settlement.md) |
| Deliver work | `cast send submitDelivery` | → [references/settlement.md#submit-delivery](references/settlement.md) |
| Attest release | `cast send attestRelease` | → [references/settlement.md#attest-release](references/settlement.md) |
| Claim payment | `cast send claim` | → [references/settlement.md#claim-complete-settlement](references/settlement.md) |
| Reclaim (payee ghosted) | `cast send reclaim` | → [references/settlement.md#reclaim-ghost-payee](references/settlement.md) |
| Reject junk delivery | `cast send rejectDelivery` | → [references/settlement.md#reject-delivery](references/settlement.md) |
| Batch agent payroll | cast loop or CLI | → [references/settlement.md#batch-payroll-sali-fastpay](references/settlement.md) |
| Deploy own contracts | `npm run deploy:pharos` | → [references/contract.md](references/contract.md) |
| Generate interaction script | templates | → [references/script-gen.md](references/script-gen.md) |
| Errors | global table | → [references/errors.md](references/errors.md) |
| Escalation rules (cast → npm → MCP) | progressive resolution | → [references/execution.md](references/execution.md) |

### Tier 2 — npm scripts (SDK CLI)

Use when cast cannot express the workflow, or Foundry is not installed. Scripts call `pharos-trusted-settlement` in `src/` (same library MCP uses).

| User need | npm script | Notes |
|-----------|------------|-------|
| Mock demo (no keys) | `demo:judge` | readiness + simulate |
| Doctor | `agent:doctor` / `agent:doctor:mock` | env + registry checks |
| Simulate before fund | `pay:once --simulate` | preflight + fee quote |
| Pay agent once | `pay:once` | reads `.env`; both keys if needed |
| Batch fund / claim | `batch:fund` → `batch:claim` | manifest handoff |
| Demo batch (both keys) | `pay:batch` | demo only — not production split |

Full tier list: [references/execution.md](references/execution.md).

### Optional path — MCP tools (tier 3)

Use when cast/npm cannot express the workflow, the user requests MCP, or `pharos-settle` MCP tools are already connected in the session.

| User need | MCP tool | Instructions |
|-----------|----------|--------------|
| Doctor / readiness | `get_agent_readiness` | → [references/mcp.md](references/mcp.md) |
| Simulate before fund | `simulate_trusted_settlement` | → [references/settlement.md](references/settlement.md) Method B |
| Fund deal | `fund_deal` | → [references/settlement.md#fund-deal](references/settlement.md) |
| Deliver / attest / claim | `submit_delivery`, `attest_release`, `complete_claim_for_deal` | → [references/settlement.md](references/settlement.md) |
| Poll next step | `get_settlement_status` | → [references/mcp.md](references/mcp.md) |
| Full demo flow | `execute_trusted_settlement` | → [references/mcp.md](references/mcp.md) |
| Batch payroll | `fund_deals_batch` → `complete_claims_batch` | → [references/mcp.md](references/mcp.md) |

**MCP setup (tier 4):** project vs global MCP, demo vs live — only when tier 3 is required. See [references/mcp.md](references/mcp.md) and `AGENTS.md` § MCP (tier 3).

## Ghost protection (summary)

| Who ghosts? | Outcome |
|-------------|---------|
| Payee never delivers | Payer **reclaims** |
| Payee submits junk | Payer **rejects** (auditable reason) |
| Payer never attests | Payee **auto-claims** after dispute window |
| Both cooperate | Fund → deliver → attest → claim |

## Security

- Never hardcode `$PRIVATE_KEY` in scripts or chat logs.
- Never create ad-hoc payment scripts — use cast, MCP, or `npm run pay:once`.
- Simulate before fund (`cast estimate` or `simulate_trusted_settlement`).

## Implementation (repo)

| Layer | Path |
|-------|------|
| This skill | `SKILL.md`, `assets/`, `references/` |
| MCP server | `mcp/` — `npm run mcp` |
| TypeScript SDK | `pharos-trusted-settlement` — `src/` |
| Human docs | `docs/` |
| Live addresses | `deployments/atlantic.json` (synced to `assets/` via `npm run skill:sync-assets`) |

## Quick start

```bash
npm install && cp .env.example .env
export PRIVATE_KEY=0x...
export RPC=https://atlantic.dplabs-internal.com

# Cast-first smoke
cast balance $(cast wallet address --private-key $PRIVATE_KEY) --rpc-url $RPC --ether

# Or MCP demo (optional)
npm run demo:judge
```
