# Demo video script (~90s)

**Hook (say out loud):** *"Pharos Settle is Stripe Checkout for AI agents on Pharos — **dual-ghost protection** when agents hire each other: payee ghosts → reclaim; junk delivery → reject; payer ghosts → payee still paid."*

Full novelty story: [WHATS-NOVEL.md](WHATS-NOVEL.md)

---

## Segment 1 — Hook (10s)

Show the dual-ghost table on screen:

| Who ghosts? | Outcome |
|-------------|---------|
| Payee never delivers | Payer **reclaims** |
| Payee submits junk | Payer **rejects** during dispute window |
| Payer never attests | Payee **still paid** |
| Both cooperate | Instant settlement |

---

## Segment 2 — Ghost payee (20s)

```bash
npm run demo:ghost-payee:simulate
```

Narrate: *"Worker never delivered — payer reclaims after TTL."* Highlight `nextAction: reclaim` and `reclaim_trusted_settlement`.

Live (optional): `npm run demo:ghost-payee` → PharosScan refund tx.

---

## Segment 3 — Ghost payer (20s)

```bash
npm run demo:ghost-payer:simulate
```

Narrate: *"Payer ghosted after delivery — payee still gets paid via auto-release."*

---

## Segment 4 — Cooperative MCP (20s)

Show agent transcript on screen while MCP runs:

```
User:     Pay 1 TEST to the research agent if it delivers the market report.
Pharos Settle: Preflight passed. nextAction: fund.
Research: Delivery submitted.
Pharos Settle: Claim complete. dealId=42 · PharosScan (confirmed)
```

Cursor MCP → **17 tools** → `simulate_trusted_settlement` → `fund_deal` → claim.

Optional beat: *"Invalid delivery? Payer calls `reject_delivery` during dispute window."*

---

## Segment 5 — SALI FastPay (15s)

```bash
npm run demo:batch:simulate
# or live: npm run demo:batch
```

Narrate: *"Batch agent payroll — N workers, `maxParallelInBlock` on Pharos."*

---

## Close (15s)

- Live on **Pharos Atlantic** — [deployments/atlantic.json](../deployments/atlantic.json)
- **147 tests** green
- **Skill** + **17 MCP tools**
- Threat model: [security/threat-model.md](security/threat-model.md)
- Link: [SUBMISSION.md](../SUBMISSION.md)

Record locally; paste URL in root [SUBMISSION.md](../SUBMISSION.md) DoraHacks section.
