# REALWORLD — Layer 10.0 Full Company Intelligence & Business Continuity

**Candidate build ID:** `RW-LAYER-10.0 · Full Company Intelligence & Business Continuity · 2026-10-14`  
**Live application:** https://saludariomelven-boop.github.io/realworld-business-sim/  
**Repository:** https://github.com/saludariomelven-boop/realworld-business-sim

Layer 10.0 is a coordinated release candidate built on the pinned, accepted Layer 6.0 business engine. It preserves the existing Layer 7 AI provider integration, Layer 8.2 advisor presentation, and Layer 9 business systems. It replaces the former downloadable on-device model user experience with an online company-aware assistant and read-only Secretary tools; the old local-model module must not be loaded or retained in the repository.

## Integrated scope

- **Company-aware online assistant:** uses the existing supported Puter/model-provider flow. When the player enables *Give AI full company context*, the prompt receives a structured snapshot of the current saved simulation state, including company identity, financial values, products/inventory, suppliers and orders, people and payroll, loans, assets, journal, weekly history, events, settings, and Layer 9 extension data. Very large lists are safely capped and documented in the snapshot's coverage information. The AI is advisory and cannot post transactions or modify company state.
- **Privacy and control:** the context toggle clearly explains that enabled company data is sent to the selected online provider via Puter for the current AI request. Player notes are not added unless the separate notes-inclusion control is checked. The player can disable full context. Do not include real credentials or sensitive personal/customer data in game notes.
- **No local model:** Layer 10 does not load WebLLM, import a model runtime, inspect WebGPU, download model weights, or run local inference. It avoids the reported freeze path from the downloaded on-device model. Online AI still depends on the user's connection, selected provider/model, and provider account allowance; it is not claimed to be unlimited or offline.
- **Free Secretary tools:** locally generated company brief, cash/risk review, stock/delivery report, team/payroll report, weekly history, priorities, draft supplier message, and ledger overview. These reports are read-only and remain available when online AI cannot connect.
- **Company notes:** company-specific notes remain stored locally in the browser, separate from the business save. Layer 10 migrates saved notes from the previous `realworld-secretary-memory-v1:` key into the new notes namespace without clearing the old key.
- **Closure discoverability:** the voluntary-closure card is moved near the top of Dashboard and also exposed under Reports & Journal. If the older layer card is absent from the generated output, Layer 10 renders a fallback control wired to the existing Layer 9 `data-rw9-action="close-business"` confirmation handler. Existing cash, assets, obligations, journal, history, reports, and exports are meant to remain preserved after closure.
- **Supplier and growth discoverability:** supplier/working-capital and growth-investment panels are promoted near the top of Operations and Finance, reducing the chance of missing a feature that is already present in the engine.
- **Official source consistency:** Layer 9's bounded Philippines review uses DTI, BIR, DOLE, and Philippine Business Hub labels/links consistently. Review marks are status notes only, never legal advice, filing, certification, or a readiness-score transaction.
- **Cache clarity:** the public bootstrap retains the verified pinned Layer 6.0 source, uses versioned URLs for Layer 7, Layer 8.2, Layer 9, and Layer 10 add-ons, and does not load `layer8.3.js`.
- **Preserved business systems:** Layer 9 demand explanations, delivery-job pilot, supplier suggestions and observations, growth capital allocation, time-limited economic events, save extension state, and voluntary-closure engine remain in place. This release does not replace the core accounting logic or change the existing v8 save envelope.

## Files in the coordinated update

Replace/add the following in one commit:

- `index.html` — updated Layer 10 bootstrap, pinned-core verification, and versioned script stack.
- `layer10.js` — full company context, online-assistant routing, Secretary reports/notes, closure discovery, and source consistency.
- `layer10.test.cjs` — focused tests for the new Layer 10 behaviors.
- `loader.test.cjs` — validates the new bootstrap and verifies the local-model module is not loaded.
- `.github/workflows/realworld-regression.yml` — updates CI to include Layer 10 and stop executing removed local-model tests.
- `README.md` — this release description.

**Delete the legacy files `layer8.3.js` and `layer8.3.test.cjs`.** Do not upload or load them as part of this release; they contain the previous downloaded-model code and tests. Keep `layer7.js`, `layer7.test.cjs`, `layer8.2.js`, `layer8.2.test.cjs`, `layer9.js`, `layer9.test.cjs`, `regression.test.cjs`, and the pinned Layer 6 engine unchanged.

## Financial and safety boundaries

- Company snapshots and reports read the current simulation without changing cash, inventory, loans, journal entries, employee records, or saved business state.
- Company data is sent to the external selected AI provider only when the full-context option is enabled and the player asks a question. This is not on-device inference.
- The assistant must distinguish recorded values from forecasts and missing values. It must never claim that it hired staff, placed an order, changed a price, paid a bill, closed a business, or performed another in-game transaction.
- Voluntary closure is a game state, not legal dissolution. It must be intentional, confirmed, and non-destructive to historical data.
- Existing Layer 9 transaction flows continue to use core journal helpers and the pinned core schema. Forecasts stay read-only.
- Data that exceeds the assistant prompt budget is capped with a `coverage.truncatedDetails` explanation; the source business save is not truncated or edited by the snapshot operation.

## Test commands

```bash
node --check layer10.js
node --check layer10.test.cjs
node --check loader.test.cjs
node --test layer10.test.cjs loader.test.cjs
```

The repository workflow also runs the preserved Layer 7, Layer 8.2, Layer 9, and pinned Layer 6.0 accounting regression suites. A passing unit test is not the same as successful real-browser acceptance. After the coordinated commit, verify the GitHub Actions regression result and Pages deployment for the same commit SHA, refresh the live app, confirm the visible Layer 10 build marker, ask questions with full company context enabled, verify closure on both Dashboard and Reports, and test the online AI on a real supported device.

## Important validation boundary

This is a **release candidate package**, not a claim that the hosted game has already been updated. The connected GitHub integration denied permission to create a branch or commit. The bundle's automated tests can be run locally, but the live online-provider flow, real-device performance, Pages deployment, and final closure workflow must be validated after the update is committed and published.

## Revised assistant flow and final integration additions

The online assistant now preflights provider readiness before appending an AI turn. If the provider is signed out, it leaves the question in the composer and asks the player to press the visible **Connect AI** button; it does not attempt to open a sign-in popup after an asynchronous SDK load. Failed requests leave the interface retryable. A company/save object change clears prior company chat and reloads that company's notes so advice does not silently reuse a previous company's context.

The release acceptance prompt is included at `AI_TESTER_ACCEPTANCE_PROMPT.md`; one-commit application instructions are in `APPLY_UPDATE.md`.

### Previously downloaded model files

The application removes all local-model runtime and loading code and will not load/download/use WebLLM going forward. A model that was downloaded by an older build might still exist in browser-managed Cache Storage, IndexedDB, or origin-private storage. This release does not clear all browser storage automatically because that can also delete locally saved businesses. Keep exported backups before manually clearing any site data for storage recovery.
