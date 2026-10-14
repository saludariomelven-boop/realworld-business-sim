const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'layer8.3.js'), 'utf8');

class MockElement {
  constructor(selector = '') {
    this.selector = selector;
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.dataset = {};
    this.attributes = {};
    this.children = [];
    this.listeners = {};
    this.scrollTop = 0;
    this.scrollHeight = 0;
    this.parentElement = null;
    this.className = '';
    this.classList = {
      values: new Set(),
      add: (v) => this.classList.values.add(v),
      remove: (v) => this.classList.values.delete(v),
      toggle: (v, force) => {
        const on = force === undefined ? !this.classList.values.has(v) : !!force;
        if (on) this.classList.values.add(v); else this.classList.values.delete(v);
        return on;
      },
      contains: (v) => this.classList.values.has(v)
    };
  }
  get firstChild() { return this.children[0] || null; }
  appendChild(node) { node.parentElement = this; this.children.push(node); return node; }
  removeChild(node) { const i = this.children.indexOf(node); if (i >= 0) this.children.splice(i, 1); node.parentElement = null; return node; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  insertAdjacentHTML(_where, html) {
    this.insertedHTML = (this.insertedHTML || '') + String(html);
    for (const m of String(html).matchAll(/\bid="([^"]+)"/g)) {
      const selector = `#${m[1]}`;
      if (this.ownerDocument && !this.ownerDocument.nodes.has(selector)) {
        const node = new MockElement(selector);
        node.ownerDocument = this.ownerDocument;
        this.ownerDocument.nodes.set(selector, node);
      }
    }
  }
  querySelector(selector) { return this.ownerDocument ? this.ownerDocument.querySelector(selector) : null; }
  querySelectorAll(selector) { return this.ownerDocument ? this.ownerDocument.querySelectorAll(selector) : []; }
  closest(selector) { return selector === this.selector || selector === this.id ? this : null; }
  focus() { this.focused = true; }
  blur() { this.focused = false; }
}

function makeHarness({ company = null, webgpu = false, localStorageSeed = {} } = {}) {
  const nodes = new Map();
  const listeners = new Map();
  const storage = new Map(Object.entries(localStorageSeed));
  const document = {
    readyState: 'complete',
    nodes,
    activeElement: null,
    head: null,
    body: null,
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    querySelector(selector) { return nodes.get(selector) || null; },
    querySelectorAll(selector) {
      return Array.from(nodes.entries()).filter(([key]) => selector.startsWith('#') ? key === selector : key.includes(selector)).map(([, value]) => value);
    },
    createElement(tag) { const node = new MockElement(`new:${tag}:${nodes.size}`); node.ownerDocument = document; return node; }
  };
  const node = (selector) => {
    if (!nodes.has(selector)) {
      const n = new MockElement(selector);
      n.ownerDocument = document;
      nodes.set(selector, n);
    }
    return nodes.get(selector);
  };
  document.head = node('head');
  document.body = node('body');
  for (const selector of [
    '#rw7-guide-panel', '.rw8-ai-controls', '#rw7-guide-messages', '#rw7-guide-question',
    '#rw8-ai-model', '#rw8-ai-status', '#rw8-ai-connect', '#rw8-share-company', '#rw8-web-search',
    '.rw8-ai-disclosure', 'meta[name="application-version"]', 'meta[name="description"]', '.brand-build'
  ]) node(selector);
  node('#rw8-ai-model').value = 'openai/gpt-6.1-sol';
  node('#rw8-share-company').checked = false;
  node('#rw8-web-search').checked = false;
  node('#rw7-guide-panel').classList.add('open');

  const companyData = company || {
    version: 1, countryCode: 'PH', currencyCode: 'PHP', countryCode: 'PH', company: 'QA Leaf Trading', founder: 'QA Founder',
    businessTemplateId: 'retail', businessModel: 'goods', businessDisplayName: 'Online Retail', industry: 'retail',
    location: 'Pasay, Philippines', companyStatus: 'active', date: '2026-01-05', week: 1, capital: 250000,
    cash: 92500, ar: 4000, ap: 6200, overdraft: 0, monthlyRent: 18000, monthlyUtilities: 4200, payrollPayable: 0,
    taxPayable: 1500, interestPayable: 0, rentPayable: 0, utilityPayable: 0, loanBalance: 0, loanArrears: 0,
    supplierAdvances: 2500, reputation: 62, creditScore: 68, complianceScore: 75, marketStrategy: 'balanced',
    totals: { revenue: 22000, cogs: 8500, net: 1300, units: 40, stockouts: 3 },
    lastWeek: { week: 2, revenue: 12000, cogs: 4600, net: 900, units: 20, stockouts: 1 },
    employees: [{ id: 'emp1', name: 'Private Employee Name', role: 'Delivery Rider', salary: 12000 }],
    products: [{ id: 'bottle', name: 'Water Bottle', kind: 'goods', price: 100, unitCost: 55, stock: 2, baseDemand: 12 }],
    purchaseOrders: [{ id: 'po-001', productId: 'bottle', productName: 'Water Bottle', supplierName: 'Reliable Supplier', quantity: 40, placedWeek: 1, etaWeek: 0, delayCount: 2, totalCost: 2200, payableAmount: 660, status: 'open' }],
    loans: [], history: [{ week: 1, date: '2026-01-05', revenue: 10000, cogs: 3900, net: 400, units: 20, stockouts: 2 }, { week: 2, date: '2026-01-12', revenue: 12000, cogs: 4600, net: 900, units: 20, stockouts: 1 }],
    journal: [{ week: 2, date: '2026-01-12', description: 'Weekly sales summary' }]
  };
  const window = {
    isSecureContext: true,
    navigator: webgpu ? { gpu: { requestAdapter: async () => ({}) } } : {},
    REALWORLD_LAYER8: { openGuide() { const p = node('#rw7-guide-panel'); p.classList.remove('hidden'); } },
    REALWORLD_LAYER82: {
      profiles: [
        { id: 'openai/gpt-6.1-sol', name: 'Mara', role: 'Business Guide', style: 'Practical advice.' },
        { id: 'openai/gpt-6-astra', name: 'Darius', role: 'Strategy Planner', style: 'Deeper analysis.' },
        { id: 'openai/gpt-6-luna', name: 'Lina', role: 'Quick Guide', style: 'Concise.' },
        { id: 'openai/gpt-oss-120b', name: 'Theo', role: 'Research Analyst', style: 'Structured.' }
      ],
      renderMarkdown(text) { return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    }
  };
  const context = vm.createContext({
    console, document, window, game: companyData, Promise, Intl, Math, Date, String, Number, Object, Array, Set, Map,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    money(value) { return `₱${Number(value).toFixed(2)}`; },
    moneyExact(value) { return `₱${Number(value).toFixed(2)}` }
  });
  vm.runInContext(source, context, { filename: 'layer8.3.js', timeout: 10000 });
  return { api: window.REALWORLD_LAYER83, window, document, nodes, storage, listeners, game: companyData, context };
}

test('Layer 8.3 publishes a new build and adds visible, responsive free secretary tools', () => {
  const env = makeHarness();
  assert.equal(env.api.build, 'RW-LAYER-8.3 · Free Business Secretary · Local AI & Company Tools · 2026-10-14');
  const markup = env.nodes.get('.rw8-ai-controls').insertedHTML;
  for (const term of ['Company brief', 'Cash and risk review', 'Stock and deliveries', 'Team and payroll', 'Weekly report', 'What needs attention?', 'Draft supplier message', 'Company notes and goals']) assert.ok(markup.includes(term), `missing ${term}`);
  assert.match(source, /@media\(max-width:760px\)/);
  assert.match(source, /@media\(max-width:340px\)/);
  assert.match(source, /min-height:44px/);
  assert.equal(env.nodes.get('meta[name="application-version"]').attributes.content, env.api.build);
});

test('company snapshot reads actual simulation totals and excludes individual employee names', () => {
  const env = makeHarness();
  const before = JSON.stringify(env.game);
  const snapshot = env.api.companySnapshot();
  assert.equal(snapshot.available, true);
  assert.equal(snapshot.company, 'QA Leaf Trading');
  assert.equal(snapshot.week, 1);
  assert.equal(snapshot.cash, 92500);
  assert.equal(snapshot.totals.revenue, 22000);
  assert.equal(snapshot.employeeCount, 1);
  assert.equal(snapshot.employeeRoles['Delivery Rider'], 1);
  assert.doesNotMatch(JSON.stringify(snapshot), /Private Employee Name/);
  assert.equal(JSON.stringify(env.game), before, 'Reading the company must not mutate saved simulation state');
});

test('cash and risk review uses the real values and flags overdue supplier orders and stock risk', () => {
  const env = makeHarness();
  const cash = env.api.reportCashRisk();
  const stock = env.api.reportStockAndOrders();
  const priorities = env.api.reportPriorities();
  assert.match(cash, /₱92500\.00/);
  assert.match(cash, /Tax payable is recorded|tax payable/i);
  assert.match(stock, /OVERDUE|overdue/i);
  assert.match(stock, /Water Bottle/);
  assert.match(priorities, /supplier orders due or overdue|stock|supplier order/i);
  assert.equal(env.api.runSecretaryTask('stock').ok, true);
});

test('weekly report distinguishes a new company from recorded closed weeks', () => {
  const env = makeHarness();
  env.game.history = [];
  env.game.lastWeek = null;
  let report = env.api.reportWeeklyHistory();
  assert.match(report, /No operating week has been closed yet/);
  env.game.history = [{ week: 4, revenue: 9000, cogs: 3000, net: 800, units: 14, stockouts: 1 }];
  env.game.lastWeek = env.game.history[0];
  report = env.api.reportWeeklyHistory();
  assert.match(report, /\| Week \| Revenue \| Cost of goods \| Net result/);
  assert.match(report, /Week/);
  assert.match(report, /₱9000\.00/);
});

test('team report calculates monthly payroll without exposing employee names', () => {
  const env = makeHarness();
  const report = env.api.reportTeam();
  assert.match(report, /Headcount: 1/);
  assert.match(report, /₱12000\.00/);
  assert.match(report, /Delivery Rider: 1/);
  assert.doesNotMatch(report, /Private Employee Name/);
});

test('supplier message is a draft only and identifies the open order without sending anything', () => {
  const env = makeHarness();
  const before = JSON.stringify(env.game);
  const report = env.api.draftSupplierMessage();
  assert.match(report, /Reliable Supplier/);
  assert.match(report, /po-001/);
  assert.match(report, /has not been sent/i);
  assert.equal(JSON.stringify(env.game), before, 'Drafting a message must not alter the company');
});

test('company notes stay in browser storage, are bounded, and remain attached when the game week advances', () => {
  const env = makeHarness();
  const before = JSON.stringify(env.game);
  const identity = env.api.gameIdentity(env.game);
  const result = env.api.saveMemory('Keep a rent reserve and prioritize reliable suppliers.');
  assert.equal(result.ok, true);
  assert.match(env.api.loadMemory(env.game), /rent reserve/);
  env.game.week = 8;
  env.game.date = '2026-02-23';
  assert.equal(env.api.gameIdentity(env.game), identity, 'A weekly date change must not disconnect the memory from its company');
  assert.match(env.api.loadMemory(env.game), /reliable suppliers/);
  env.api.saveMemory('x'.repeat(1500));
  assert.equal(env.api.loadMemory(env.game).length, 1000);
  assert.equal(JSON.stringify(env.game), before.replace('"week":1', '"week":8').replace('"date":"2026-01-05"', '"date":"2026-02-23"'), 'Secretary notes must not alter any other company field');
  const otherCompany = { ...env.game, company: 'Different company' };
  assert.notEqual(env.api.gameIdentity(otherCompany), identity);
});

test('local model messages include company data only when the local-context switch is enabled', () => {
  const env = makeHarness();
  env.nodes.get('#rw83-local-company-context').checked = true;
  let messages = env.api.buildLocalMessages('What needs attention in my company?');
  assert.match(messages[0].content, /QA Leaf Trading/);
  assert.match(messages[0].content, /"cash":92500/);
  env.nodes.get('#rw83-local-company-context').checked = false;
  messages = env.api.buildLocalMessages('What should I do next?');
  assert.doesNotMatch(messages[0].content, /"cash":92500/);
  assert.match(messages[0].content, /has not enabled local company context/);
});

test('unsupported WebGPU leaves free secretary tools available and makes no model download attempt', async () => {
  const env = makeHarness({ webgpu: false });
  const result = await env.api.loadLocalEngine();
  assert.equal(result, null);
  assert.equal(env.api.getState().localReady, false);
  assert.match(env.nodes.get('#rw83-local-status').textContent, /does not expose WebGPU/i);
  assert.equal(env.game.cash, 92500);
});

test('on-device responses use the local engine and do not call the online provider', async () => {
  const env = makeHarness();
  let onlineCalls = 0;
  env.window.puter = { ai: { chat() { onlineCalls += 1; throw new Error('online provider should not be called'); } } };
  let receivedMessages;
  env.api.setLocalEngineForTests({ chat: { completions: { create: async (options) => {
    receivedMessages = options.messages;
    return { choices: [{ message: { content: '## Next steps\n1. Review cash obligations.\n2. Check the overdue order.' } }] };
  } } } });
  env.nodes.get('#rw83-local-company-context').checked = true;
  await env.api.sendLocalQuestion('What should I focus on this week?');
  assert.equal(onlineCalls, 0);
  assert.match(receivedMessages[0].content, /QA Leaf Trading/);
  assert.equal(env.api.getState().localMessages, 2);
  const host = env.nodes.get('#rw7-guide-messages');
  assert.ok(host.children.some((wrapper) => wrapper.children.some((child) => child.children && child.children.some((grandchild) => String(grandchild.innerHTML || '').includes('Review cash obligations')))), 'the local answer should be displayed in the chat');
  assert.match(env.nodes.get('.rw8-ai-controls').insertedHTML, /id="rw83-unload-local-model"[^>]*hidden/, 'unload control should start hidden until setup succeeds');
  const userMessage = host.children.find((wrapper) => wrapper.className === 'rw7-msg user');
  assert.ok(userMessage, 'the player question should be present in the conversation');
  assert.equal(userMessage.children[0].className, 'rw83-user-body', 'player-authored text must not enter the assistant Markdown formatter');
  assert.doesNotMatch(userMessage.children[0].className, /rw8-msg-body/);
  assert.equal(env.game.cash, 92500);
});

test('secretary tools and local assistant expose no game-changing calls', () => {
  assert.doesNotMatch(source, /\b(saveGame|makeEntry|placePurchaseOrder|hireEmployee|fireEmployee|runWeek|savePrice|loanRequest)\s*\(/);
  assert.doesNotMatch(source, /localStorage\.(?:setItem|removeItem)\(['"](?:realworld-save|rw-save|REALWORLD_SAVE)/i);
  assert.match(source, /Read-only snapshot/);
  assert.match(source, /no automatic online fallback was used/i);
});

test('unloading the on-device model clears local mode and leaves secretary tools available', async () => {
  const env = makeHarness();
  let unloadCalls = 0;
  env.api.setLocalEngineForTests({ unload: async () => { unloadCalls += 1; } });
  env.nodes.get('#rw83-use-local-model').checked = true;
  env.api.setLocalMode(true);
  const result = await env.api.unloadLocalEngine();
  assert.equal(result, true);
  assert.equal(unloadCalls, 1);
  assert.equal(env.api.getState().localReady, false);
  assert.equal(env.api.getState().localMode, false);
  assert.equal(env.storage.get('realworld-secretary-local-ai-enabled-v1'), 'false');
  assert.equal(env.nodes.get('#rw83-unload-local-model').hidden, true);
  assert.equal(env.nodes.get('#rw83-load-local-model').textContent, 'Set up free on-device advisor');
  assert.match(env.nodes.get('#rw83-local-status').textContent, /model unloaded/i);
  assert.equal(env.api.reportCompanyBrief().includes('QA Leaf Trading'), true);
  assert.equal(env.game.cash, 92500);
});
