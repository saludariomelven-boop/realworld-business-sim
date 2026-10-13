# REALWORLD — Layer 8.1 Universal AI Assistant & Sign-in UX

**Build ID:** `RW-LAYER-8.1 · Universal AI Assistant · Sign-in UX & Metadata Fix · 2026-10-14`  
**Live application:** https://saludariomelven-boop.github.io/realworld-business-sim/

Layer 8.1 is a cumulative maintenance release on top of Layer 8.0. It preserves the Layer 7 visuals, Puter.js universal assistant, business engine, accounting behavior, and company save format v8 while fixing the stale loader build label and making Puter sign-in an explicit, less surprising step.

## What changed in Layer 8.1

- Adds a **Connect AI** button. Players can initiate Puter sign-in intentionally before asking their first question.
- Checks Puter's documented `puter.auth.isSignedIn()` status when available and displays whether AI is connected.
- Calls `puter.auth.signIn()` from the Connect AI click path, respecting browser popup requirements.
- When Puter explicitly reports that the user is signed out, asking AI is blocked before the question or chat context is sent. The input remains available and the UI explains that the player should connect first.
- Cancelling sign-in leaves the built-in Guide available and Connect AI retryable. REALWORLD itself remains usable without connecting AI.
- Clarifies that Puter uses each player's own account and allowance. Existing browser sessions may be remembered by Puter; the app does not promise that a login always persists.
- Updates the loader's visible initial build metadata and loading copy to Layer 8.1, resolving the stale Layer 7 label observed in Layer 8 live audit.
- Keeps all prior Layer 8 protections, including opt-in company context, opt-in web search, fallback labels, safe text rendering, and no transaction tools.

## Universal AI behavior

- Ask general questions or ask about business, marketing, accounting, staffing, economics, writing, education, and other topics in natural language.
- Streams model text into the existing assistant panel.
- Default model: `openai/gpt-6.1-sol`. Other selectable models: `openai/gpt-6-astra`, `openai/gpt-6-luna`, and `openai/gpt-oss-120b`.
- Optional web search uses Puter's documented `tools: [{ type: 'web_search' }]` option. Leave it off unless the question needs current information.
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

- `index.html` — the small bootstrap remains intact; only the public build metadata/loading copy is updated.
- `layer7.js` — filename intentionally retained because the loader already requests it.
- `layer7.test.cjs`
- `loader.test.cjs`
- `README.md`
- `.github/workflows/realworld-regression.yml`

**Do not replace `regression.test.cjs`.** The existing accounting/business-engine test suite is retained unchanged. The loader continues to fetch the exact pinned Layer 6.0 HTML snapshot and loads `layer7.js` from the GitHub Pages origin. The add-on reports the Layer 8.1 build identity at runtime.

Commit the changed files, then inspect the newest **REALWORLD Regression Tests** run. Do not treat the release as live-verified solely because local tests pass.

## Tests

The current focused package test suite covers the Layer 8.1 assistant, auth UX, and loader behavior. These tests mock Puter responses and do not consume account usage or prove that a live Puter model call succeeds.

With Node.js 22 from the repository root:

```bash
node --test loader.test.cjs layer7.test.cjs
node --check layer7.js
node --check layer7.test.cjs
node --check loader.test.cjs
```

GitHub Actions additionally runs the unchanged accounting/business-engine regression suite against the exact pinned Layer 6.0 source snapshot, then restores the bootstrap in the test workspace. Live Puter/model acceptance is a separate manual test after deployment.

## Live acceptance checklist

1. Open REALWORLD. Confirm the landing label says Layer 8.1, the company resumes, and themes, illustrations, and milestones remain.
2. Open **REALWORLD AI**. Confirm Puter.js loads only after opening the panel.
3. If signed out, verify **Connect AI** appears and that pressing Ask AI does not send a question until connection succeeds.
4. Press **Connect AI**. Confirm Puter sign-in opens only after the click, the status becomes connected after successful sign-in, and the control is hidden once connected.
5. Reload and verify the UI reflects any Puter session that Puter retains; do not assume sessions always persist.
6. Ask a general question with company context off. Verify actual streamed model text arrives. Authentication and model availability still require a real account-backed test.
7. Enable company context and compare answers about current cash/week against Finance/Reports. Turn it back off afterward.
8. Optionally enable web search and verify source quality and date relevance.
9. Clear the conversation and confirm prior content is gone from the visible history.
10. Before and after AI questions, compare cash, inventory, purchase orders, employees, week number, journals, and save state. They must not change merely because the assistant was asked.
11. Keep manual 375px mobile-view and valid/invalid save-import checks as pre-release follow-ups.

## Release history

- **Layer 8.1:** Cumulative sign-in UX and stale build metadata fix — 2026-10-14.
- **Layer 8.0:** Universal AI Business Assistant via Puter.js — 2026-10-13.
- **Layer 7.0:** Visual Business World & In-Game Guide — 2026-10-13.
- **Layer 6.0:** Working Capital & Cash Runway Planning — 2026-10-13.
- **Company save format:** v8, unchanged.
