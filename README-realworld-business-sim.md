# REALWORLD — Hyper-Realistic Business Simulation (Prototype)

A text-first, single-file business management game. There are no 2D/3D scenes, frameworks, external libraries, database, server, or paid services required for this prototype.

## Included in this prototype

- Three starting business models: online retail, cafe/food, and digital agency.
- Philippine pesos (PHP) for nominal in-game money. The money is simulated and is not actual money.
- Weekly time advancement with demand changes, competitors, and random business events.
- Pricing, product contribution margins, inventory orders, supplier credit, and stockouts.
- Hiring and dismissing staff, monthly wage costs, capacity, and onboarding costs.
- Marketing allocation, reputation, demand, and competitor reference prices.
- Owner capital injections, a simplified term loan, principal repayment, interest, and overdraft mechanics.
- Accrual-based modeled revenue, cost of goods/services, operating expenses, estimated tax reserve, and depreciation.
- A balance sheet, weekly income results, and a simple general journal with debit/credit entry lines.
- Illustrative insurance, licence, bookkeeping, and compliance risk controls.
- Automatic local browser save, JSON import/export, and weekly history CSV export.
- Responsive layout for desktop and mobile.

## Important scope limits

This is a **playable prototype, not a complete world economy**. The market is local and procedurally simulated. Rival prices and events are generated game assumptions, not live data. Tax, employment, permit, insurance, supplier, credit, and depreciation rules are simplified abstractions. It does not perform real payments, connect to banking, file taxes, register a business, issue contracts, or provide legal/accounting advice.

The prototype stores its save in the browser's `localStorage`. A visitor using another device or browser starts a separate save unless they manually export and import a JSON save. GitHub Pages does not provide a database or secure multiplayer state by itself. For shared, persistent multiplayer, user accounts, and server-authoritative simulation, a separate backend would be required.

## Publish on GitHub Pages

1. Download `index.html` and `README.md`.
2. Sign in to GitHub and create a new repository, for example `realworld-business-sim`.
3. Upload `index.html` to the **root** of the repository (the top-level file list, not a nested folder). Upload `README.md` as well if you want the project notes published with the code.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch `main` and folder `/(root)`, then click **Save**.
7. Wait for the deployment status/link to appear in the Pages area. Open the generated `https://YOUR-USERNAME.github.io/realworld-business-sim/` URL.
8. Test the site on mobile and desktop. Run a few weeks, export a JSON save, and make sure you can import that save again.

Publishing can take a few minutes. The exact URL depends on your GitHub username and repository name.

## Updating the game

Edit `index.html` in GitHub using the pencil/edit button, or edit it locally and upload the updated file. GitHub Pages republishes after the change is committed. Keep a copy of the working `index.html` and periodically export your game save. A change to the internal save format may make old JSON saves incompatible in a future version.

## Suggested production roadmap

1. **Simulation validation:** add automated tests for journal balancing, balance-sheet equation, cash flows, inventory valuation, and edge cases.
2. **More industries:** manufacturing, construction, transport, real estate, wholesale, franchising, and SaaS.
3. **Better accounting:** proper period close, trial balance, cash-flow statement, accounts aging, payment terms, multi-product cost layers, and tax jurisdictions.
4. **Deeper markets:** segmented customers, price elasticity estimates, competitors with goals, procurement lead times, supplier reliability, seasonality, credit cycles, inflation, rates, and labour markets.
5. **Long-term decisions:** locations, leases, equipment financing, capacity investments, product development, quality systems, insurance events, lawsuits, and insolvency/restructuring.
6. **Persistence and multiplayer:** backend database, accounts, server-side simulation turns, backups, anti-cheat validation, and audit logs.
7. **Research-grade realism:** jurisdiction-specific verified data, traceable assumptions, calibration against real financial statements, sensitivity analysis, and scenario testing.

## Run locally

Double-click `index.html` or open it in a modern browser. No build command is required. For best compatibility, use a current Chrome, Edge, Firefox, or Safari browser.
