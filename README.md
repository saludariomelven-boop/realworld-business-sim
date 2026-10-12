# REALWORLD — Hyper-Realistic Business Simulation

## Phase 5.4.2 — Multi-Loan Financing

REALWORLD now models a portfolio of concurrent term loans. The existing single-loan experience is preserved for a company with one loan, while multiple loans are tracked and serviced independently.

### Multi-loan behavior

- Each facility has its own ID, name, origination week, original amount, outstanding principal, illustrative annual rate, 12/24/36-month amortization schedule, weekly payment, interest payable, arrears components, late fees, missed-payment count, overdue streak, default week, default count, and status.
- A company can record up to 20 loan facilities. New applications are limited by a simplified portfolio facility calculation and the existing credit-score threshold; existing debt no longer categorically blocks another application.
- Finance displays a per-loan portfolio when multiple facilities exist. Each loan has its own extra-principal or overdue-debt action. Payment is applied only to the selected loan.
- Weekly interest accrual, scheduled installments, arrears, late fees, maturity/default checks, and payment waterfalls are processed per loan. A defaulted facility stops scheduled principal installments without changing another facility's schedule or status.
- An overdue payment applies to that selected loan in this order: late fees, term-loan interest, then principal. Payments use available cash only; a shortfall does not automatically create an overdraft.
- Existing top-level `loanBalance`, `loanInterestPayable`, `loanArrears`, and related fields are maintained as portfolio aggregates for the existing balance sheet, reports, risk logic, and compatibility with established regression coverage. The `loans` collection is the source of truth for per-facility state.

### Save compatibility

- Browser saves and JSON exports use `saveFormat: "REALWORLD"`, `saveFormatVersion: 4`, `moneyStorage: "integer-centavo"`, and `currency: "PHP"`.
- Monetary fields in each loan record use the same centavo-safe encoding as the company's existing balances and statements.
- Existing flat version-1 saves, version-2 envelopes, and version-3 envelopes remain readable. An older single-loan save is migrated to a single `loan-0001` record; values are not split into invented historical facilities.
- Local startup preserves a best-effort pre-migration backup before automatically re-saving a v1, v2, or v3 save in the v4 format. The current legacy compatibility code does not fabricate loan history.
- Unsupported or malformed envelopes are rejected before replacing the active company. Version-2 journal totals remain decoded as peso amounts; version-3 journal totals are decoded as integer centavos.

### Existing systems preserved

- Cash-flow statements, reconciliation checks, journal entries, and integer-centavo persistence.
- Individual fixed-asset purchase, depreciation, sale/disposal, gain/loss, and investing cash-flow classification.
- The existing single-loan schedule and 4-week delinquency/default mechanics.
- Centavo-safe selling-price handling, one-decimal credit-score display, and existing business operations for retail, cafe/food, and digital agency scenarios.

### Validation

Run the regression suite from the repository root:

```bash
node --test regression.test.cjs
```

Phase 5.4.2 implementation was verified locally with **50 tests passing and 0 failing** at the time these files were prepared. This is not a claim that the current commit has already passed GitHub Actions or live-browser QA; those checks happen after the files are committed and deployed.

### Deployment workflow

Replace the root `index.html`, `regression.test.cjs`, and `README.md` with the supplied files. Keep `.github/workflows/realworld-regression.yml` unchanged. Commit the three files to `main`, then confirm GitHub Actions and the GitHub Pages deployment both succeed before performing the live acceptance audit.

REALWORLD remains a static simulation. Rates, credit limits, accounting, tax, loan default, and financing rules are illustrative gameplay mechanics, not real lending services or financial advice.
