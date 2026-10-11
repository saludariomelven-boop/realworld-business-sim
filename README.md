# REALWORLD — Hyper-Realistic Business Simulation

REALWORLD is a text-first business-management simulation centered on accounting, cash flow, operations, staffing, financing, market conditions, and long-term business survival. It is a single-file static website and can be hosted on GitHub Pages without a framework build step or application server.

## Phase 5.1 — Fixed-asset lifecycle

- **Individual fixed-asset register:** New purchases record an asset ID, name, category, purchase date/week, original cost, accumulated depreciation, and status.
- **Asset categories:** Equipment, vehicles, machinery, property, plant and equipment, and intangible assets are available as modeled fixed-asset categories.
- **Per-asset depreciation:** Active assets accrue depreciation individually under the model's 6% annual straight-line assumption, with no residual value. General-ledger equipment/cost and accumulated-depreciation fields remain mirrored aggregates to preserve compatibility with existing accounting logic.
- **Asset sales and disposals:** A company can sell an active asset or write it off with zero proceeds. The action requires confirmation, removes the asset's cost and accumulated depreciation from active balances, and preserves its disposal history.
- **Gain/loss treatment:** Proceeds are compared with net book value. The ledger records cash/overdraft settlement, accumulated depreciation, the fixed-asset account, and any gain or loss. A simplified tax reserve is accrued immediately on a disposal gain using the current in-game tax assumption; losses do not create a modeled tax benefit.
- **Investing cash flow:** Asset purchases are investing outflows; cash proceeds from disposals are investing inflows. If proceeds repay an existing overdraft first, the cash-flow statement separately represents that financing repayment.
- **Legacy save migration:** Older saves with an aggregated equipment pool migrate to one explicitly labelled legacy asset. The original purchase date is kept unknown rather than inventing a history of individual purchases. Prior totals and weekly cash-flow history are preserved.
- **History and exports:** Active and disposed items remain in the fixed-asset register. Reports and weekly CSV output include disposal gains and losses.
- **Stronger save validation:** Asset IDs, fields, statuses, disposal calculations, asset totals, and the general-ledger aggregate are validated on import.

## Phase 4 additions retained

- Cash flow by period, including opening cash, actual closing cash, net movement, and reconciliation variance.
- Up to 104 retained weeks of cash-flow history.
- Fixed-asset capital purchases classified as investing cash outflows.
- Amortized 12-, 24-, and 36-month loan schedules, tax-adjustment modal, save validation, and CSV exports.
- A dependency-free regression suite that runs the actual inline application JavaScript under a mocked DOM.

## Current gameplay

- Three business models: online retail, cafe/food, and digital agency.
- In-game amounts are displayed in Philippine pesos (PHP); simulated money is not actual money.
- Weekly simulation, modeled demand and competitor pressure, market events, and evolving economic conditions.
- Pricing, contribution margins, inventory purchases, supplier payables, stockout tracking, and labour capacity.
- Hiring/dismissal, wages, onboarding costs, and marketing.
- Owner capital contributions, one active term loan, 12/24/36-month amortization, principal repayment, interest, and overdraft mechanics.
- Accrual-based modeled revenue and expenses, weighted-average inventory costs, fixed-asset depreciation and disposal, estimated tax reserves, balance sheet, general journal, and a direct-method cash-flow statement.
- Illustrative insurance, licensing, bookkeeping, compliance, and insolvency controls.
- Browser-local autosave, validated JSON import/export, weekly history CSV export, and responsive desktop/mobile layouts.

## Run regression tests

Requires Node.js 18 or later and no npm dependencies. From the repository root, run:

```bash
node --test regression.test.cjs
```

The automated suite covers the Phase 4 accounting baseline and Phase 5 fixed-asset purchases, disposal at book value, gains/losses, investing cash flow, tax reserve, weekly reporting, legacy migration, save validation, loan schedules, and multi-industry simulations. A passing suite confirms these tested logic paths pass in the test harness; it does **not** replace full live-browser or mobile-device QA.

GitHub Actions runs this command on pushes to `main`, pull requests targeting `main`, or a manual workflow run, using `.github/workflows/realworld-regression.yml`. Open the repository's **Actions** tab to inspect each run.

## Important accounting and simulation limitations

- REALWORLD is a prototype, not a certified bookkeeping system or complete world economy. Market behavior and financial assumptions are illustrative, not live data.
- Tax, employment, licensing, financing, depreciation, and compliance rules are simplified abstractions, not legal, tax, or accounting advice.
- Legacy assets are represented as one combined pool because the previous schema did not record individual purchase history. Only purchases made after this update receive individual asset records.
- The current depreciation policy is a fixed 6% annual straight-line model with no residual value or configurable useful life. It should not be treated as a real tax depreciation schedule.
- Gain tax is reserved immediately at the in-game tax-assumption rate; disposal losses do not produce a modeled tax credit. More detailed accounting and tax-period rules remain future work.
- The simulation supports one active term loan at a time. Realistic missed-payment/default rules and multiple concurrent facilities remain future work; the current model may fund payment shortfalls with overdraft.
- Money is rounded to two decimal places at key transaction boundaries but is not globally stored as integer centavos. Small floating-point differences can occur within documented tolerances.
- Cash-flow history is capped at 104 periods. Older saves cannot recover transaction categories that were never recorded, so migration does not invent historical cash flows.
- Saves use browser `localStorage`; another device/browser has a separate save unless it is exported and imported manually. GitHub Pages alone does not provide cloud saves, accounts, or secure multiplayer state.

## Publish on GitHub Pages

The repository is configured for GitHub Pages. Keep `index.html` at the repository root.

1. Replace the existing root `index.html` with the Phase 5.1 version.
2. Replace the root `README.md` with this README.
3. Replace the root `regression.test.cjs` with the updated test file.
4. Keep `.github/workflows/realworld-regression.yml` in place; it should run `node --test regression.test.cjs`.
5. Commit the changes to `main`. GitHub Pages should rebuild automatically; review the Actions tab for the regression run and Pages deployment status.
6. Smoke-test the Finance room's asset register, purchase form, sale/disposal confirmation, disposal journal entry, Reports income statement, and cash-flow reconciliation. Test import with an exported copy of a legacy save where possible.

## Next development steps

1. Add financial distress rules for missed loan payments, overdue obligations, default consequences, and realistic recovery options.
2. Consider integer-centavo storage after core transaction types have comprehensive regression tests.
3. Add lender exposure and multiple concurrent loans.
4. Expand customer segments, independent competitor behavior, supplier lead times, and seasonality after the financial core remains stable.
5. Run live mobile viewport checks and a separate hands-on acceptance audit before a wider release.

## Run locally

Open `index.html` in a modern browser. No build command is required. For best compatibility, use a current Chrome, Edge, Firefox, or Safari browser.

## Build identification

The visible build identifier is `RW-P5.1 · Asset lifecycle · 2026-10-11`. This is a human-readable release label, not a cryptographic deployment proof or an automatically generated commit SHA.
