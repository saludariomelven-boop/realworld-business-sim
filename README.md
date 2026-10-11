# REALWORLD — Hyper-Realistic Business Simulation

## Phase 5.3.2 — Credit-score display hotfix

- **Credit-score formatting:** Dashboard and Finance loan-limit text now round credit scores to one decimal place for display, preventing binary floating-point artifacts such as `44.39999999999999` from appearing to users.
- **State preserved:** This is a presentation-only correction; it does not mutate or re-round the underlying stored credit score.
- **Regression protection:** Added a test that sets a representative floating-point artifact and verifies both display locations render `44.4` while the underlying value remains unchanged.

REALWORLD is a text-first business-management simulation centered on accounting, cash flow, operations, staffing, financing, market conditions, and long-term business survival. It is a single-file static website hosted on GitHub Pages without a framework build step or application server.

## Phase 5.3.1 — Precision and statement-display hotfix

- **Selling-price correction:** Product selling-price input now uses the shared decimal-string centavo rounder. The reported `₱1.005 → ₱1.00` issue is fixed to normalize as `₱1.01`; the input accepts two-decimal precision and shows two-decimal prices.
- **No misleading whole-peso subtotals:** Cash-flow and income statements use centavo-safe subtotals and show exact two-decimal amounts. Balance-sheet account lines and totals display the same precision for easier reconciliation.
- **Consistent monetary inputs:** Owner-capital and loan-origination handlers normalize entered monetary values through the integer-centavo conversion path.
- **Regression protection:** Added tests for selling-price half-centavo input, invalid-price safety, centavo-normalized owner contributions and loan origination, plus centavo-exact statement display.

## Phase 5.3 — Centavo Precision & Financial Transparency

- **Decimal edge-case normalization:** The app converts peso amounts to integer centavos using decimal-string parsing at normalization boundaries. This avoids common binary floating-point rounding surprises such as `1.005` and `-2.675`, and uses symmetric nearest-centavo rounding.
- **Integer-centavo aggregation:** Cash-flow net movement, category totals, journal entries, journal balance checks, balance-sheet totals, fixed-asset totals, and net book value sums use integer-centavo operations before converting back to peso decimals.
- **Backward-compatible saves:** The saved game schema continues to store PHP amounts as peso decimals so existing Phase 5.2 saves can load without a full-field migration. This is a centavo-safe arithmetic foundation, not yet a schema-wide conversion where every persisted monetary field itself is an integer.
- **Exact finance display:** Asset register costs, accumulated depreciation, book values, disposal proceeds and gains/losses, and loan arrears/interest/late-fee figures display two decimal places.
- **Clearer disposal confirmation:** Sale proceeds, carrying value, and estimated gain/loss show exact centavos before confirmation.
- **Clearer credit-score event:** A default event reports the score immediately before default, the effective one-time default penalty, and the resulting score. Weekly distress-related score changes are explicitly described as separate.
- **Broader regression coverage:** Added checks for positive and negative half-centavo rounding, floating-point input cases, centavo-level aggregation, balanced journal entries, precise Finance-screen displays, and credit-score messaging.

The app continues to use one active term loan. Multi-loan portfolios and a full schema migration to integer-centavo storage should be implemented separately, with their own migration fixtures and regression suite rather than bundled into a high-risk all-at-once conversion.

## Phase 5.2 — Loan distress and default handling retained

- Scheduled term-loan installments use available cash only. Shortfalls become overdue debt rather than silently increasing bank overdrafts.
- Term-loan interest payable is tracked separately from overdraft interest; late fees are their own liability.
- Past-due memo amounts, missed payments, and consecutive overdue weeks are tracked without double-counting the underlying liabilities.
- Weekly late fees use the simplified rule of 1.5% of overdue amounts, capped at ₱5,000 while the scheduled payment process is active.
- Four consecutive overdue weeks or unpaid debt at maturity can trigger default. Default lowers the modeled credit score and stops scheduled payments.
- Recovery payments apply to fees, term-loan interest, and principal, in that order, and use available cash only.
- Earlier saves receive missing loan-status defaults without inventing overdue payments or default history.

These are simplified simulation mechanics, not real loan terms or financial advice.

## Phase 5.1 — Fixed-asset lifecycle retained

- Individual fixed-asset records include unique identity, name, category, purchase date/week, cost, accumulated depreciation, and status.
- The simplified depreciation assumption remains 6% annual straight-line, with no residual value.
- Sales and zero-proceeds write-offs remove disposed assets from active balances and preserve disposal history.
- Gains/losses are measured against net book value at disposal. Gain tax is reserved under the current in-game tax assumption.
- Purchases are investing outflows and sale proceeds are investing inflows. Older pooled equipment migrates to a labelled legacy asset instead of fabricated history.

## Existing features retained

- 104-week cash-flow history with opening/closing balances and reconciliation variance.
- 12-, 24-, and 36-month single-loan amortization.
- Tax-adjustment modal, validated JSON import/export, journal, income statement, balance sheet, weekly CSV export.
- Retail, cafe/food, and digital agency simulations; demand, competition, pricing, inventory, staffing, payroll, marketing, owner capital, overdraft, tax, and bankruptcy status.

## Regression tests

Requires Node.js 18 or later; no npm dependencies are required. From the repository root:

```bash
node --test regression.test.cjs
```

The suite contains 40 test cases and runs the actual inline application script under a mocked DOM. It covers prior cash-flow, asset, loan-distress, save validation, and multi-industry regression scenarios plus centavo conversion, financial aggregation, precision display, and default-event messaging. Passing automated tests does not replace live-browser or mobile-device QA.

GitHub Actions runs the suite on pushes to `main`, pull requests targeting `main`, and manual workflow runs using `.github/workflows/realworld-regression.yml`.

## Accounting and simulation limitations

- REALWORLD is a prototype, not a certified bookkeeping system or full economic simulation.
- Tax, employment, licensing, financing, depreciation, and compliance rules are illustrative rather than legal or accounting advice.
- Money is still persisted as peso decimals for backward-compatible save structure. Critical rounding and aggregation paths use integer centavos; a schema-wide integer-centavo storage migration remains future work.
- The game supports one active term loan at a time. Multiple concurrent loans and lender restructuring products remain future work.
- Cash-flow history is capped at 104 periods. Older saves cannot recover financial categories that were never recorded.
- Saves live in browser `localStorage`; another device/browser has a separate save unless exported/imported. GitHub Pages does not provide cloud saves or accounts.

## Publish on GitHub Pages

Keep `index.html`, `README.md`, and `regression.test.cjs` in the repository root. Keep `.github/workflows/realworld-regression.yml` unchanged.

1. Replace root `index.html` with the Phase 5.3.2 hotfix version.
2. Replace root `README.md` with this README.
3. Replace root `regression.test.cjs` with the updated suite.
4. Commit the changes to `main`.
5. Confirm GitHub Actions is green and Pages deployment completes.
6. Verify the live build ID `RW-P5.3.2 · Credit-score display fix · 2026-10-11`, then run live acceptance QA for debt balances, asset records, disposal details, and financial reconciliation.

## Run locally

Open `index.html` in a modern browser. No build command is required. For best compatibility, use a current Chrome, Edge, Firefox, or Safari browser.

## Build identification

The visible build identifier is `RW-P5.3.2 · Credit-score display fix · 2026-10-11`. It is a human-readable release label, not an automatically generated commit SHA.
