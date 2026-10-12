# REALWORLD Layer 6.0 — Working Capital & Cash Runway Planning

**Build ID:** `RW-LAYER-6.0 · Working Capital & Cash Runway Planning · 2026-10-13`

## Purpose

Layer 6 adds a read-only working-capital estimate and scenario-based cash runway planner to the Finance view. It builds on Layer 5.0's procurement planner and Layer 4.0's save-import validation. It does not change accounting entries, cash, purchase orders, loans, staffing, or save format.

## New behavior

- **Operating working-capital estimate:** available cash + receivables + stocked-goods inventory at cost + supplier advances, less selected current operating obligations (supplier payable, rent, utilities, payroll, tax reserve, overdraft interest, term-loan interest payable, late fees, and bank overdraft).
- **Explicit exclusions:** fixed assets, rental deposits, future term-loan principal, and the `loanArrears` memo. The memo overlaps amounts recorded in the ledger and is excluded to avoid double-counting. This simplified indicator is not represented as a formal balance-sheet subtotal or accounting standard.
- **Recent cash-flow trend:** average net cash change from up to the last eight closed cash-flow periods. When no closed period exists, the projection holds current cash flat and displays a warning; it does not invent a forecast trend from an incomplete week.
- **Four scenarios:** recent trend; operating inflows reduced by 20%; operating cash outflows increased by 15%; and both downside assumptions together. Stress adjustments are applied to the recent average and held constant through the chosen horizon.
- **Horizon:** 4, 8, or 13 weeks.
- **Reserve threshold:** user-editable nominal-currency amount. The planner identifies the first forecast week below the reserve and shows negative projections without changing actual cash.
- **Read-only preferences:** planner choices are session-level view settings, not part of the company save. They reset for a different company and do not advance save format.

## Model limits

The planner is a simple scenario tool, not a full deterministic replay of the operating engine, a probabilistic forecast, a lender-grade cash-flow model, or financial advice. It does not simulate future random events, capacity limits, new purchase orders, inventory policy responses, hiring, debt applications, owner injections, taxes under actual law, or management action. Sales-downside and cost-pressure assumptions are illustrative stress parameters. A projection below zero is a warning, not a posted overdraft or financial transaction.

The existing supplier delivery reliability/ETA system, save-import preflight, country rules registry, and prior business simulation features are preserved. Save format remains **v8**.

## Local regression

Requires Node.js with built-in `node:test` support. Run:

```bash
node --check regression.test.cjs
node --test regression.test.cjs
```

Layer 6 candidate: **109 tests pass, 0 fail**. Coverage includes first-week no-history behavior, working-capital arithmetic, conservative scenario ordering, reserve breaches, invalid inputs, no mutation of ledgers, session preference reset, and existing regressions.

## Release files

Replace root `index.html`, `regression.test.cjs`, and `README.md` with the package versions. Keep `.github/workflows/realworld-regression.yml` unchanged. Deployment and live browser acceptance must still be checked after commit.
