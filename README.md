# REALWORLD — Layer 8.3 Free Business Secretary Foundation

**Build ID:** `RW-LAYER-8.3 · Free Business Secretary · Local AI & Company Tools · 2026-10-14`  
**Application:** https://saludariomelven-boop.github.io/realworld-business-sim/

Layer 8.3 builds on the accepted Layer 8.2 Business Desk without rewriting the business simulation engine. It introduces read-only secretary tools that do not use AI messages, short private notes stored in this browser, and an optional on-device language model for supported devices.

## Goals and safety boundaries

- Make routine company assistance available without a hosted-model daily message counter.
- Give the secretary direct read-only access to the currently open simulation company: cash, totals, payables, inventory, purchase orders, staffing counts, loan fields, and closed-week history.
- Keep the existing Layer 6.0 engine, save format, Layer 7 visuals, Layer 8.1 online assistant, and Layer 8.2 advisor presentation unchanged.
- Do not provide the language model unrestricted functions that can modify company records.
- Never automatically send a question to the online provider when on-device mode is selected but unavailable.

## Free tools that work without an AI request

The Business Desk adds these local, read-only actions:

- **Company brief:** company identity, current week, available cash, accumulated revenue/net result, reputation, team size, catalogue count, and last closed week.
- **Cash and risk review:** recorded cash, receivables, payables, overdraft, loan arrears, rent/utilities/payroll/tax liabilities, and priority warnings derived from known values.
- **Stock and deliveries:** physical-goods stock, open purchase orders, expected/due/overdue status, and delay counts.
- **Team and payroll:** headcount by role and modeled monthly payroll, without listing employee names.
- **Weekly report:** recorded closed-week results. A new company with no closed weeks is explicitly shown as having no history rather than being assigned made-up results.
- **What needs attention?:** a short priority list from deterministic checks of available simulation data.
- **Draft supplier message:** a draft based on the oldest open order when available. It is never sent automatically.
- **Company notes and goals:** a bounded 1,000-character note stored in browser local storage and namespaced by a stable fingerprint of the company identity. It is separate from the game save. Browser-local notes are not cloud-synced or encrypted by this add-on.

All these actions run as local application code. They do not call Puter, another AI provider, or any transaction function. Missing values stay unknown; warnings are limited checks, not guarantees that every risk has been found.

## Optional on-device advisor

The add-on offers an explicit setup button for WebLLM with the quantized `Llama-3.2-1B-Instruct-q4f16_1-MLC` build. The runtime is pinned to WebLLM `0.2.86`. Model/runtime assets are downloaded from their publishers only after the player presses **Set up free on-device advisor**.

Important limits:

- Requires a secure page, WebGPU, and sufficient browser/GPU memory. Compatibility and performance depend on the actual device and browser.
- The initial model download is substantial and may be slow. It is not loaded automatically and it can fail on phones or low-memory devices.
- The model is smaller than the hosted advisors, so its answers may be less capable or less accurate.
- After setup succeeds, on-device chat inference does not use the player's Puter/hosted-provider message allowance. Prompts are not sent to an online inference provider in on-device mode. Downloading the runtime and model still requires network access unless the browser has already cached all needed assets.
- Company data and saved secretary notes are included in local model prompts only when the explicit local-context switch is enabled.
- The player can explicitly unload the on-device model to release GPU resources. The app switches local mode off at the same time to prevent questions getting stuck in an unloaded local path; the player can set it up again later. Browser and graphics drivers may still retain memory until the tab is closed.
- If local inference is unavailable, the player can keep using the free secretary tools or switch back to the existing online provider. The app does not silently switch providers.

The app must not promise unlimited powerful AI on every device. The dependable universal layer is the local company-toolkit; open-ended on-device language generation is an opt-in capability where hardware permits.

## What is not implemented yet

- No payment processing or paid subscription has been added. Premium intelligence is a future, optional product tier, not a requirement for routine company management.
- No company-changing action tools are exposed to AI. Ordering stock, hiring, changing prices, taking loans, posting records, and closing weeks must remain in the existing validated game UI until a separate permissioned action-plan system has been designed and audited.
- No remote shared secretary memory or account synchronization is added.

## Repository files

Replace or add these files from the package:

- Replace `index.html` — update loader metadata and add `layer8.3.js` after the existing add-ons. The pinned Layer 6.0 engine URL remains unchanged.
- Add `layer8.3.js` — free secretary toolkit, browser-local notes, and opt-in local-model adapter.
- Replace `loader.test.cjs` — tests for the Layer 8.3 loader stack.
- Add `layer8.3.test.cjs` — tests for reports, private memory, local prompt context, WebGPU gating, and the no-mutation boundary.
- Replace `.github/workflows/realworld-regression.yml` — adds Layer 8.3 tests while preserving the pinned engine regression step.
- Replace `README.md` — this release note.

**Do not replace** `layer7.js`, `layer7.test.cjs`, `layer8.2.js`, `layer8.2.test.cjs`, or `regression.test.cjs`.

## Verification

Locally verified in Node.js 22 for this add-on package:

- `node --test loader.test.cjs layer8.3.test.cjs` — 15 tests passed.
- `node --check layer8.3.js`
- `node --check layer8.3.test.cjs`
- `node --check loader.test.cjs`

The existing Layer 7/8.2 and business-engine tests must also run in GitHub Actions after the package files are committed. Automated tests mock inference and **do not** prove the live WebLLM model downloads or runs on a particular device.
