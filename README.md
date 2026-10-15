# REALWORLD 11.2.0 — Reliability & Continuity Release Candidate

This is a consolidated **complete-file replacement bundle** for the current deployed 11.1.0 build. It carries the four low-severity issues found during 11.1.0 acceptance into one grouped update; it is not a sequence of patches.

## Required replacement files (replace all six in one commit)

1. `index.html`
2. `layer10.js`
3. `layer10.test.cjs`
4. `layer11.js`
5. `layer11.test.cjs`
6. `loader.test.cjs`

The bundle deliberately does **not** replace the pinned Layer 6 engine, `layer7.js`, `layer8.2.js`, `layer9.js`, `layer9.test.cjs`, `regression.test.cjs`, or the workflow. The Layer 10 integration layer applies the visual and control-state corrections without changing the accounting engine or investment economics.

## Included fixes

- Growth and working-capital panels are explicitly moved directly beneath the Finance page heading after render, in addition to the existing HTML promotion logic.
- A capacity-investment cooldown is displayed as a disabled, grey control with a clear `Available in N weeks` label, rather than a green-looking action that does nothing.
- The single-loan status summary displays the stored annual rate to one decimal place (e.g., 12.5%), matching the loan approval notification instead of rounding it to 13%.
- After voluntary closure or bankruptcy, the global Close week control is disabled, receives an accessible label/title, and gets a non-actionable appearance. Returning to an active company clears only the closure-specific disabled state.
- Release metadata and the five script cache keys are updated together to `11.2.0`.
- New regression tests cover these behaviors.

## Safe application and release flow

1. Keep live `main` at its current accepted 11.1.0 commit until this release candidate is ready.
2. Create a development branch in GitHub and upload/replace all six files together. Do not upload them piecemeal to `main`.
3. Open a pull request. Wait for the existing `REALWORLD Regression Tests` workflow to pass, including the pinned-engine 109-test regression suite and syntax checks.
4. Merge only after CI passes. Wait for Pages deployment to finish.
5. Run `PHASE5_ACCEPTANCE_PROMPT.md` on the deployed 11.2.0 release. It includes the four acceptance defects, a controlled 13-week continuity scenario, and an export/import round-trip.
6. Do not declare the release complete until the 13-week scenario, restore test, and post-closure controls have been verified. A local test result does not replace GitHub CI or live browser acceptance.

The connected GitHub integration previously rejected branch creation with HTTP 403, so this bundle has **not** been pushed or deployed by this session. The current deployed 11.1.0 app remains untouched.

## Testing performed while preparing this bundle

- `node --check` passed for modified JavaScript and test files.
- Focused tests: **43 passed, 0 failed** for `layer10.test.cjs`, `layer11.test.cjs`, and `loader.test.cjs`, with the Layer 9 test dependency present locally. The test-only copy used to satisfy the dependency was not included in this replacement bundle.
- The complete GitHub workflow has not yet been rerun against this 11.2.0 candidate.
