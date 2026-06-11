---
name: trusted-agent-settlement
description: Redirect — skill moved to repo root (Skill Engine layout).
---

# Moved

The Pharos Settle skill now lives at the **repo root** (Skill Engine layout):

| Path | Contents |
|------|----------|
| [`../../SKILL.md`](../../SKILL.md) | Agent entry — Capability Index |
| [`../../assets/`](../../assets/) | networks, tokens, deployments, contracts |
| [`../../references/`](../../references/) | cast (tier 1), npm (tier 2), MCP (tier 3) — start with [`execution.md`](../../references/execution.md) |

Run `npm run skill:sync` to copy the bundle to `.cursor/skills/trusted-agent-settlement/`.
