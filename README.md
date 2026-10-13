# REALWORLD — Layer 8.2 Business Desk Polish

**Build ID:** `RW-LAYER-8.2 · Business Desk · Clear Answers & Responsive Advisor Controls · 2026-10-14`  
**Live application:** https://saludariomelven-boop.github.io/realworld-business-sim/

Layer 8.2 is an additive presentation layer based on the accepted Layer 8.1 live acceptance test. It preserves the Layer 7/8.1 visuals and assistant logic, the exact pinned Layer 6.0 business engine, accounting rules, browser company saves, explicit Puter account connection, optional company context, optional web search, and the advice-only boundary.

## Player-facing improvements

- **Business Desk instead of a model catalogue.** The assistant launcher and panel use in-world business language. Four named virtual advisors—Mara, Darius, Lina, and Theo—offer different answer styles. Provider model names are not shown as player-facing profiles.
- **Clean, formatted answers.** Headings, bold text, lists, tables, quotations, code blocks, and ordinary HTTPS/HTTP links are formatted to be easier to read. Raw HTML is escaped. Only HTTP/HTTPS links can become clickable.
- **No accidental question prefix.** Opening the Business Desk from the dashboard leaves the input empty instead of pre-filling “What should I focus on next?”. Suggested question buttons remain available.
- **Usable across devices.** Advisor choices are visible buttons rather than a small native dropdown. The picker supports touch, mouse, Tab/Enter, arrow-key navigation, and Escape. Buttons use larger touch targets. Layout rules cover desktop, tablets, phones, and narrow screens.
- **Privacy remains opt-in.** Company context and web search stay off by default. The full save file is never sent by this layer, and the assistant cannot execute transactions or change simulation records.

## Advisor styles

| Advisor | Best use |
|---|---|
| **Mara — Business Guide** | Practical, balanced guidance and clear next steps |
| **Darius — Strategy Planner** | Longer-term planning, trade-offs, and risks |
| **Lina — Quick Guide** | Concise, plain-language answers |
| **Theo — Research Analyst** | Structured analysis and evidence-aware research |

The chosen advisor is stored in browser local storage separately from company records. Changing an advisor does not modify cash, orders, staff, sales, accounting entries, or simulation time.

## Privacy and usage

The existing Layer 8.1 assistant continues to load `https://js.puter.com/v2/` only when the Business Desk opens. When a player asks a question, the question and bounded recent chat history are sent through Puter to the selected provider. A compact company snapshot is included only when explicitly enabled; the full save file is not sent. Recent chat remains in page memory only and is removed by **Clear conversation**. Do not submit passwords, payment details, or sensitive customer information.

Each player connects their own Puter account. This project does not embed a shared account or secret and does not promise unlimited usage. Account allowances, provider availability, and service limits are controlled by Puter. If online access fails, the built-in Guide fallback must remain clearly identified as local help, not as an online response.

## Files in this update

Replace these files and add the new files in the package:

- `index.html` — keeps the same Layer 6.0 pinned engine and loads both `layer7.js` and the new `layer8.2.js` add-on.
- `layer8.2.js` — new, additive UI and Markdown presentation layer. It intentionally leaves `layer7.js` unchanged.
- `loader.test.cjs` — verifies the pinned loader and both add-on script paths.
- `layer8.2.test.cjs` — tests safe Markdown rendering, named profiles, and responsive/keyboard requirements.
- `README.md` — this release note.
- `.github/workflows/realworld-regression.yml` — includes the new test file while retaining the existing business-engine regression suite.

**Keep these existing files unchanged:** `layer7.js`, `layer7.test.cjs`, and `regression.test.cjs`. The existing engine suite is deliberately retained against the exact accepted Layer 6.0 source. If any regression fails after installation, do not merge/publish until it is addressed.

## Verification

With Node.js 22, the focused suite is:

`node --test loader.test.cjs layer7.test.cjs layer8.2.test.cjs`

Syntax checks cover `layer7.js`, `layer8.2.js`, and their test files. GitHub Actions also runs the full existing business-engine regression suite. Mocked tests cannot prove that a live Puter account or model provider will always be available; retain the real-browser acceptance test after publishing.
