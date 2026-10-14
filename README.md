# REALWORLD — Layer 9.0 Integrated Business Systems & Continuity

**Candidate build ID:** `RW-LAYER-9.0 · Integrated Business Systems & Continuity · 2026-10-14`  
**Live application:** https://saludariomelven-boop.github.io/realworld-business-sim/  
**Repository:** https://github.com/saludariomelven-boop/realworld-business-sim

Layer 9.0 is one coordinated candidate that builds on the accepted pinned Layer 6.0 engine and preserves the existing Layer 7 / Layer 8 add-ons. It adds business decision context and bounded new operating systems without replacing the core accounting engine.

## Integrated scope

- **Demand explanation:** shows the principal factors behind each product/service demand estimate and an approximate noise range. Stock, capacity, actual sales, and random weekly variation still affect realized results; these are simulated values, not live market data.
- **Logistics & Delivery operations pilot:** adds a persisted job queue, due windows, capacity-reserved throughput, partial completion, variable cost, overdue backlog, and bounded reputation consequences. It runs only for the `logistics-delivery` business template. Job revenue, cost, and tax reserve use existing journal helpers. It is not a real dispatch, route, GPS, or booking platform.
- **Supplier / working-capital integration:** joins current stock, inbound purchase orders, supplier advances, unpaid order balances, stock cover, ETA, and the existing read-only Layer 6 planner. The Operations view adds supplier-specific reorder suggestions that only prefill the existing order inputs, plus observed delivery timing from this company's received orders. It never silently places orders or alters money.
- **Growth decision:** offers a confirmed, capitalized capacity investment using the existing fixed-asset purchase flow. Up to five units are allowed, separated by at least four weeks, with a modeled recurring utility cost. The amount field previews immediate post-outlay cash and headroom against the working-capital planner's reserve without posting a transaction. These are gameplay assumptions, not a guaranteed return.
- **Persistent economic conditions:** bounded demand, service-cost, capacity, and supplier events preserve duration and recent history in the company save. Events do not stack; supplier disruption can extend eligible open PO ETA once. They are simulated, not real economic data.
- **Bounded Philippines source review:** provides four official starting-point links. Logging a review records that action only; it is not legal advice or a legal-compliance certification. Other jurisdictions retain their existing country rulebook, without unverified legal logic being applied across countries.
- **Voluntary business closure:** a confirmed action suspends future operating weeks in that company while preserving its records, cash, obligations, asset register, journal, reports, and exports. The internal core `companyStatus` schema remains intact; closure is stored in the extension state. This does not dissolve a real business.
- **Existing Secretary reliability / accessibility:** the accepted Layer 8.4 module and its tests remain unchanged and load before Layer 9.0.

## Files in this candidate package

Replace the matching repository files together in one commit and add the two new Layer 9 files:

- `index.html` — Layer 9.0 loader and complete four-module script stack.
- `layer9.js` — new integrated enhancement layer.
- `layer9.test.cjs` — new focused regression coverage.
- `loader.test.cjs` — validates the new loader stack and build marker.
- `.github/workflows/realworld-regression.yml` — includes Layer 9 tests and syntax checks.
- `README.md` — this release description.

Do **not** replace `layer7.js`, `layer7.test.cjs`, `layer8.2.js`, `layer8.2.test.cjs`, `layer8.3.js`, `layer8.3.test.cjs`, or `regression.test.cjs`; they remain existing accepted files. No save-format migration is introduced.

## Persistence and financial boundaries

- Company extension state is nested in `game.realworldLayer9` inside the existing version-8 save envelope. No new local-storage key or cloud persistence is introduced.
- Demand explanations and supplier/working-capital snapshots are read-only.
- Growth investments use the core fixed-asset register and journal rather than a duplicate asset ledger.
- Specialist delivery transactions use the core cash / journal helpers. The Layer 9 tax reserve on positive job contribution is deliberately bounded and disclosed; it does not rewrite the core tax model.
- Country review marks are status notes only, never compliance certification.
- Voluntary closure leaves the core schema value `companyStatus` compatible with existing imports; the extension state blocks future weeks and keeps reports available.

## Local test commands

```bash
node --check layer9.js
node --check layer9.test.cjs
node --check loader.test.cjs
node --test layer9.test.cjs loader.test.cjs
```

The repository workflow also runs the preserved Layer 7 / Layer 8 suites and the existing business-engine `regression.test.cjs` suite against the pinned Layer 6.0 core. A passing module test is not a live-browser acceptance result. After the coordinated commit, confirm the GitHub Actions regression workflow and GitHub Pages deployment succeed for the **same commit SHA**, refresh the live app, verify the visible `RW-LAYER-9.0` build marker, and run the external browser acceptance checks.

## Known validation boundary for this candidate

The connected GitHub integration denied permission to create a candidate branch, so this package is prepared for one coordinated commit but is not committed or deployed by this process. Focused Layer 9 and loader tests currently pass locally; one cross-layer guard test is skipped because the unchanged Layer 8.3 file is intentionally not duplicated into this partial replacement package. When applied over the existing repository, that cross-layer test should run alongside the existing Layer 7 / Layer 8 suites. Full browser/UI acceptance, the existing pinned-core regression suite, and financial reconciliation in the hosted environment still require actual GitHub Actions and tester evidence. Do not report those checks as passed until there is direct evidence.
