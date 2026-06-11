# Contract Deploy and Verify

> Deploy your own stack for localhost. Atlantic testnet addresses are pre-deployed in `assets/deployments.json`.

---

## Pre-checks

```bash
cast wallet address --private-key $PRIVATE_KEY
cast balance $DEPLOYER --rpc-url $RPC --ether
```

---

## Deploy Settlement Stack (Hardhat — repo default)

From repo root:

```bash
npm install
cp .env.example .env   # set PRIVATE_KEY
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
