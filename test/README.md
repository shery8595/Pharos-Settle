# Tests

**103 tests** (37 Hardhat + 66 Vitest). Full documentation: **[docs/tests/README.md](../docs/tests/README.md)**

```bash
npm test                  # full suite (Hardhat + Vitest)
npm run test:contracts    # Hardhat contracts only
npm run test:integration  # SDK integration only
npm run test:unit         # Vitest excluding Atlantic
npm run test:atlantic     # Atlantic RPC smoke only
```
