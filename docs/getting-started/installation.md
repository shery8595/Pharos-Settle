# Installation

## Prerequisites

- Node.js 18+ (20+ recommended)
- npm
- Git

## Clone and install

```bash
git clone <repo-url> pharos
cd pharos
npm install
```

**Atlantic demo:** Both demo wallets are pre-registered on Atlantic — clone, add keys to `.env`, run `npm run demo:pharos`. See [Atlantic quickstart](quickstart-atlantic.md).

## Environment

```bash
cp .env.example .env
```

Edit `.env` with your keys. See [Environment variables](environment.md) for full reference.

## Build

The SDK is TypeScript compiled to `dist/`:

```bash
npm run build
```

`npm test` runs `build` automatically before Hardhat and Vitest.

## Verify installation

```bash
npm run test:unit
```

For live Atlantic smoke (requires `.env` + `deployments/atlantic.json`):

```bash
npm run test:atlantic
```

## Package exports

| Import | Path |
|--------|------|
| Main SDK | `pharos-trusted-settlement` → `dist/trustedAgentSettlement.js` |
| Composable steps | `pharos-trusted-settlement/steps` → `dist/steps.js` |

## Next steps

- [Local quickstart](quickstart-local.md) — Hardhat deploy + simulate demo
- [Atlantic quickstart](quickstart-atlantic.md) — live testnet deploy + demo
- [SDK documentation](../sdk/README.md)
