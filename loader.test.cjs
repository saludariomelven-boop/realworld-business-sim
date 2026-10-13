const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const layer7 = fs.readFileSync(path.join(__dirname, 'layer7.js'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1, 'The replacement index should contain one small boot script');
const bootScript = scripts[0][1];

class MockElement {
  constructor() {
    this.textContent = '';
    this.innerHTML = '';
    this.added = new Set();
    this.removed = new Set();
    this.listeners = {};
    this.classList = {
      add: (value) => this.added.add(value),
      remove: (value) => this.removed.add(value)
    };
    this.children = new Map();
  }
  querySelector(selector) {
    if (!this.children.has(selector)) this.children.set(selector, new MockElement());
    return this.children.get(selector);
  }
  addEventListener(type, callback) { this.listeners[type] = callback; }
}

function runLoader(fetchImpl) {
  const elements = new Map();
  const document = {
    opened: false,
    closed: false,
    written: '',
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new MockElement());
      return elements.get(id);
    },
    open() { this.opened = true; },
    write(value) { this.written += String(value); },
    close() { this.closed = true; }
  };
  const context = vm.createContext({ document, fetch: fetchImpl });
  vm.runInContext(bootScript, context, { timeout: 10000 });
  return { document, elements };
}

test('loader pins the exact accepted Layer 6.0 source and verifies its build marker', () => {
  assert.match(html, /cca64607926733ee0d1130138606b2753a67dd99\/index\.html/);
  assert.match(html, /REALWORLD_BUILD_ID: RW-LAYER-6\.0 \| Working Capital & Cash Runway Planning · 2026-10-13/);
  assert.match(bootScript, /Pinned game source is incomplete/);
});

test('loader writes the preserved game into the same page and attaches the add-on before body close', async () => {
  const base = '<!doctype html><html><head><title>Base</title></head><body><script>/* REALWORLD_BUILD_ID: RW-LAYER-6.0 | Working Capital & Cash Runway Planning · 2026-10-13 */</script></body></html>';
  const requested = [];
  const env = runLoader(async (url, options) => {
    requested.push({ url, options });
    return { ok: true, text: async () => base };
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requested.length, 1);
  assert.match(requested[0].url, /raw\.githubusercontent\.com/);
  assert.equal(requested[0].options.mode, 'cors');
  assert.equal(env.document.opened, true);
  assert.equal(env.document.closed, true);
  assert.match(env.document.written, /<base href="https:\/\/saludariomelven-boop\.github\.io\/realworld-business-sim\/">/);
  assert.match(env.document.written, /<script src="https:\/\/saludariomelven-boop\.github\.io\/realworld-business-sim\/layer7\.js"><\/script>/);
  assert.match(env.document.written, /REALWORLD_BUILD_ID: RW-LAYER-6\.0/);
});

test('a failed pinned-source request shows a retry state rather than silently blanking the game', async () => {
  const env = runLoader(async () => { throw new Error('network unavailable'); });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(env.document.opened, false);
  assert.ok(env.elements.get('boot-status').added.has('error'));
  assert.match(env.elements.get('boot-status').querySelector('p').textContent, /Check your connection, then retry/i);
  assert.equal(typeof env.elements.get('boot-retry').listeners.click, 'function');
});

test('loader does not mutate saved companies; Guide remains read-only', () => {
  assert.doesNotMatch(bootScript, /localStorage\.(?:setItem|removeItem)\s*\(/);
  assert.doesNotMatch(bootScript, /makeEntry\s*\(|placePurchaseOrder\s*\(|saveGame\s*\(/);
  assert.match(layer7, /cannot execute orders or change saved company records/i);
});
