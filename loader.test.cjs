const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const secretary = fs.readFileSync(path.join(__dirname, 'layer8.3.js'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1, 'The public loader should contain one small boot script');
const bootScript = scripts[0][1];

class MockElement {
  constructor() { this.textContent = ''; this.listeners = {}; this.added = new Set(); this.removed = new Set(); this.children = new Map(); this.classList = { add: (v) => this.added.add(v), remove: (v) => this.removed.add(v) }; }
  querySelector(selector) { if (!this.children.has(selector)) this.children.set(selector, new MockElement()); return this.children.get(selector); }
  addEventListener(type, callback) { this.listeners[type] = callback; }
}
function runLoader(fetchImpl) {
  const elements = new Map();
  const document = {
    opened: false, closed: false, written: '',
    getElementById(id) { if (!elements.has(id)) elements.set(id, new MockElement()); return elements.get(id); },
    open() { this.opened = true; }, write(value) { this.written += String(value); }, close() { this.closed = true; }
  };
  const context = vm.createContext({ document, fetch: fetchImpl });
  vm.runInContext(bootScript, context, { timeout: 10000 });
  return { document, elements };
}

test('loader identifies Layer 8.4 while preserving the pinned Layer 6.0 engine', () => {
  assert.match(html, /RW-LAYER-8\.4 · Secretary Accessibility & Notes Reliability · 2026-10-14/);
  assert.match(html, /Loading the preserved simulation and Layer 8\.4 Business Secretary accessibility and notes reliability/);
  assert.match(html, /cca64607926733ee0d1130138606b2753a67dd99\/index\.html/);
  assert.match(bootScript, /REALWORLD_BUILD_ID: RW-LAYER-6\.0 \| Working Capital & Cash Runway Planning · 2026-10-13/);
});

test('loader injects all three additive layers in the same Pages origin', async () => {
  const base = '<!doctype html><html><head><title>Base</title></head><body><script>/* REALWORLD_BUILD_ID: RW-LAYER-6.0 | Working Capital & Cash Runway Planning · 2026-10-13 */</script></body></html>';
  const requested = [];
  const env = runLoader(async (url, options) => { requested.push({ url, options }); return { ok: true, text: async () => base }; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requested.length, 1);
  assert.match(requested[0].url, /raw\.githubusercontent\.com/);
  assert.equal(requested[0].options.mode, 'cors');
  assert.equal(requested[0].options.credentials, 'omit');
  assert.equal(env.document.opened, true);
  assert.equal(env.document.closed, true);
  assert.match(env.document.written, /<base href="https:\/\/saludariomelven-boop\.github\.io\/realworld-business-sim\/">/);
  for (const file of ['layer7.js', 'layer8.2.js', 'layer8.3.js']) assert.ok(env.document.written.includes(`https://saludariomelven-boop.github.io/realworld-business-sim/${file}`), `Missing ${file}`);
  assert.match(env.document.written, /REALWORLD_BUILD_ID: RW-LAYER-6\.0/);
});

test('a failed pinned-source request shows a retry state and does not replace the page', async () => {
  const env = runLoader(async () => { throw new Error('network unavailable'); });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(env.document.opened, false);
  assert.ok(env.elements.get('boot-status').added.has('error'));
  assert.match(env.elements.get('boot-status').querySelector('p').textContent, /Check your connection, then retry/i);
  assert.equal(typeof env.elements.get('boot-retry').listeners.click, 'function');
});

test('loader and secretary add-on do not contain direct business-changing calls', () => {
  assert.doesNotMatch(bootScript, /localStorage\.(?:setItem|removeItem)\s*\(/);
  assert.doesNotMatch(bootScript, /makeEntry\s*\(|placePurchaseOrder\s*\(|saveGame\s*\(/);
  assert.doesNotMatch(secretary, /\b(saveGame|makeEntry|placePurchaseOrder|hireEmployee|fireEmployee|runWeek|savePrice|loanRequest)\s*\(/);
  assert.match(secretary, /Read-only snapshot/);
});
