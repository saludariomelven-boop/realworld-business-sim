# REALWORLD — Hyper-Realistic Business Simulation

## Current build: Phase 5.4.3 — Loan Portfolio Clarity & Monitoring

Phase 5.4.3 builds on multi-loan financing without changing the financial engine or v4 save format. It improves loan-card clarity and makes portfolio status easier to scan.

### Phase 5.4.3 changes

- **Correct term counts:** Weeks remaining, missed installments, and consecutive overdue weeks render as plain integer counts rather than PHP currency.
- **Accurate rate display:** Loan cards show the simulated annual rate to one decimal place (for example, 12.8%) instead of rounding it to a whole percentage.
- **Portfolio health summary:** The portfolio header reports the number of current, past-due, defaulted, and paid-off facilities without merging their individual statuses.
- **Clear default guidance:** A defaulted-loan card explains that scheduled installments are suspended, that outstanding principal and charges remain liabilities, and that debt recovery payments remain available.
- **Past-due guidance:** A delinquent-loan card reminds users that each facility must be cured independently; paying another loan does not clear its arrears.
- **No save migration:** These are display and explanatory changes. Save format remains `REALWORLD` version 4 with integer-centavo monetary storage.

## Phase 5.4.2 — Multi-Loan Financing

REALWORLD models concurrent term loans. Each facility has its own ID, name, origination week, original amount, outstanding principal, illustrative annual rate, 12/24/36-month amortization schedule, weekly payment, interest payable, arrears components, late fees, missed-payment count, overdue streak, default week, default count, and status.

- Up to 20 facilities may be recorded. New borrowing is constrained by a simplified portfolio facility calculation and the existing credit-score threshold.
- Finance displays an independent card and repayment controls for each loan. Extra principal or overdue-debt payments affect only the selected facility.
- Weekly interest accrual, scheduled installments, arrears, late fees, maturity/default checks, and payment waterfalls are processed per loan. A defaulted facility stops scheduled installments without changing another facility's schedule or status.
- Overdue payments are applied to late fees, term-loan interest, then principal. Payments use available cash only; a shortfall does not automatically create an overdraft through the loan-payment controls.
- Existing top-level loan fields are maintained as aggregate compatibility values for the balance sheet, reports, and risk logic. The `loans` collection is the source of truth for each facility.

## Save compatibility

- Browser saves and JSON exports use `saveFormat: "REALWORLD"`, `saveFormatVersion: 4`, `moneyStorage: "integer-centavo"`, and `currency: "PHP"`.
- Monetary fields in loan records use centavo-safe integer encoding.
- Existing flat version-1 saves and version-2/version-3 envelopes remain readable. A legacy single-loan save migrates to one loan record; values are not split into invented historical facilities.
- A best-effort pre-migration backup is preserved before automatic re-saving in v4. Unsupported or malformed envelopes are rejected before replacing the active company.
- Version-2 journal totals are decoded as peso amounts; version-3 journal totals are decoded as integer centavos.

## Existing systems preserved

- Cash-flow statements, reconciliation checks, balanced journal entries, and integer-centavo persistence.
- Individual fixed-asset purchase, depreciation, sale/disposal, gain/loss, and investing cash-flow classification.
- Single-loan compatibility, multi-loan independence, overdue recovery, four-week delinquency/default rules, and default isolation.
- Centavo-safe monetary input, one-decimal credit-score display, and business operations for retail, cafe/food, and digital-agency scenarios.

## Validation

Run the regression suite from the repository root:

```bash
node --test regression.test.cjs
```

The prepared Phase 5.4.3 files were run locally with **51 tests passing and 0 failing**. GitHub Actions and the live site have not yet been verified for the new commit; confirm both after committing, then run the targeted live acceptance test for loan-card formatting and status summaries.

## Deployment workflow

Replace the repository-root `index.html`, `regression.test.cjs`, and `README.md` with the files supplied for this phase. Keep `.github/workflows/realworld-regression.yml` unchanged. Commit the three files to `main`, verify that regression tests and GitHub Pages deployment both succeed, then complete the live acceptance audit.

REALWORLD remains a static simulation. Rates, credit limits, accounting, tax, loan default, and financing rules are illustrative gameplay mechanics, not real lending services or financial advice.
