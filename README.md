# REALWORLD — Layer 11.0 Weekly Command Center & Runtime Diagnostics

**Release marker:** `RW-LAYER-11.0 · Weekly Command Center & Runtime Diagnostics · 2026-10-14`  
**Live application:** https://saludariomelven-boop.github.io/realworld-business-sim/  
**Repository:** https://github.com/saludariomelven-boop/realworld-business-sim

Layer 11.0 builds on the deployed Layer 10 company-aware assistant and the previously accepted Layer 9 business systems. It adds a player-facing Weekly Command Center, persistent per-week review markings, and integrated-module diagnostics. It does not replace the Layer 6 business engine, change the financial journal, simulate a transaction when a player asks for advice, or add an artificial event trigger.

## What is added

### Weekly Command Center

- A new review panel is injected near the top of Dashboard and into Reports & Journal.
- Shows company/week identity, recorded cash, the latest saved weekly net result when available, priority-item count, and active-event/queued-job counts.
- Builds an explainable review list from actual saved fields: cash versus recorded monthly rent/utilities, overdraft, loan arrears, recorded tax/AP/payroll liabilities, overdue or due purchase orders, goods with positive baseline demand but no stock, active temporary economic conditions, overdue specialist delivery jobs, and whether any weekly history exists.
- The list is bounded to ten items, only evaluates fields that exist, and calls out that not detecting a signal is not proof that no risk exists.
- A player can mark an item reviewed for the current simulation week. This records the key, company-save-local week/date, and review label in `game.realworldLayer11`; it does not award a score, move money, order goods, alter inventory, affect legal compliance, or automatically clear the underlying issue. Duplicate review clicks are guarded, review records are capped at 120, and the normal save routine is requested.
- For closed or bankrupt businesses, the panel shows a history-review message instead of live operating recommendations.

### Runtime diagnostics

- The panel exposes a collapsible status readout. Layer 9 and Layer 10 show as available only when their runtime initialization APIs report ready; merely finding a loaded file is insufficient.
- The public loader and cache key are updated to `11.0.0`, with `layer11.js` added after the existing supported add-ons.
- Layer 6 remains pinned to the already verified commit `cca64607926733ee0d1130138606b2753a67dd99`.
- Layer 8.3 is not loaded. No downloaded-model runtime, WebLLM import, model weight fetch, or on-device LLM path is added.

## Existing systems preserved

Keep the current `layer7.js`, `layer8.2.js`, `layer9.js`, and `layer10.js` implementations unchanged when applying this release. The online full-company-context assistant, separate notes opt-in, local Secretary reports, supplier planning, growth investment, logistics jobs, economic events, Philippines source review, voluntary closure, and existing financial records are retained. No accounting behavior is intentionally changed by Layer 11.

## Files to apply in one commit

Replace/add together:

- `index.html`
- `layer11.js` (new)
- `layer11.test.cjs` (new)
- `layer10.test.cjs` (updates its loader expectation for Layer 11; leaves Layer 10 runtime code unchanged)
- `loader.test.cjs`
- `.github/workflows/realworld-regression.yml`
- `README.md`
- `APPLY_UPDATE.md`
- `AI_TESTER_ACCEPTANCE_PROMPT.md`

**Do not overwrite** the existing `layer7.js`, `layer8.2.js`, `layer9.js`, `layer10.js`, `layer7.test.cjs`, `layer8.2.test.cjs`, `layer9.test.cjs`, or `regression.test.cjs` with the reference snapshots included in this bundle. Those are included only to run and inspect this candidate locally. The only existing code-test file changed for this release is `layer10.test.cjs` because it verifies the evolving loader stack.

Delete `layer8.3.js` and `layer8.3.test.cjs` in the same commit if they still exist in the repository. The workflow does not execute the old local-model test. Do not make a separate deletion commit, and do not clear browser site data to remove old cached weights; that could delete locally saved companies.

## Automated checks performed on this candidate

The following local suites were run together:

```bash
node --test layer9.test.cjs layer10.test.cjs layer11.test.cjs loader.test.cjs
```

Result: **49 tests passed, 0 failed** in this local package. The run covered Layers 9 and 10 behavior tests available in this bundle, Layer 11 decision-queue behavior, loader behavior, and cross-layer static guards. This count does **not** include the repository's Layer 7, Layer 8.2, or pinned Layer 6 regression suites, because their test files are not part of this release bundle; GitHub Actions is configured to run them from the repository.

All included JavaScript/test files were checked with `node --check`. Passing automated tests do not substitute for post-deployment browser acceptance.

## Acceptance remains required

The previous Layer 10 report did not prove the closure workflow, transaction reconciliations, assistant Q&A, or mobile behavior end to end because the browser execution path was unavailable. Layer 11 does not treat that infrastructure failure as a code defect and does not claim to fix those unverified flows. After deployment, run `AI_TESTER_ACCEPTANCE_PROMPT.md` against the new Layer 11 build. It asks the tester to re-run the previous critical gates plus the new Command Center tests with a disposable company, without touching the user's existing company.
