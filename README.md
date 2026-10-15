# REALWORLD 11.1.0 — Reality & Reliability Integrated Release

This is a **complete replacement-file bundle** based on the currently audited Layer 11.0.1 source snapshots. It does not contain snippets or partial patches.

## What this release changes

- Introduces one integrated release identity: `RW-LAYER-11.1.0 · Reality & Reliability Integrated Release · 2026-10-15`.
- Cache-busts all five integrated scripts with `?v=11.1.0`.
- Prevents Layer 10 navigation wrappers from overwriting the shared application version label with the Layer 10 module label.
- Makes the dashboard status badges and first-run hero summary reflect voluntary closure, and prevents a bankrupt company from displaying an active trading badge.
- Shows free local Secretary reports in a visible, selectable report output area even when online AI is not connected.
- Clears visible Secretary report output when switching to a different company, avoiding stale cross-company report display.
- Adds regression tests for the above behaviors.

## Files to replace (all six together)

1. `index.html`
2. `layer10.js`
3. `layer10.test.cjs`
4. `layer11.js`
5. `layer11.test.cjs`
6. `loader.test.cjs`

Do **not** replace `layer7.js`, `layer8.2.js`, `layer9.js`, the pinned Layer 6 engine, `regression.test.cjs`, or `.github/workflows/realworld-regression.yml` from this bundle. Those are unchanged by this update.

## Safe application procedure

1. Preserve current commit `2796da8e7b304c2d45d1f1a05493b9bb0a86c3b8` as the rollback reference.
2. Upload/replace all six files in one commit on the intended development/update branch if the GitHub interface permits it. Avoid deploying a partial mix of 11.0.1 and 11.1.0 cache keys.
3. Wait for the existing `REALWORLD Regression Tests` workflow. It should run the full current add-on suite, the 109-test pinned-engine regression suite, and syntax checks.
4. Do not treat the local test result in this package as a substitute for CI or browser acceptance.
5. Only merge/deploy after the full workflow passes. Then run `PHASE4_ACCEPTANCE_PROMPT.md` against the deployed 11.1.0 build.

## Testing performed before packaging

- `node --check` passed for the modified JavaScript/test files and the inline bootstrap extracted from `index.html`.
- Focused Node test run: **41 passed, 0 failed** across `layer10.test.cjs`, `layer11.test.cjs`, and `loader.test.cjs`.
- The local container did not contain all current untouched repository sources, so the full workflow and live browser acceptance have **not** been claimed as passed. The existing CI workflow must run against the complete repository after the six replacements are applied.

## Important limitation

The connected GitHub integration rejected branch creation with HTTP 403 (write access is unavailable from this session). No source files were pushed, no branch was created, and the live deployment remains unchanged. This bundle is the prepared development release for one consolidated application/commit cycle.
