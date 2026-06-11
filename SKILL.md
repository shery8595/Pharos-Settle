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

## Default pre-checks (every write)

Run these **before** any on-chain write. Do **not** ask about MCP global/local or demo/live unless the user explicitly chose MCP.

| # | Check | Command |
|---|-------|---------|
| 1 | RPC reachable | `cast chain-id --rpc-url $RPC` → `688689` |
| 2 | Private key set | `cast wallet address --private-key $PRIVATE_KEY` |
| 3 | Contracts deployed | `assets/deployments.json` has non-zero `settlementRouter` |
| 4 | Balance sufficient | `cast balance $DEPLOYER --rpc-url $RPC --ether` |

Then execute. Pass `--private-key $PRIVATE_KEY` and `--rpc-url $RPC` on **every** `cast send` (Foundry does not auto-read env).

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

### Optional path — MCP tools

Use only when the user **explicitly** wants MCP, or `pharos-settle` MCP tools are already connected in the session.

| User need | MCP tool | Instructions |
|-----------|----------|--------------|
| Doctor / readiness | `get_agent_readiness` | → [references/mcp.md](references/mcp.md) |
| Simulate before fund | `simulate_trusted_settlement` | → [references/settlement.md](references/settlement.md) Method B |
| Fund deal | `fund_deal` | → [references/settlement.md#fund-deal](references/settlement.md) |
| Deliver / attest / claim | `submit_delivery`, `attest_release`, `complete_claim_for_deal` | → [references/settlement.md](references/settlement.md) |
| Poll next step | `get_settlement_status` | → [references/mcp.md](references/mcp.md) |
| Full demo flow | `execute_trusted_settlement` | → [references/mcp.md](references/mcp.md) |
| Batch payroll | `fund_deals_batch` → `complete_claims_batch` | → [references/mcp.md](references/mcp.md) |

**MCP setup (optional):** project vs global MCP, demo vs live — only when user chooses MCP. See [references/mcp.md](references/mcp.md) and `AGENTS.md` § MCP (optional).

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
