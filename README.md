# REALWORLD — Hyper-Realistic Business Simulation

REALWORLD is a text-first, single-file business-management simulation designed to run on GitHub Pages without a build step, external framework, database, or server.

## Current gameplay

- Three starting business models: online retail, cafe/food, and digital agency.
- Simulated Philippine-peso (PHP) money, not real funds or bank transactions.
- Weekly time advancement, demand shifts, competitor pressure, economic changes, and random business events.
- Product pricing, contribution margins, inventory ordering, supplier credit, inventory depletion, and stockout tracking.
- Hiring and dismissal, wages, onboarding costs, capacity, and marketing.
- Owner capital contributions, term loans, extra principal repayments, modeled overdrafts, and **fixed weekly amortizing loan payments** over selected 12-, 24-, or 36-month terms.
- Accrual-based income statement, balance sheet, general journal, and a **direct-method cash-flow statement** classified from posted journal entries.
- Cash-flow reconciliation between opening cash plus tracked operating/investing/financing movements and actual available cash.
- Illustrative tax reserves, insurance, licences, bookkeeping, compliance risk, and insolvency conditions.
- Browser-local autosave, validated JSON save import/export, and CSV export with cash-flow columns for tracked weeks.
- Responsive desktop and mobile navigation.

## Financial model notes

- Loan interest accrues weekly using the model's annual rate divided by 52. The fixed scheduled payment is calculated using the standard amortization formula for the selected number of weekly periods.
- Scheduled weekly payments apply interest first and principal second. An extra principal payment reduces the balance while keeping the scheduled payment fixed, so the loan may be paid off earlier. A final payment clears any remaining principal.
- The cash-flow statement classifies transactions based on journal lines: customer collections and operating payments, fixed-asset transactions when present, owner capital and borrowing, principal repayment, and overdraft draw/repayment. Non-cash accruals are excluded. It displays a reconciliation check.
- Older saves are migrated forward. Because earlier saves did not record classified cash-flow categories or a repayment schedule, cash-flow tracking starts from the available cash and week when the older save is first loaded in this version; missing historical cash flows are not fabricated. Existing outstanding loans are assigned a modeled 12-month amortization schedule for the remaining balance.
- The accounting system is still a simulation. The cash-flow classification and loan schedule should be regression-tested with the UI and unusual financing scenarios before treating output as bookkeeping-grade.

## Save and safety behavior

- Imported JSON is validated before it replaces the active company.
- Importing over an existing company asks for confirmation; rejected imports should leave current data unchanged.
- Week close and other destructive actions use in-app confirmations.
- Tax reserve assumptions use an in-app numeric control rather than a browser-native prompt.
- Browser saves use `localStorage`; each device/browser has its own save unless you manually export and import JSON.

## Scope limits

This is a playable prototype, not a complete world economy. Competitor prices, customer demand, economic events, financing, and operating assumptions are modeled rather than live market data. Tax, employment, licence, insurance, and accounting rules are simplified game abstractions, not legal, tax, investment, or accounting advice. The game does not register a real business, process actual payments, connect to banks, or file taxes.

GitHub Pages hosts the static interface only. Shared multiplayer, cloud accounts, secure persistent state, and server-authoritative simulation require a separate backend.

## Publish and update on GitHub Pages

The repository's existing GitHub Pages setup publishes from the root of the `main` branch. To update:

1. Replace the repository-root `index.html` with the new file.
2. Replace `README-realworld-business-sim.md` with this documentation.
3. Commit both files to `main`.
4. Check the repository's **Settings → Pages** or Actions/deployments area if needed.
5. Open the live URL and hard-refresh if the browser shows cached content.
6. Test new loans at each term, weekly repayments, extra principal payments, cash-flow reconciliation, JSON import/export, and insolvency behavior.

## Suggested next development phases

1. Formalize deterministic automated tests for journal balance, balance-sheet reconciliation, loan amortization, and cash-flow movement.
2. Build smarter competitor businesses with strategy, financial constraints, pricing, inventory, and market-share changes.
3. Add customer segments and price elasticity based on demand history.
4. Add supplier lead times, delivery reliability, payable aging, and purchase-order commitments.
5. Expand contract accounting, equipment purchases, leases, and asset disposals.
6. Only after the single-player economy is stable, explore backend saves, accounts, and multiplayer.

## Run locally

Open `index.html` in a current Chrome, Edge, Firefox, or Safari browser. No build command is required.
