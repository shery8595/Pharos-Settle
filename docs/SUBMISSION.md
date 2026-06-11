# Hackathon submission

**Judges:** start with **[../JUDGES.md](../JUDGES.md)** (mock demo, no keys). Full submission: **[../SUBMISSION.md](../SUBMISSION.md)**.

That file includes live Atlantic contract addresses (from `deployments/atlantic.json`), Pharos-native highlights, the under-2-minute demo path, and DoraHacks copy-paste fields.

## Checklist (maintainers)

- [x] Pharos Settle Skill module (`skills/trusted-agent-settlement/` — 15 MCP tools in `SKILL.md`)
- [x] Two-mode API + `nextAction` + `feeQuote`
- [x] Protocol-compliant MCP (`npm run mcp`) + [mcp/setup.md](mcp/setup.md)
- [x] Hybrid release: delivery + attest + ghost-payer auto-release
- [x] Protocol fees on success (no fee on reclaim)
- [x] Contracts + tests green — **103 tests** (`npm test`: 37 Hardhat + 66 Vitest)
- [x] Hybrid SALI batch — `saliFast` + `hybridWork` MCP tools + split demo
- [x] Live Atlantic deployment — [`deployments/atlantic.json`](../deployments/atlantic.json)
- [x] Ghost payee reclaim demo (`demo:ghost-payee`, `demo:reclaim` alias)
- [x] Dual-ghost protection documented ([WHATS-NOVEL.md](WHATS-NOVEL.md))

## Demo video

Follow [demo-script.md](demo-script.md). Paste the recording URL in root [SUBMISSION.md](../SUBMISSION.md) when ready.
