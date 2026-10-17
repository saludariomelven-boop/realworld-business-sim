'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const layer10 = fs.readFileSync(path.join(root, 'layer10.js'), 'utf8');
const layer11 = fs.readFileSync(path.join(root, 'layer11.js'), 'utf8');
const layer12 = fs.readFileSync(path.join(root, 'layer12.js'), 'utf8');
const layer9Path = path.join(root, 'layer9.js');
const layer9 = fs.existsSync(layer9Path) ? fs.readFileSync(layer9Path, 'utf8') : '';
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
  const context = vm.createContext({ document, fetch: fetchImpl, console });
  vm.runInContext(bootScript, context, { timeout: 10000 });
  return { document, elements };
}

test('loader identifies Layer 12 and preserves the verified pinned Layer 6 engine', () => {
  assert.match(html, /RW-LAYER-12\.0\.0 · Company Assistant Consolidation · 2026-10-16/);
  assert.match(html, /cca64607926733ee0d1130138606b2753a67dd99\/index\.html/);
  assert.match(bootScript, /REALWORLD_BUILD_ID: RW-LAYER-6\.0 \| Working Capital & Cash Runway Planning · 2026-10-13/);
  assert.match(bootScript, /const RELEASE = '12\.0\.0'/);
  assert.doesNotMatch(bootScript, /const files=\[[^\]]*layer8\.3\.js/);
});
test('loader injects each supported module with release cache keys and excludes Layer 8.3', async () => {
  const base = '<!doctype html><html><head><title>Base</title></head><body><script>/* REALWORLD_BUILD_ID: RW-LAYER-6.0 | Working Capital & Cash Runway Planning · 2026-10-13 */</script></body></html>';
  const requested = [];
  const env = runLoader(async (url, options) => { requested.push({ url, options }); return { ok: true, text: async () => base }; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requested.length, 1); assert.match(requested[0].url, /raw\.githubusercontent\.com/);
  assert.equal(requested[0].options.mode, 'cors'); assert.equal(requested[0].options.credentials, 'omit');
  assert.equal(env.document.opened, true); assert.equal(env.document.closed, true);
  assert.match(env.document.written, /<base href="https:\/\/saludariomelven-boop\.github\.io\/realworld-business-sim\/">/);
  for (const file of ['layer7.js', 'layer8.2.js', 'layer9.js', 'layer10.js', 'layer11.js', 'layer12.js']) {
    assert.ok(env.document.written.includes(`https://saludariomelven-boop.github.io/realworld-business-sim/${file}?v=12.0.0`), `Missing versioned ${file}`);
  }
  assert.doesNotMatch(env.document.written, /https:\/\/saludariomelven-boop\.github\.io\/realworld-business-sim\/layer8\.3\.js/);
  assert.doesNotMatch(env.document.written, /firebase-config\.js/);
});
test('Layer 10 stays online-only, and Layer 12 uses Puter.js user-pays without developer key setup', () => {
  assert.doesNotMatch(layer10, /@mlc-ai\/web-llm|CreateMLCEngine|CreateWebWorkerMLCEngine|Llama-3\.2-1B-Instruct/);
  assert.match(layer10, /buildCompanySnapshot/); assert.match(layer10, /cannot post transactions or mutate the game/);
  assert.doesNotMatch(layer10, /\b(saveGame|makeEntry|placePurchaseOrder|hireEmployee|fireEmployee|runWeek|savePrice|loanRequest)\s*\(/);
  assert.ok(layer12.includes('https://js.puter.com/v2/')); assert.ok(layer12.includes('gpt-5.6-luna'));
  assert.match(layer12, /toolChoice: 'auto'/); assert.match(layer12, /Stage for review/);
  assert.ok(!layer12.includes('firebase-ai.js')); assert.ok(!layer12.includes('GoogleAIBackend'));
  assert.ok(!layer12.includes('x-goog-api-key')); assert.ok(!layer12.includes('REPLACE_WITH_FIREBASE'));
});
test('the accepted Layer 9 closure and accounting guardrails remain present', (t) => {
  if (!fs.existsSync(layer9Path)) return t.skip('Layer 9 is preserved and not included in this replacement bundle; the target repository test will inspect it.');
  assert.match(layer9, /close-business/); assert.match(layer9, /function closeBusiness/);
  assert.match(layer9, /receiptJournal\(/); assert.match(layer9, /payJournal\(/); assert.match(layer9, /function beginEconomicEvent/);
});
test('Layer 11 retains the command center, market strategy, expansion planner, and decision-history features', () => {
  assert.match(layer11, /data-testid="rw11-command-center"/); assert.match(layer11, /data-testid="rw11-expansion-strategy-lab"/);
  assert.match(layer11, /calculateCompetitiveStrategies/); assert.match(layer11, /stageGrowthInvestment/);
  assert.match(layer11, /buildActionItems/); assert.match(layer11, /markReviewed/); assert.match(layer11, /saveGame\(true\)/);
  assert.match(layer11, /does not increase a score, move money, change inventory/);
  assert.doesNotMatch(layer11, /debug-event|force-event|trigger-test-event|test-only event trigger/i);
});
test('a failed pinned-source request shows a retry state and does not replace the page', async () => {
  const env = runLoader(async () => { throw new Error('network unavailable'); });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(env.document.opened, false); assert.ok(env.elements.get('boot-status').added.has('error'));
  assert.match(env.elements.get('boot-status').querySelector('p').textContent, /Check your connection, then retry/i);
  assert.equal(typeof env.elements.get('boot-retry').listeners.click, 'function');
});
