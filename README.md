# REALWORLD — Integrated Business Simulation Core

**Build:** `RW-CORE-1.0 | Integrated Market, Supply Chain & Seasonality · 2026-10-12`

REALWORLD is a text-first business simulation about making connected operational and financial decisions. It is a static, single-player browser game: saves are local to the browser, and exported JSON files provide manual portability between browsers/devices.

## Integrated Core Release 1.0

This release consolidates the existing operating/accounting engine with richer customer demand, simulated competitor behavior, predictable seasonality, and supplier purchase orders. The new systems are connected to weekly processing rather than being display-only widgets.

### Business setup and operations

- Start a company with an industry, initial capital, founder, and location.
- Three operating scenarios: Online Retail, Cafe & Food, and Digital Agency.
- Weekly sales and fulfilment, editable prices, inventory, weighted-average COGS, marketing spend, staff hiring/capacity, payroll accrual, customer reputation, stockouts, payables, receivables, and random operating events.
- Scenario assumptions are illustrative gameplay mechanics, not market quotes or financial advice.

### Customer segments and positioning

- Three modeled buyer groups: price-sensitive buyers, everyday buyers, and quality seekers, each with a share, price sensitivity, quality sensitivity, and loyalty value.
- Choose Value, Balanced, or Premium positioning. Strategy influences demand mix and segment loyalty over time.
- A seasonal demand curve varies by industry and calendar month. Market season names and demand outlook appear in Market & Sales.
- Seasonal multipliers and competitor values are simulated in-game data, not live market feeds.

### Competitors

- Three simulated competitors have independent pricing indices, stock availability, capacity indices, operating reliability, and strategic positioning.
- At weekly close the game updates competitor price/availability signals and estimated demand, delivered sales, lost sales, and market share.
- Competitors are an abstract, modeled market rather than specific real-world firms; their figures are estimates used by the simulation.

### Supplier and purchase-order workflow

- Physical-goods businesses can choose from three modeled suppliers:
  - **ValueSource Wholesale:** 2-week lead, 78% modeled reliability, 8% lower baseline unit cost.
  - **Mainline Distribution:** 1-week lead, 88% modeled reliability, baseline unit cost.
  - **SwiftSure Supply:** 1-week lead, 97% modeled reliability, 10% higher baseline unit cost.
- Place orders for 1–2,000 units; only physical-goods products can be ordered. Digital Agency service offers use capacity planning instead.
- Order placement pays a 70% advance, recorded as a supplier-advance asset. Goods do not enter inventory before delivery. On receipt, inventory is capitalized at the order cost, the advance asset is cleared, and the remaining 30% becomes accounts payable, normally settled in the next weekly cycle.
- Supplier reliability can delay arrivals. A delay is surfaced in the event log and may extend an order by up to two additional weeks.
- Register limits: at most 50 open orders and 300 recorded orders per company. Export a save before beginning a new company if you need an external archive; the interface does not delete old purchase-order history.
- Supplier prices, lead times, and reliability are simulated assumptions, not actual vendor offers.

### Finance, accounting, and fixed assets

- Double-entry general journal, balance sheet, cumulative income statement, cash-flow statement and period history (up to 104 periods), owner capital, receivables/payables, operating costs, taxes, and overdraft mechanics.
- Integer-centavo rounding/storage for monetary save fields, with journal and cash-flow reconciliation checks.
- Fixed-asset register, individual asset purchases, depreciation, disposal/write-off, sale proceeds, gains/losses, and investing cash-flow classification.
- Supplier advances appear as assets until a shipment is received; they are not duplicated as liabilities.
- Three business scenarios have different products/service offers, costs, baseline demand, capacities, and fixed costs.

### Credit, loans, and business continuity

- Up to 20 concurrent term-loan records, each with its own amount, terms, weekly payment, outstanding principal, interest, arrears, late fees, missed-payment count, overdue streak, default week/count, and status.
- Portfolio facility/credit-score limits, extra-principal repayment, scheduled payment, missed-installment assessment, overdue recovery waterfall (late fees → term-loan interest → principal), and default after four consecutive overdue weeks or an unpaid maturity.
- Defaulted loans suspend scheduled installments but retain unpaid principal and charges as liabilities; another loan's status/schedule is not automatically overwritten.
- Credit score, compliance/risk indicators, modeled insurance/licensing, distress, and bankruptcy/closed-business safeguards.
- Rates, borrowing limits, default rules, bankruptcy triggers, taxes, supplier behavior, and all scenario economics are illustrative simulation assumptions.

### Saving and compatibility

- Browser `localStorage` persistence, JSON export/import, CSV export, deep save validation, and confirmations before destructive actions.
- Current export envelope: `saveFormat: "REALWORLD"`, `saveFormatVersion: 5`, `moneyStorage: "integer-centavo"`, `currency: "PHP"`.
- Flat legacy v1 saves and envelopes v2, v3, and v4 are supported for migration to v5. New market segments, competitors, supplier orders, and supplier-advance totals are initialized safely for older saves; old competitor histories are not fabricated.
- The app attempts to preserve a pre-v5 backup in browser storage during migration. Still export an important company save before upgrading as an independent backup.
- Saves remain browser-local; GitHub Pages does not supply accounts, cloud saves, or multiplayer persistence.

## Local regression suite

Requires a current Node.js installation; it does not require a package install.

```sh
node --test regression.test.cjs
```

The prepared candidate passed **64 tests, 0 failures, 0 skipped** in the local Node test harness. The harness runs the app's inline logic with a DOM/storage mock; this is not a substitute for post-commit GitHub Actions or live-browser acceptance testing.

## Deployment

1. Export any important browser save before deploying.
2. Replace the repository-root `index.html`, `regression.test.cjs`, and `README.md` with the files in the Core Release 1.0 package.
3. Keep `.github/workflows/realworld-regression.yml` unchanged.
4. Commit the three files to `main`.
5. Verify both the regression workflow and GitHub Pages deployment finish successfully.
6. Run the included `FINAL_LIVE_QA_PROMPT.md` against the published website and record every test as PASS, FAIL, BLOCKED, or NOT TESTED.

## Scope boundary

Core Release 1.0 is designed to complete a coherent single-player business-simulation core. It does not add login/accounts, cloud saves, multiplayer, external live price data, real supplier integrations, real credit/loan products, or live economic forecasts. Those require separate backend/product decisions and should not be implied by this static release.
