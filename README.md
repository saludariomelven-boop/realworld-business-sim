# REALWORLD — Layer 8.0 Universal AI Assistant

**Build ID:** `RW-LAYER-8.0 · Universal AI Business Assistant · 2026-10-13`  
**Live application:** https://saludariomelven-boop.github.io/realworld-business-sim/

Layer 8.0 upgrades the limited local Guide into an open-ended AI assistant using Puter.js. It preserves the existing Layer 7 visual design, company engine, accounting behavior, and save format v8.

## What changes

- Ask general questions or ask about business, marketing, accounting, staffing, economics, writing, and other topics in natural language.
- Streams model text into the existing assistant panel.
- Default model: `openai/gpt-6.1-sol`. Other selectable models: `openai/gpt-6-astra`, `openai/gpt-6-luna`, and `openai/gpt-oss-120b`.
- Optional web search is available through Puter's documented `tools: [{ type: 'web_search' }]` option. Leave it off unless the question needs current information.
- Optional company context is **off by default**. When enabled, only a compact simulation snapshot is included: current week/status/cash, selected totals and recent closed weeks, limited product and open-order data, workforce counts by role, loan balances, and selected cash-runway forecast fields. It does not include the full save, journal ledger, founder name, employee names, or customer names.
- Recent conversation history is held in page memory only by this add-on; use **Clear conversation** to remove it before new unrelated questions. REALWORLD does not add the chat to the company save.
- The AI has no action tools. It cannot place orders, hire employees, change prices, advance a week, post journal entries, or edit saved company state.
- If Puter/model access fails, the UI clearly labels a built-in Guide fallback; it never pretends the local answer came from the AI.
- Puter.js is lazy-loaded only after opening the Guide. No separate backend, OpenAI API key, Worker, or secret is needed.

## Important usage and privacy notes

Puter's User-Pays model means the user signs in through Puter and the selected model usage is attributed to their Puter account. It does **not** guarantee unlimited free use for every user; account allowances, service limits, model availability, and possible upgrade terms are controlled by Puter. See the [Puter tutorial](https://developer.puter.com/tutorials/free-unlimited-openai-api/) and [User-Pays documentation](https://docs.puter.com/user-pays-model/).

The browser loads `https://js.puter.com/v2/` in the app's page context when the Guide opens. This is a third-party runtime dependency; if you do not trust that dependency, do not enable this integration. Questions and bounded recent chat history are sent to Puter and the selected model provider when the player presses **Ask AI**. Company data is attached only when the player enables **Include a compact snapshot of my current company**. Puter and its providers process requests under their own policies; do not send passwords, payment details, or sensitive customer information.

The assistant is designed to prefer accuracy over confidence, distinguish actual modeled values from forecasts and assumptions, and admit uncertainty. Models can still produce incorrect answers. Verify important accounting decisions and real-world legal, tax, medical, safety, and financial matters with reliable sources or qualified professionals.

## Models

The default is GPT-6.1 Sol as a quality/speed balance. GPT-6 Astra is offered for more demanding questions; GPT-6 Luna is a lighter choice; GPT-OSS 120B is the open-weight option. Availability can change at Puter, so the player can choose another supported model if one fails. These labels are choices, not claims that any model is always correct.

The implementation uses the documented messages-array call form `puter.ai.chat(messages, false, options)`, streams with `stream: true`, and renders returned model text as escaped text instead of HTML. It does not display reasoning chunks as answer text. Web search is opt-in and is only requested when the user enables it.

## Installation into the existing GitHub repository

Replace these files completely with the matching files in this package:

- `layer7.js` (filename intentionally retained because the current loader already requests it)
- `layer7.test.cjs`
- `loader.test.cjs`
- `README.md`
- `.github/workflows/realworld-regression.yml`

**Do not replace `index.html` or `regression.test.cjs`.** The current `index.html` is the known-good small loader, and the engine regression test is retained unchanged. The loader continues to fetch the exact pinned Layer 6.0 HTML snapshot and loads `layer7.js` from the GitHub Pages origin. The add-on itself now reports the Layer 8.0 build identity at runtime.

Commit the changed files, then inspect the newest **REALWORLD Regression Tests** run. Do not treat the release as live-verified solely because local tests pass.

## Tests

The current focused package check passes **21 tests** across the Layer 8 assistant and existing loader harness. These tests mock Puter responses and do not consume account usage or prove that a live Puter model call succeeds.

With Node.js 22 and from the repository root:

```bash
node --test loader.test.cjs layer7.test.cjs
node --check layer7.js
node --check layer7.test.cjs
node --check loader.test.cjs
```

GitHub Actions additionally runs the unchanged accounting/business-engine regression suite against the exact pinned Layer 6.0 source snapshot, then restores the bootstrap in the test workspace. The focused tests mock Puter responses; they do not consume Puter allowance or prove that an actual user account/model call succeeds. Real Puter/model acceptance is a separate manual test after deployment.

## Live acceptance checklist

1. Open REALWORLD. Confirm the company resumes and both themes, illustrations, and milestones remain.
2. Open **REALWORLD AI**. Confirm Puter.js is loaded only after opening the panel and status changes to ready.
3. Ask a general question with company context off. Complete any Puter sign-in flow the SDK presents.
4. Choose GPT-6.1 Sol, then test another model only if desired. Confirm streaming text arrives, errors are readable, and retry/model selection are usable.
5. Enable company context and ask about current cash or the latest closed week. Compare every figure with Finance/Reports. Uncheck it again for general questions.
6. Optionally enable web search and ask a question that needs current information. Check source quality and date relevance; disable web search for ordinary questions.
7. Clear the conversation and confirm prior content is gone from the visible history.
8. Before and after AI questions, compare cash, inventory, purchase orders, employees, week number, journals, and save state. They must not change merely because the assistant was asked.
9. Test the no-network or model-error case and confirm the response is explicitly marked as the built-in fallback.
10. Still perform the separate manual 375px mobile-view and save-import checks noted in the Layer 7 QA report.

## Release history

- **Layer 8.0:** Universal AI Business Assistant via Puter.js — 2026-10-13 (integration package; live AI account/model use still requires acceptance testing).
- **Layer 7.0:** Visual Business World & In-Game Guide — 2026-10-13.
- **Layer 6.0:** Working Capital & Cash Runway Planning — 2026-10-13.
- **Company save format:** v8, unchanged.
