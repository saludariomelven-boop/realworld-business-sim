const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'layer8.2.js'), 'utf8');
function makeRuntime(nodes = new Map()) {
  const listeners = new Map();
  const document = {
    readyState: 'loading',
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    querySelector(selector) { return nodes.get(selector) || null; }
  };
  const window = {};
  const context = vm.createContext({ document, window, console, Event });
  vm.runInContext(source, context, { filename: 'layer8.2.js', timeout: 10000 });
  return { api: window.REALWORLD_LAYER82, context, document, listeners, nodes };
}

test('Layer 8.2 publishes the expected Business Desk build and four named advisor profiles', () => {
  const { api } = makeRuntime();
  assert.equal(api.build, 'RW-LAYER-8.2 · Business Desk · Clear Answers & Responsive Advisor Controls · 2026-10-14');
  assert.deepEqual(Array.from(api.profiles, (p) => `${p.name} · ${p.role}`), [
    'Mara · Business Guide', 'Darius · Strategy Planner', 'Lina · Quick Guide', 'Theo · Research Analyst'
  ]);
});

test('Markdown headings, emphasis, bullets, tables, and links become readable structure', () => {
  const { api } = makeRuntime();
  const html = api.renderMarkdown(
    '### Summary\n**Cash** remains stable.\n\n- Review stock\n- Check margins\n\n| Year | Interest |\n|---|---:|\n| 1 | ₱500 |\n\n[Read a source](https://example.com/report)'
  );
  assert.match(html, /<h3>Summary<\/h3>/);
  assert.match(html, /<strong>Cash<\/strong>/);
  assert.match(html, /<ul>[\s\S]*<li>Review stock<\/li>[\s\S]*<li>Check margins<\/li>[\s\S]*<\/ul>/);
  assert.match(html, /<table>[\s\S]*<th>Year<\/th>[\s\S]*<td>₱500<\/td>/);
  assert.match(html, /<a href="https:\/\/example\.com\/report" target="_blank" rel="noopener noreferrer">Read a source<\/a>/);
});

test('AI-provided HTML stays escaped and unsafe link schemes never become anchors', () => {
  const { api } = makeRuntime();
  const html = api.renderMarkdown('<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))');
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>|href="javascript:/i);
});

test('advisor choice updates the hidden provider selection and closes the picker', () => {
  const nodes = new Map();
  const select = { value: 'openai/gpt-6.1-sol', dispatchEvent(event) { this.lastEvent = event; return true; } };
  const trigger = { textContent: '', setAttribute(name, value) { this[name] = value; } };
  const menu = { hidden: false, querySelectorAll() { return []; } };
  nodes.set('#rw8-ai-model', select);
  nodes.set('#rw82-advisor-trigger', trigger);
  nodes.set('#rw82-advisor-menu', menu);
  const { api } = makeRuntime(nodes);
  assert.equal(api.chooseAdvisor('openai/gpt-6-astra'), true);
  assert.equal(select.value, 'openai/gpt-6-astra');
  assert.equal(select.lastEvent.type, 'change');
  assert.equal(menu.hidden, true);
  assert.equal(trigger.textContent, 'Darius · Strategy Planner ▾');
  assert.equal(api.getMenuState(), false);
});

test('selected advisor style is added to request context without changing prior messages', () => {
  const { api } = makeRuntime();
  const original = [
    { role: 'system', content: 'Follow accuracy rules.' },
    { role: 'user', content: 'Help me plan.' }
  ];
  const styled = api.styleMessagesForAdvisor(original, 'openai/gpt-6-astra');
  assert.match(styled[0].content, /Darius — Strategy Planner/);
  assert.match(styled[0].content, /trade-offs|Communication style/i);
  assert.equal(styled[1].content, 'Help me plan.');
  assert.equal(original[0].content, 'Follow accuracy rules.', 'The base prompt is not mutated');
});

test('status and response headings use advisor names instead of provider model labels', () => {
  const { api } = makeRuntime();
  assert.equal(api.friendlyTitle('REALWORLD AI · GPT-6.1 Sol · Balanced'), 'Mara · Business Guide');
  assert.equal(api.friendlyTitle('REALWORLD AI · GPT-6 Astra · Advanced'), 'Darius · Strategy Planner');
  assert.equal(api.friendlyTitle('Built-in Guide fallback · AI unavailable'), 'Built-in Guide · Offline answer');
  assert.match(api.friendlyStatus('AI response complete · GPT-6 Luna · Lightweight. Check important facts before acting.'), /Response ready · Lina\./);
  assert.match(api.friendlyStatus('Puter AI is loaded, but not connected. Press Connect AI to sign in; your question has not been sent.'), /Connect your account/);
});

test('responsive touch targets and keyboard-accessible picker are included', () => {
  assert.match(source, /@media\(max-width:760px\)/);
  assert.match(source, /@media\(max-width:380px\)/);
  assert.match(source, /@media\(pointer:coarse\)/);
  assert.match(source, /min-height:44px/);
  assert.match(source, /aria-haspopup="true"/);
  assert.match(source, /ArrowDown/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /document\.addEventListener\('click', handleClick, true\)/);
});

test('dashboard Ask the Guide opens the panel without pushing a suggested question into the input', () => {
  assert.match(source, /const openQuestion = target\.closest\('\[data-rw7-guide-question\]'\)/);
  assert.match(source, /runtime\.openGuide\(\)/);
  assert.doesNotMatch(source, /runtime\.openGuide\(openQuestion\.getAttribute/);
});

test('presentation layer remains read-only and formats only assistant response bodies', () => {
  const { api } = makeRuntime();
  assert.equal(typeof api.applyPresentation, 'function');
  assert.match(source, /root\.querySelectorAll\('\.rw8-msg-body'\)/);
  assert.doesNotMatch(source, /\bsaveGame\s*\(|\bmakeEntry\s*\(|\bplacePurchaseOrder\s*\(/);
});
