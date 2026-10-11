# REALWORLD — Hyper-Realistic Business Simulation

REALWORLD is a text-first business-management simulation designed around accounting, cash flow, operations, staffing, financing, market conditions, and long-term business survival. It is a single-file static website and can be hosted on GitHub Pages without a framework build step or server.

## Phase 4 additions

- **Cash flow by period:** Reports now show an in-progress period plus the eight most recent closed periods, with a control to expand to all retained periods (up to 104 weeks).
- **Period cash snapshots:** Each newly closed period records its opening cash, actual closing cash, category-based net change, and reconciliation variance. The save validator checks the stored period snapshot for consistency.
- **Fixed-asset investment:** The Finance room has an equipment-purchase action. It capitalizes eligible purchases as equipment, records the payment in the journal, and classifies the cash movement as investing cash outflow. Purchases require available cash and do not silently draw an overdraft.
- **Cash-flow CSV columns:** Weekly exports include period opening cash, closing cash, and cash-flow variance when those snapshots exist.
- **Save compatibility:** Existing Phase 3 saves are migrated to a current-period opening-cash baseline. Historical cash flows are not fabricated. Historical rows from older saves without per-period snapshots are displayed using computed balances from the recorded flows.
- **Automated regression suite:** A dependency-free Node.js test harness exercises the actual inline game logic for capital purchases, period reconciliation, older saves, three industries, and all loan maturities.

## Current gameplay

- Three business models: online retail, cafe/food, and digital agency.
- In-game amounts displayed in Philippine pesos (PHP); simulated money is not actual money.
- Weekly simulation, modeled demand and competitor pressure, market events, and evolving economic conditions.
- Pricing, contribution margins, inventory purchases, supplier payables, stockout tracking, and labour capacity.
- Hiring/dismissal, wages, onboarding costs, and marketing.
- Owner capital contributions, one active term loan, 12/24/36-month amortization, principal repayment, interest, and overdraft mechanics.
- Accrual-based modeled revenue and expenses, weighted-average inventory costs, depreciation, estimated tax reserve, balance sheet, general journal, and a direct-method cash-flow statement.
- Illustrative insurance, licensing, bookkeeping, compliance, and insolvency controls.
- Browser-local autosave, validated JSON import/export, and weekly history CSV export.
- Responsive desktop and mobile layout.

## Run regression tests

Requires Node.js 18 or later and no npm dependencies. From the repository root, run:

```bash
node --test realworld-regression.test.cjs
```

The suite uses a minimal mocked DOM and executes the game's actual inline JavaScript. It tests core logic and rendered HTML fragments, but it is **not** a replacement for a full live-browser or mobile-device test. After publishing, manually verify the Finance page's fixed-asset purchase form, the Reports page's period expansion control, cash-flow snapshots, and valid/invalid save import.

## Important accounting and simulation limitations

- The game is a prototype, not a certified bookkeeping system or complete world economy. Market behavior and economic conditions are modeled assumptions, not live data.
- Tax, employment, licensing, financing and compliance rules are simplified abstractions, not legal, tax or accounting advice.
- Equipment is currently accounted for as one aggregated equipment pool. Purchases are capitalized and included in the existing simplified depreciation model; there is not yet a per-asset register, asset disposal workflow, or custom useful life per asset.
- The simulation supports one active term loan at a time. Loan default/missed-payment mechanics and multiple concurrent facilities remain future work; the current model may fund payment shortfalls with overdraft.
- Money is rounded to two decimal places at key transaction boundaries but is not globally stored as integer centavos. Small floating-point differences can occur within documented tolerances.
- Cash-flow history is capped at 104 periods. Older saves cannot recover historical category data that was never recorded, so the migration does not invent it.
- Saves use the browser's `localStorage`; another device/browser has a separate save unless exported and imported manually. GitHub Pages alone does not provide cloud saves, accounts, or secure multiplayer state.

## Publish on GitHub Pages

The existing repository is configured for GitHub Pages. Keep `index.html` at the repository root.

1. Replace the existing root `index.html` with the updated file.
2. Replace `README-realworld-business-sim.md` with this README.
3. Add `realworld-regression.test.cjs` to the repository root if you want the regression suite available in the source repository.
4. Commit the files to the configured publishing branch (currently `main`).
5. GitHub Pages should rebuild automatically. Check the Pages deployment status if the live site does not update, and hard-refresh to rule out browser caching.
6. Smoke-test company creation, an equipment purchase, Reports → Cash flow by period, expansion to all periods, loan setup, weekly close, and save export/import.

## Suggested next phase

1. Model missed loan payments and default rather than silently relying on overdraft for every shortfall.
2. Add asset disposals and a per-asset register with cost, purchase date, useful life, and accumulated depreciation.
3. Add multiple loans with lender exposure and debt-service constraints.
4. Add customer segments, demand elasticity, and competitors with independent pricing/stock/capacity strategies.
5. Add supplier lead times, purchase-order commitments, and seasonality.
6. Consider integer-centavo storage after the core transaction types have comprehensive regression tests.
7. Consider cloud persistence or multiplayer only after single-player accounting and recovery rules are stable.

## Run locally

Open `index.html` in a modern browser. No build command is required. For best compatibility, use a current Chrome, Edge, Firefox, or Safari browser.
