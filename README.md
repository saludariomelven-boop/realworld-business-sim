# REALWORLD — Hyper-Realistic Business Simulation

REALWORLD is a text-first business-management simulation centered on accounting, cash flow, operations, staffing, financing, market conditions, and long-term business survival. It is a single-file static website that can be hosted on GitHub Pages without a framework build step or application server.

## Phase 5.2 — Loan distress and default handling

- **Cash-only scheduled term-loan installments:** Scheduled term-loan principal and interest payments use available cash only. An installment shortfall is recorded as overdue debt; it does not silently increase the bank overdraft.
- **Distinct debt balances:** Term-loan interest payable is tracked separately from overdraft interest. Loan late fees are recorded as their own liability. These balances appear on the balance sheet and in the Finance screen.
- **Past-due tracking:** The app records unpaid scheduled installment amounts, cumulative missed installments, and consecutive overdue weeks. The past-due amount is a memo/tracking figure and is not added a second time to total liabilities.
- **Late fees:** Unpaid installments generate a simplified weekly late fee of 1.5% of the overdue amount, capped at ₱5,000 per week while the scheduled payment process is active. Fees are accrued as an expense and liability; they do not create an immediate cash movement until paid.
- **Default consequences:** Four consecutive weeks of overdue loan obligations or a loan maturity with debt still unpaid can trigger a default state. Default records an event, reduces the modeled credit score by 18 points, stops automatic scheduled payments, and blocks new borrowing while obligations remain unpaid.
- **Debt recovery:** The Finance screen exposes a payment panel when loan obligations are past due. Catch-up payments draw only available cash and apply to fees, term-loan interest, and principal without creating an overdraft. A cured loan can return to its remaining schedule; the credit-score impact and default event remain in the record.
- **Existing-save compatibility:** Phase 5.1 saves receive default debt-status fields without inventing past-due payments or a default history.
- **Accounting integrity:** Term-loan interest accrual, principal repayment, late-fee accrual, and debt cure transactions are journaled. Principal payments remain financing cash outflows; interest payments are operating cash outflows; accruals do not invent cash movements.

These rules are simplified game mechanics, not real loan terms or financial advice. The game still supports one active term loan at a time. Multiple concurrent facilities, lender-specific restructuring rules, collateral recovery, and integer-centavo storage remain future work.

## Phase 5.1 — Fixed-asset lifecycle

- **Individual fixed-asset register:** New purchases record a unique asset ID, name, category, purchase date/week, original cost, accumulated depreciation, and status.
- **Asset categories:** Equipment, vehicles, machinery, property, plant and equipment, and intangible assets are available.
- **Per-asset depreciation:** Active assets accrue depreciation individually under the simplified 6% annual straight-line assumption, with no residual value. General-ledger equipment and accumulated-depreciation fields remain mirrored aggregates for compatibility.
- **Sales and disposals:** Businesses can sell assets or write them off for zero proceeds. Disposal records preserve history and remove the asset's cost and accumulated depreciation from active asset balances.
- **Gain/loss treatment:** Sale proceeds are compared with book value at disposal. The ledger records proceeds, accumulated depreciation, the fixed-asset account, and gains or losses. A simplified tax reserve is accrued on disposal gains; losses do not create a modeled tax credit.
- **Investing cash flow:** Purchases are investing outflows; sale proceeds are investing inflows. Existing save files with pooled equipment migrate to a labelled legacy asset rather than inventing individual historical purchases.
- **Stronger save validation:** Asset identity, amounts, disposal math, asset totals, and ledger aggregates are validated on import.

## Phase 4 additions retained

- Period-level cash flow with opening cash, activity by category, actual closing cash, and reconciliation variance.
- A maximum of 104 retained weeks of cash-flow history.
- Fixed-asset purchase classification as an investing cash outflow.
- Amortized 12-, 24-, and 36-month term loans, tax-adjustment modal, validated save import/export, general journal, income statement, balance sheet, and weekly CSV export.

## Current gameplay

- Three business models: online retail, cafe/food, and digital agency.
- Weekly simulation, demand and competitor pressure, market events, and evolving economic conditions.
- Pricing, inventory purchases, supplier payables, stockout tracking, staffing, payroll, and marketing.
- Owner capital contributions, term loans, loan arrears/default, asset purchases/disposals, depreciation, overdraft, taxes, and insolvency controls.
- Browser-local autosave, validated JSON import/export, and responsive desktop/mobile layouts.

## Regression tests

Requires Node.js 18 or later and no npm dependencies. From the repository root:

```bash
node --test regression.test.cjs
```

The dependency-free suite currently contains 27 test cases and tests the real inline application script under a mocked DOM. It covers cash-flow reconciliation, 104-week history retention, multi-industry simulations, 12/24/36-month loan amortization, individual asset lifecycle, overdue loan payments, default consequences, cash-only recovery payments, legacy-save migration, and balanced financial records. A passing suite confirms only the exercised logic paths; it does not replace live-browser or mobile-device QA.

GitHub Actions runs `node --test regression.test.cjs` on pushes to `main`, pull requests targeting `main`, and manual workflow runs through `.github/workflows/realworld-regression.yml`. Check the repository's Actions tab for each result.

## Accounting and simulation limitations

- REALWORLD is a prototype, not a certified bookkeeping system or complete world economy. Market behavior and financial assumptions are illustrative.
- Tax, employment, licensing, financing, depreciation, and compliance rules are simplified abstractions, not legal, tax, or accounting advice.
- Asset depreciation uses a fixed 6% annual straight-line assumption with no residual value or configurable useful life.
- Disposal-gain tax is reserved using the current in-game tax assumption; disposal losses do not create a modeled tax credit.
- The loan model uses a simplified 1.5% weekly overdue-fee rate (capped at ₱5,000 per week) and a four-week default threshold. It does not represent actual lender policies, legal enforcement, or credit bureau behavior.
- The simulation supports one active term loan at a time. Multiple concurrent loans and lender restructuring products are future work.
- Money is rounded to two decimal places at key transaction boundaries but is not globally stored as integer centavos. Small floating-point differences can occur within documented tolerances.
- Cash-flow history is capped at 104 periods. Earlier saves cannot recover financial categories that were never recorded; migrations do not fabricate historical cash flow or loan defaults.
- Saves use browser `localStorage`; another device/browser has a separate save unless exported and imported manually. GitHub Pages does not provide cloud saves, accounts, or secure multiplayer state.

## Publish on GitHub Pages

Keep `index.html`, `README.md`, and `regression.test.cjs` in the repository root. Keep `.github/workflows/realworld-regression.yml` unchanged; it should run `node --test regression.test.cjs`.

1. Replace root `index.html` with the Phase 5.2 version.
2. Replace root `README.md` with this README.
3. Replace root `regression.test.cjs` with the updated suite.
4. Commit the changes to `main`.
5. Confirm GitHub Actions is green and Pages deployment completes.
6. Test the live Finance screen, force a disposable low-cash scenario, verify a missed installment creates arrears and fees rather than an overdraft, test catch-up payment, and inspect balance-sheet and cash-flow reconciliation.

## Run locally

Open `index.html` in a modern browser. No build command is required. For best compatibility, use a current Chrome, Edge, Firefox, or Safari browser.

## Build identification

The visible build identifier is `RW-P5.2 · Loan distress · 2026-10-11`. It is a human-readable release label, not an automatically generated commit SHA.
