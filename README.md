# REALWORLD — Layer 8.3.2 Secretary Content & Focus Fix

**Build ID:** `RW-LAYER-8.3.2 · Secretary Content & Focus Fix · 2026-10-14`  
**Application:** https://saludariomelven-boop.github.io/realworld-business-sim/

Layer 8.3.2 is a focused follow-up to the accepted Layer 8.3.1 panel scroll fix. Live acceptance testing confirmed that the full Business Desk can scroll up and down again, but the secretary card's own height limit created a nested scrolling area. The question composer could also overlay the company-notes section in some layouts.

## Changes

- Keep the Business Desk panel as the single vertical scroll region.
- Remove the secretary card's independent height limit and vertical scrolling, so all eight tool buttons and the notes section flow into the panel's normal content.
- Let conversation messages grow in normal flow rather than introducing a second scroll area.
- Return the question form to normal flow so it cannot cover the notes textarea while scrolling.
- Explicitly preserve pointer interaction on the notes textarea.
- Update build metadata and regression tests for Layer 8.3.2.

## Safety boundaries preserved

- The pinned Layer 6.0 simulation engine URL is unchanged.
- The existing save format, game transactions, company state and reporting logic are unchanged.
- Secretary reports remain read-only; company notes stay in separate browser-local storage.
- The workflow file is not changed; the existing workflow already runs `layer8.3.test.cjs` and `loader.test.cjs`.
- No model download, hosted AI request, or account sign-in is required for this layout change.

## Replace in the repository root

Replace these four files with the versions in this package:

- `index.html`
- `layer8.3.js`
- `layer8.3.test.cjs`
- `loader.test.cjs`

Do not modify `.github/workflows/realworld-regression.yml`, `layer7.js`, `layer7.test.cjs`, `layer8.2.js`, `layer8.2.test.cjs`, or `regression.test.cjs`.

## Local verification

Run:

```sh
node --test loader.test.cjs layer8.3.test.cjs
node --check layer8.3.js
node --check loader.test.cjs
node --check layer8.3.test.cjs
```

Note: `node --check index.html` is not supported by Node as HTML, so the relevant JavaScript syntax checks are the `.js` and `.cjs` files. The live browser test remains necessary to confirm mouse/touch scrolling and textarea focus on real devices.
