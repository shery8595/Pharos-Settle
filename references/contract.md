# Contract Deploy and Verify

```bash
# --- Environment Setup ---
export RPC=$(jq -r '.atlantic.rpcUrl' assets/networks.json)
export OWNER_PRIVATE_KEY=0xYourOwnerDeployerKey   # privileged — admin/deploy only
export DEPLOYER=$(cast wallet address --private-key $OWNER_PRIVATE_KEY)
export ROUTER=$(jq -r .settlementRouter assets/deployments.json)
export ESCROW=$(jq -r .dealEscrow assets/deployments.json)
export REGISTRY=$(jq -r .agentRegistry assets/deployments.json)
export ALLOWLIST=$(jq -r .tokenAllowlist assets/deployments.json)
# --------------------------
```

> Deploy your own stack for localhost. Atlantic testnet addresses are pre-deployed in `assets/deployments.json`.

> [!IMPORTANT]
> Use `$OWNER_PRIVATE_KEY` only for deploy/verify/admin. Routine agent settlements use `$PAYER_PRIVATE_KEY` / `$PAYEE_PRIVATE_KEY` — see [settlement.md](settlement.md).

---

## Pre-checks

```bash
cast wallet address --private-key $OWNER_PRIVATE_KEY
cast balance $DEPLOYER --rpc-url $RPC --ether
```

---

## Deploy Settlement Stack (Hardhat — repo default)

From repo root:

```bash
npm install
cp .env.example .env   # set PRIVATE_KEY (owner/deployer)
npm run deploy:pharos
npm run seed:pharos
```

Updates `deployments/atlantic.json`. Run `npm run skill:sync-assets` to refresh `assets/deployments.json`.

---

## Verify on Explorer

Wait ~10 seconds after deploy, then:

```bash
forge verify-contract $ROUTER_ADDRESS contracts/SettlementRouter.sol:SettlementRouter \
  --chain-id 688689 \
  --verifier-url https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract \
  --verifier blockscout \
  --constructor-args $(cast abi-encode "constructor(address,address,address)" $REGISTRY $ALLOWLIST $ESCROW)
```

### Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `contract not found` | Indexer lag | `sleep 10` and retry |
| `verification failed` | Source mismatch | Match compiler 0.8.20 + optimizer settings |

---

## Contract Templates

Source copies for agents: `assets/settlement/*.sol`  
Canonical compile target: `contracts/` (same files).
