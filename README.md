# REALWORLD Layer 12.1 — Final-for-now integrated update

**Release:** `RW-LAYER-12.1.0 · Business Partner & shared-service consolidation · 2026-10-17`

This is the next integrated phase after the existing Layers 7–11. It is intended to be the final planned feature update for now. After this is configured and passes CI, use `FINAL_ACCEPTANCE_TESTER_PROMPT.txt` for one independent end-to-end audit, then fix the audit findings as a single cleanup pass.

## What this update changes

- Replaces the browser-based, player-account provider with a shared Google Gemini service called by a Cloudflare Worker. No player needs a Gemini/Puter account, a personal API key, or a separate payment checkout.
- Uses `gemini-3.8-flash` first and tries `gemini-3.5-flash-lite` if the primary model is unavailable or rate-limited.
- Keeps the provider API key in Cloudflare Worker secrets. `assistant-config.js` holds only the public HTTPS endpoint.
- Renames the visible guide to **Business Partner**. Build IDs, model names, old sign-in/provider controls, and old assistant labels are hidden from the player-facing UI, including the initial render.
- Includes active-company data by default for company-aware answers, with a visible **Use active company details** toggle and a clear privacy disclosure. Turn it off for general questions.
- Gives the Business Partner access to a structured current company snapshot by default (with a visible opt-out); it can answer questions about the game's recorded cash, sales/history, stock, orders, staff, loans, assets, events, risks, and saved decisions; open supported game views; show read-only local reports; and stage supported selling-price, marketing, market-positioning, and capacity-growth changes for review. The prompt explicitly allows only those validated in-game tools, and corrects the legacy prompt that incorrectly described all game actions as impossible.
- Keeps irreversible and high-impact flows—purchases, supplier orders, loans, staffing/payroll, week close, deleting a company, and business closure—inside the existing native game controls. The assistant must not claim it completed them.
- Adds Worker tests for origin handling, missing secrets, oversized requests, rate limiting, model fallback, and exhausted shared quota; keeps all existing simulation regression tests in the CI workflow.

## Important service limits and privacy

This is **not pay-to-win through individual player accounts**: every player uses the same game-owned service. It is not unlimited, though. The Google API's shared project quota can still run out; when both model attempts fail, the assistant pauses for everyone rather than asking a player to pay. If the owner enables a paid Google API tier, the owner—not each player—may incur charges. Do not enable paid billing unless you accept that cost. Google states that free-tier API content may be used to improve products; the in-game Connection and privacy section discloses this. Do not enter real or confidential information into game notes.

Current official references:

- Gemini model catalog: https://ai.google.dev/gemini-api/docs/models
- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini API billing and spend controls: https://ai.google.dev/gemini-api/docs/billing
- Gemini OpenAI-compatible API and tool calling: https://ai.google.dev/gemini-api/docs/openai
- Cloudflare Workers rate-limit binding: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

Provider free quotas, data terms, available models, and prices can change. Check AI Studio before deployment. CORS is not authentication; the Worker also uses a rate-limit binding and provider-side quotas, so deploy it with the provided protection and avoid exposing a paid key in client files.

## Files in this bundle

### Add or replace in the repository

- `.github/workflows/realworld-regression.yml` — full regression suite and syntax checks, including the Worker tests.
- `index.html` — release 12.1.0 bootloader, early UI cleanup, pinned engine retained.
- `assistant-config.js` — public endpoint configuration. Set `endpoint` to the deployed Worker's HTTPS `/chat` URL before the live test.
- `layer12.js` — shared-service client, Business Partner UI, company tools, validation, and staged action bridge.
- `layer12.test.cjs` — focused client/guardrail tests.
- `layer10.test.cjs` and `layer11.test.cjs` — complete existing test files with loader/version expectations updated.
- `loader.test.cjs` — verifies the release, loaded files, shared endpoint config, and absence of direct client provider use.
- `cloudflare-worker/src/index.js` — Gemini-backed shared service.
- `cloudflare-worker/src/index.test.mjs` — Worker tests.
- `cloudflare-worker/package.json` and `cloudflare-worker/wrangler.toml` — Worker package/deployment settings.
- `WORKER_SETUP.md`, `INSTALL_CHECKLIST.txt`, and `FINAL_ACCEPTANCE_TESTER_PROMPT.txt` — setup, upload checklist, and the one post-deployment audit prompt.

## Do not replace these accepted simulation modules

Leave these existing repository files unchanged: the pinned Layer 6 core source, `layer7.js`, `layer8.2.js`, `layer9.js`, `layer10.js`, `layer11.js`, `layer7.test.cjs`, `layer8.2.test.cjs`, `layer9.test.cjs`, and `regression.test.cjs`. This bundle deliberately does **not** include a replacement `layer10.js` or `layer11.js` runtime. Their existing company state, accounting, decision ledger, business closure, and game save paths must be preserved.

## Recommended one-pass release order

1. Read `WORKER_SETUP.md` and deploy the Worker with its API key stored as a Cloudflare **Secret**, not in GitHub.
2. Paste the Worker URL into `assistant-config.js`. Use the exact deployed URL ending in `/chat`.
3. Create one branch from the current green baseline and upload all repository files listed above, preserving their folders. Do not upload `layer10.js` or replace the pinned core.
4. Run the entire GitHub Actions workflow. Do not merge if any test is red.
5. After the Worker reports `configured: true`, GitHub Pages is updated, and CI is green, open `FINAL_ACCEPTANCE_TESTER_PROMPT.txt` and run it against the live game. It audits the entire update—not a repeat of a provider-specific test. Use the report for the final cleanup pass.

The initial endpoint in `assistant-config.js` is intentionally blank. Until the Worker's endpoint is entered and the Worker has its server-side secret, online Business Partner requests will fail closed with a clear configuration message; the game itself should still load and local reports should still work.
