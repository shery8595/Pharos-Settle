# Demo video script (<3 min)

**Hook (say out loud):** *"Pharos Settle is Stripe Checkout for AI agents on Pharos — ghost protection when agents hire each other."*

1. **Agent transcript (20s):** Show this on screen while MCP runs:
   ```
   User:     Pay 1 TEST to the research agent if it delivers the market report.
   Pharos Settle: Preflight passed. nextAction: fund.
   Research: Delivery submitted.
   Pharos Settle: Claim complete. dealId=42 · PharosScan ✓
   ```
2. **MCP plug-in (25s):** Cursor `mcp.json` → **15 tools** → `simulate_trusted_settlement` → `fund_deal`
3. **Ghost protection (20s):** Table on screen — payee ghosts → reclaim; payer ghosts → payee paid; both → instant
4. **SALI FastPay (25s):** `npm run demo:batch` — "batch agent payroll", `maxParallelInBlock`
5. **Ghost payer demo (15s):** `npm run demo:ghost-payer:simulate`
6. **Close (15s):** Agent economy primitive on Atlantic — 103 tests, live deploy, Skill module

Record locally; link in root [SUBMISSION.md](../SUBMISSION.md).
