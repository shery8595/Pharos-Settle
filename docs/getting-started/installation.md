# Installation

## Prerequisites

- Node.js 18+ (20+ recommended)
- npm
- Git

## Clone and install

```bash
git clone https://github.com/shery8595/Pharos-Settle.git
cd Pharos-Settle
npm run setup
```

`npm run setup` installs dependencies, builds the SDK, creates `.env`, and asks **project/global** MCP mode then **demo/live** run mode — see [MCP modes](../mcp/modes.md). Live mode prompts you to set keys in `.env`.

- **Project (default):** open this folder as IDE workspace root, reload MCP  
- **Global:** setup writes `~/.cursor/mcp.json` (`npm run mcp:install-global`) — reload MCP; use from any workspace

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
