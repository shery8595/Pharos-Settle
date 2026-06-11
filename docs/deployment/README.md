# Deployment

## Networks

| Network | Chain ID | Config key | Artifact |
|---------|----------|------------|----------|
| Hardhat in-process | 31337 | (default test) | `deployments/localhost.json` (tests) |
| localhost | 31337 | `localhost` | `deployments/localhost.json` |
| Pharos Atlantic | 688689 | `pharos` / `atlantic` | `deployments/atlantic.json` |

## Quick commands

| Command | Network | Description |
|---------|---------|-------------|
| `npm run deploy:local` | localhost:8545 | Hardhat deploy script |
| `npm run deploy:pharos` | Atlantic | viem deploy |
| `npm run seed:local` | localhost | Register agents, allow tokens |
| `npm run seed:pharos` | Atlantic | Same for live testnet |
| `npm run e2e:local` | localhost | deploy + seed + demo |

## Documentation

- [Atlantic](atlantic.md)
- [Local Hardhat](local-hardhat.md)
- [Scripts](scripts.md)

## Post-deploy

1. Verify `deployments/{network}.json`
2. Run `seed:*` for registry + allowlist
3. `npm run gates:atlantic` — validation gates (Atlantic)

## Related docs

- [Getting started → Atlantic](../getting-started/quickstart-atlantic.md)
- [Contracts](../contracts/README.md)
