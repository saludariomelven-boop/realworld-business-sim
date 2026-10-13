const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'layer7.js'), 'utf8');

class MockElement {
  constructor(selector = '') {
    this.selector = selector;
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.dataset = {};
    this.attributes = {};
    this.scrollTop = 0;
    this.scrollHeight = 0;
    this.children = [];
    this.classList = {
      values: new Set(),
      add: (value) => this.classList.values.add(value),
      remove: (value) => this.classList.values.delete(value),
      contains: (value) => this.classList.values.has(value)
    };
  }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  appendChild(node) { this.children.push(node); return node; }
  insertAdjacentHTML(_where, html) {
    this.insertedHTML = (this.insertedHTML || '') + html;
    for (const match of String(html).matchAll(/\bid="([^"]+)"/g)) {
      if (this.ownerDocument && !this.ownerDocument.nodes.has(`#${match[1]}`)) {
        const node = new MockElement(`#${match[1]}`);
        node.ownerDocument = this.ownerDocument;
        this.ownerDocument.nodes.set(`#${match[1]}`, node);
      }
    }
  }
  focus() { this.focused = true; }
}

function makeHarness() {
  const nodes = new Map();
  const documentListeners = new Map();
  const storage = new Map();
  const makeNode = (selector) => {
    if (!nodes.has(selector)) {
      const node = new MockElement(selector);
      node.ownerDocument = document;
      nodes.set(selector, node);
    }
    return nodes.get(selector);
  };
  const document = {
    readyState: 'complete',
    nodes,
    listeners: documentListeners,
    body: null,
    head: null,
    querySelector: (selector) => {
      // Selectors representing elements not in the current mock DOM correctly return null.
      return nodes.get(selector) || null;
    },
    createElement: (tag) => makeNode(`new:${tag}:${nodes.size}`),
    addEventListener: (type, callback) => {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(callback);
    }
  };
  document.body = makeNode('body');
  document.head = makeNode('head');
  for (const selector of [
    '.sidebar-bottom', '#app', '.brand-build', 'meta[name="application-version"]',
    'meta[name="description"]', 'meta[name="theme-color"]', '#view'
  ]) makeNode(selector);
  const company = {
    company: 'QA Leaf Trading', businessDisplayName: 'Online Retail', businessTemplateId: 'retail',
    industry: 'retail', businessModel: 'goods', companyStatus: 'active', week: 5, date: '2026-02-02',
    currencyCode: 'PHP', cash: 85000, monthlyRent: 18000, monthlyUtilities: 4200, overdraft: 0,
    history: [{ week: 1, revenue: 10000, net: 800 }, { week: 2, revenue: 12000, net: -100 }],
    lastWeek: { week: 2, revenue: 12000, net: -100 }, totals: { revenue: 22000, net: 700 },
    products: [{ id: 'bottle', name: 'Bottle', kind: 'goods', stock: 4, baseDemand: 12 }],
    purchaseOrders: [{ id: 'po-1', status: 'received', receivedWeek: 2, productId: 'bottle' }],
    employees: [], loans: [],
  };
  let navigated = '';
  let renderViewCalls = 0;
  const context = vm.createContext({
    console, document, localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    window: { setTimeout: (fn) => { if (typeof fn === 'function') fn(); } },
    game: company,
    activeView: 'dashboard',
    renderDashboard: () => '<div class="page-head">Dashboard</div><div class="footnote" style="margin-top:18px">Simulation note</div>',
    renderView: () => { renderViewCalls += 1; },
    navSet: (view) => { navigated = view; },
    dateLabel: (date) => date,
    money: (value) => `₱${Number(value || 0).toFixed(2)}`,
    signedMoney: (value) => `${Number(value) < 0 ? '−' : '+'}₱${Math.abs(Number(value) || 0).toFixed(2)}`,
    balanceSheet: () => ({ delta: 0 }),
    getWorkingCapitalPlanSettings: () => ({ horizon: 8, scenario: 'recent-trend', reserve: 1000 }),
    computeWorkingCapitalForecast: () => ({ historyAvailable: true, historyWeeks: 2, averageWeeklyNet: -9000, cashRunwayWeeks: 9.4, reserveBreachWeek: 7, scenarioLabel: 'Recent cash-flow trend' })
  });
  vm.runInContext(source, context, { filename: 'layer7.js', timeout: 10000 });
  return { context, company, storage, nodes, get navigated() { return navigated; }, get renderViewCalls() { return renderViewCalls; } };
}

test('Layer 7 add-on initializes the Guide, appearance control, and runtime build metadata', () => {
  const env = makeHarness();
  assert.equal(env.context.window.REALWORLD_LAYER7.build, 'RW-LAYER-7.0 · Visual Business World & In-Game Guide · 2026-10-13');
  assert.ok(env.nodes.get('#rw7-guide-panel'));
  assert.ok(env.nodes.get('#rw7-guide-fab'));
  assert.ok(env.nodes.get('#rw7-theme-toggle'));
  assert.match(env.nodes.get('.brand-build').textContent, /RW-LAYER-7\.0/);
  assert.equal(env.nodes.get('meta[name="application-version"]').attributes.content, env.context.window.REALWORLD_LAYER7.build);
  assert.equal(env.renderViewCalls, 1, 'an already-open saved Dashboard must redraw so the new hero is visible immediately');
});

test('the dashboard wrapper adds a business illustration and milestones without replacing the existing dashboard', () => {
  const env = makeHarness();
  const html = env.context.renderDashboard();
  assert.match(html, /Your business, at a glance/);
  assert.match(html, /<svg class="rw7-scene"/);
  assert.match(html, /Progress milestones/);
  assert.match(html, /<div class="page-head">Dashboard<\/div>/);
  assert.match(html, /Simulation note/);
  assert.match(html, /Revenue recorded/);
});

test('the Guide uses current cash-flow planner data and distinguishes forecasts from actual transactions', () => {
  const env = makeHarness();
  const answer = env.context.window.REALWORLD_LAYER7.guideAnswer('Why is my cash decreasing?');
  assert.match(answer.title, /cash and runway/i);
  assert.match(answer.body, /₱85000\.00/);
  assert.match(answer.body, /−₱9000\.00/);
  assert.match(answer.body, /week \+7/);
  assert.match(answer.body, /not posted cash movements/i);
  assert.equal(answer.actionView, 'finance');
});

test('milestones are derived from recorded game data and do not invent rewards', () => {
  const env = makeHarness();
  const before = JSON.stringify(env.company);
  const items = env.context.window.REALWORLD_LAYER7.milestoneList();
  assert.equal(items.find((item) => item.id === 'first-week').earned, true);
  assert.equal(items.find((item) => item.id === 'first-revenue').earned, true);
  assert.equal(items.find((item) => item.id === 'supplier-delivery').earned, true);
  assert.equal(items.find((item) => item.id === 'four-weeks').earned, false);
  assert.equal(items.find((item) => item.id === 'balanced-books').earned, true);
  assert.equal(JSON.stringify(env.company), before, 'Milestone evaluation must not mutate company state');
  assert.match(env.context.window.REALWORLD_LAYER7.renderMilestones(), /do not award money/i);
});

test('appearance preference is separate from company records and toggles safely', () => {
  const env = makeHarness();
  const before = JSON.stringify(env.company);
  assert.equal(env.context.window.REALWORLD_LAYER7.themePreference(), 'soft-dark');
  env.context.window.REALWORLD_LAYER7.toggleTheme();
  assert.equal(env.nodes.get('body').dataset.theme, 'warm-light');
  assert.equal(env.context.window.REALWORLD_LAYER7.themePreference(), 'warm-light');
  assert.equal(JSON.stringify(env.company), before, 'Theme changes must not modify company records');
  assert.equal(env.storage.get('realworld-theme-preference-v1'), 'warm-light');
});

test('the add-on is offline-first and contains no direct network/API calls or game transaction actions', () => {
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket/i);
  assert.doesNotMatch(source, /\bsaveGame\s*\(|\bmakeEntry\s*\(|\bplacePurchaseOrder\s*\(/);
  assert.match(source, /does not post transactions or change your company/i);
  assert.match(source, /safeEscape\(message\.text\)/);
});
