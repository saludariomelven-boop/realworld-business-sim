# REALWORLD — Hyper-Realistic Business Simulation

## Phase 5.4.1.1 — Journal Total Centavo Fix

- **Versioned save format:** Browser saves and JSON exports use a `REALWORLD` envelope with `saveFormatVersion: 3`, `moneyStorage: "integer-centavo"`, and `currency: "PHP"`.
- **Integer-centavo persistence:** Monetary fields in the saved game state—including company balances, product prices and costs, employee compensation, fixed-asset values, statements, cash-flow history, and journal debit/credit lines and entry totals—are stored as signed integer centavos. Quantities, weeks, rates, percentages, scores, dates, and other non-monetary fields are not converted.
- **Runtime compatibility:** The existing simulation continues to use PHP peso numbers in its game engine and UI. Encoding converts a detached copy to integer centavos; decoding converts it back before existing game-state validation and business logic run. This isolates the migration from loan and accounting rules.
- **Legacy save safety:** Existing flat `version: 1` saves and JSON exports, plus Phase 5.4.1 version-2 envelopes, remain importable. V2 payloads are decoded using the original field map because their journal entry `total` field is peso-denominated; successful loading upgrades the save to the version-3 envelope. A successful browser startup migrates flat v1 saves to the version-3 envelope and preserves a best-effort raw backup under `realworld-business-sim-v1-pre-centavo-backup`. Existing v2 local saves are backed up under `realworld-business-sim-v1-pre-v3-backup` before being re-saved as v3.
- **Strict envelope validation:** Unknown save formats/versions, wrong currency/unit identifiers, non-finite monetary values, fractional-centavo stored values, and values outside JavaScript's safe integer-centavo range are rejected. V3 stores journal entry totals in integer centavos; v2 remains readable with its original peso-denominated total semantics. Imported data is decoded and fully validated before it replaces the active company.
- **Scope boundary:** This phase changes persistence, JSON import/export, and legacy-save migration only. It does not introduce concurrent loans or change interest, arrears, late-fee, default, or recovery-payment mechanics.

REALWORLD remains a single-file static website. The simulation is a prototype; tax, employment, financing, depreciation, and compliance mechanics are illustrative rather than legal, financial, or accounting advice.

## Hotfix changes

- Added the derived journal entry `total` to integer-centavo persistence so it now matches the stored debit/credit lines.
- Bumped the save envelope to version 3 and retained a version-2 decoder to prevent older v2 journal totals (stored as pesos) from being misinterpreted as centavos.
- Added a regression test for v2-to-v3 compatibility and journal-total precision.

## Retained simulation features

- Cash-flow statements with opening/closing balances, reconciliation variance, and up to 104 historical periods.
- Single term-loan amortization for 12-, 24-, or 36-month terms; arrears, late fees, default handling, and cash-only debt recovery.
- Fixed-asset purchase, depreciation, disposal, gain/loss accounting, and investing cash-flow classification.
- Retail, cafe/food, and digital agency business types with pricing, demand, competition, inventory, staffing, payroll, marketing, owner capital, overdraft, tax, and bankruptcy status.
- JSON save import/export, browser-local persistence, journal, income statement, balance sheet, and weekly history CSV export.

The app supports one active term loan at a time. Multiple concurrent loans are a separate planned phase.

## Regression tests

Requires Node.js 18 or later. No npm dependencies are required. From the repository root run:

```bash
node --test regression.test.cjs
```

The regression suite contains 44 tests, including centavo conversion/formatting, statement reconciliation, assets, loan distress/default behavior, credit-score display, version-3 integer-centavo persistence, version-2-to-version-3 compatibility, legacy-save compatibility, and malformed-envelope rejection. Passing automated tests does not replace live-browser or mobile-device QA.

GitHub Actions runs the regression suite on pushes to `main`, pull requests targeting `main`, and manual workflow dispatch. Keep `.github/workflows/realworld-regression.yml` unchanged for this phase.

## Publish on GitHub Pages

Keep `index.html`, `README.md`, and `regression.test.cjs` in the repository root.

1. Replace root `index.html` with the supplied Phase 5.4.1 file.
2. Replace root `regression.test.cjs` with the supplied Phase 5.4.1 suite.
3. Replace root `README.md` with this file.
4. Commit the three files to `main`. Do not replace or edit the workflow file.
5. Confirm the regression workflow succeeds and wait for the Pages deployment to complete.
6. Open the live site and verify the displayed build identifier: `RW-P5.4.1 · Full centavo storage migration · 2026-10-12`.
7. Run live QA with an existing exported v1 save: import it, check cash/assets/loan figures and the balance sheet, export it again, reload, and re-import the exported version-2 file. Confirm rejected malformed saves do not replace the current company.

## Limitations

- Browser saves live in local storage. Another device/browser has a separate save unless the player exports and imports a file. GitHub Pages does not provide cloud saves or accounts.
- The runtime accounting engine still uses peso-valued JavaScript numbers; integer centavos are canonical in persisted version-2 save payloads. Monetary operations continue to pass through existing centavo-safe normalization/aggregation helpers.
- A save backup is best-effort: if browser storage is full or unavailable, the game reports the storage problem and users should export a JSON backup before continuing.

## Build identification

Visible build identifier: `RW-P5.4.1 · Full centavo storage migration · 2026-10-12`. This is a release label, not an automatically generated commit SHA.
