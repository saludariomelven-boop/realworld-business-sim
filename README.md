# REALWORLD — Business Simulation

**Build ID:** `RW-LAYER-7.0 · Visual Business World & In-Game Guide · 2026-10-13`  
**Live application:** https://saludariomelven-boop.github.io/realworld-business-sim/

REALWORLD is a browser-based business simulation covering company setup, operations, suppliers, sales, staffing, accounting, finance, compliance, and reports.

## Layer 7.0 — Visual Business World & In-Game Guide

Layer 7.0 adds a friendlier presentation while preserving the accepted Layer 6.0 business engine.

- **2D business scenes:** Inline SVG illustrations adapt to retail, café, workshop, and office/service company types. They are static and lightweight.
- **REALWORLD Guide:** An always-available, local help panel explains supported systems using current company information. It offers navigation help but cannot place orders, post journal entries, change cash, or make decisions for the player.
- **Soft Dark and Warm Light:** Appearance is stored in a separate browser preference, not in company financial records.
- **Milestones:** Recognition is derived from recorded game state; it awards no money and does not change accounting.
- **Mobile layout:** The new dashboard presentation, milestone cards, and Guide adapt to narrow screens and respect reduced-motion preferences.

The Guide is offline-first after the add-on has loaded. It requires no AI API, API key, external image service, or third-party model. The initial loader fetches the pinned, public Layer 6.0 HTML snapshot from GitHub Raw, then attaches `layer7.js` from this GitHub Pages origin. This is a deliberate compatibility mechanism to retain the complete, previously audited engine without asking the maintainer to manually merge 326 KB of original source on a phone. The pinned commit is `cca64607926733ee0d1130138606b2753a67dd99`.

**Deployment note:** Because the loader fetches its engine snapshot, the first load needs an internet connection and GitHub Raw must be reachable. If that fetch fails, it shows a retry message and does not modify the browser save. The company continues to run on the GitHub Pages origin, so the previous localStorage save key and origin are retained.

## Existing simulation systems

The preserved engine contains Dashboard, Operations, Market & Sales, People, Finance, Compliance & Risk, and Reports & Journal, with company setup, purchase orders and delivery tracking, demand and pricing, staffing and payroll, loans, fixed assets, accounting, save import/export, validation, and country-aware compliance models.

### Layer 6.0 — Working Capital & Cash Runway Planner

The Finance view contains a read-only working-capital estimate and cash-runway scenarios.

- Estimate: cash + receivables + stocked-goods inventory at cost + supplier advances − selected current operating obligations.
- Exclusions include fixed assets, rental deposits, future term-loan principal, and the overlapping loan-arrears memo to avoid double counting.
- Trend uses up to eight closed periods. No trend is invented when there is no closed cash-flow history.
- Scenarios: recent trend, operating inflows −20%, operating cash outflows +15%, and combined downside.
- Horizons: 4, 8, or 13 weeks. The planner flags the first projected reserve breach without posting transactions.

The planner is a simplified management indicator, not a formal financial statement subtotal or financial advice. Negative forecasts are warnings, not real overdrafts.

## Save and accounting safety

- The preserved company save format remains **v8**.
- Theme preference is stored separately from company data.
- The Layer 7 Guide and rendering code do not call the game's order-placement, journal-entry, or save-mutation functions.
- A company forecast remains distinct from actual recorded cash and transactions.

## Tests

GitHub Actions runs the focused Layer 7 loader and Guide tests, then runs the existing 100+ engine regression tests against the exact pinned Layer 6.0 source snapshot used by the loader. It also checks new JavaScript syntax.

For local testing with Node.js 22:

```bash
node --test loader.test.cjs layer7.test.cjs
node --check layer7.js
node --check layer7.test.cjs
node --check loader.test.cjs
```

The existing `regression.test.cjs` suite can be run against the pinned Layer 6.0 source at `cca64607926733ee0d1130138606b2753a67dd99` if you wish to verify the engine separately. Live browser acceptance is still required after deployment, especially on Android: check app startup, saved-company resume, Guide open/close and screen links, both themes, milestones, purchase-order flows, Finance planner forecasts, and save import/export.

## Release history

- **Layer 7.0:** Visual Business World & In-Game Guide — 2026-10-13.
- **Layer 6.0:** Working Capital & Cash Runway Planning — 2026-10-13.
- **Company save format:** v8.
- **Hosting:** Static GitHub Pages plus a pinned public-source bootstrap.
