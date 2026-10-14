'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'layer11.js'), 'utf8');
const loader = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function sampleCompany() {
  return {
    company: 'North Star Trading', currencyCode: 'PHP', companyStatus: 'active', week: 5, date: '2026-10-14',
    cash: 12000, monthlyRent: 10000, monthlyUtilities: 3000, overdraft: 500, loanArrears: 250,
    ap: 800, taxPayable: 200, payrollPayable: 100,
    products: [{ id: 'p1', name: 'Rice', kind: 'goods', stock: 0, baseDemand: 10 }],
    purchaseOrders: [{ id: 'PO-1', status: 'open', etaWeek: 3 }],
    history: [{ week: 4, net: -300 }],
    realworldLayer9: {
      closed: null,
      activeEvents: [{ id: 'demand-downturn', title: 'Demand downturn', remainingWeeks: 2 }],
      jobs: [{ id: 'JOB-00001', status: 'queued', dueWeek: 3 }]
    }
  };
}
function makeHarness(company = sampleCompany(), options = {}) {
  const listeners = new Map();
  const document = {
    readyState: 'loading',
    addEventListener(name, callback) { const rows = listeners.get(name) || []; rows.push(callback); listeners.set(name, rows); },
    querySelector() { return null; },
    createElement() { return { textContent: '', setAttribute() {}, appendChild() {} }; },
    head: { appendChild() {} }
  };
  const window = Object.assign({}, options.window || {});
  const saved = [];
  const context = vm.createContext({
    window, document, game: company, console, Intl, Date, Math, Number, String, Object, Array, Set, Map, JSON, RegExp,
    saveGame(flag) { saved.push(flag); }
  });
  vm.runInContext(source, context, { filename: 'layer11.js', timeout: 10000 });
  return { api: window.REALWORLD_LAYER11, context, window, document, listeners, saved, company };
}

test('loader identifies Layer 11, pins the accepted Layer 6 engine, and cache-busts the complete supported stack', () => {
  assert.match(loader, /RW-LAYER-11\.0 · Weekly Command Center & Runtime Diagnostics · 2026-10-14/);
  assert.match(loader, /cca64607926733ee0d1130138606b2753a67dd99\/index\.html/);
  assert.match(loader, /const RELEASE = '11\.0\.0'/);
  for (const file of ['layer7.js', 'layer8.2.js', 'layer9.js', 'layer10.js', 'layer11.js']) assert.ok(loader.includes(file));
  assert.doesNotMatch(loader, /const files=\[[^\]]*layer8\.3\.js/);
});

test('priority generation finds independent finance, supply, event, and delivery risks', () => {
  const env = makeHarness();
  const items = env.api.buildActionItems();
  const keys = items.map((item) => item.key);
  for (const key of ['overdraft-in-use', 'loan-arrears', 'recorded-obligations', 'supplier-orders-overdue', 'goods-out-of-stock', 'economic-event-active', 'delivery-jobs-overdue']) {
    assert.ok(keys.includes(key), `Expected priority ${key}`);
  }
  assert.ok(items.every((item) => ['high', 'medium', 'info'].includes(item.severity)));
  assert.ok(items.length <= 10);
});

test('read-only priority generation and panel rendering do not mutate company data', () => {
  const company = sampleCompany();
  const before = JSON.stringify(company);
  const env = makeHarness(company);
  env.api.buildActionItems();
  const html = env.api.buildPanel();
  assert.match(html, /data-testid="rw11-command-center"/);
  assert.match(html, /Priority review queue/);
  assert.match(html, /does not increase a score, move money, change inventory/);
  assert.equal(JSON.stringify(company), before);
});

test('cash review is conditional on available fields and does not invent missing data', () => {
  const env = makeHarness({ company: 'Minimal', week: 1, cash: 500, monthlyRent: 1000, monthlyUtilities: 200, products: [], purchaseOrders: [], history: [] });
  const items = env.api.buildActionItems();
  const cash = items.find((item) => item.key === 'cash-below-fixed-costs');
  assert.ok(cash);
  assert.match(cash.explanation, /PHP|₱/);
  assert.ok(items.some((item) => item.key === 'first-week-review'));
});

test('closed companies receive a read-only history notice and no operating suggestions', () => {
  const company = sampleCompany();
  company.realworldLayer9.closed = { atWeek: 4, date: '2026-10-01', cashAtClosure: 100 };
  const env = makeHarness(company);
  const items = env.api.buildActionItems();
  assert.equal(items.length, 1);
  assert.equal(items[0].key, 'business-closed');
  assert.match(items[0].nextStep, /historical records/i);
});

test('review log is company-save-scoped, week-scoped, idempotent, and requests a save', () => {
  const company = sampleCompany();
  const env = makeHarness(company);
  const first = env.api.markReviewed('overdraft-in-use');
  assert.equal(first.ok, true);
  assert.equal(first.saveRequested, true);
  assert.equal(env.saved.length, 1);
  assert.equal(env.saved[0], true);
  assert.equal(env.api.hasReviewed('overdraft-in-use'), true);
  const duplicate = env.api.markReviewed('overdraft-in-use');
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.reason, /already been reviewed/i);
  company.week = 6;
  assert.equal(env.api.hasReviewed('overdraft-in-use'), false);
});

test('review action refuses stale or unknown priority IDs and does not change financial fields', () => {
  const company = sampleCompany();
  const before = { cash: company.cash, ap: company.ap, stock: company.products[0].stock, loans: JSON.stringify(company.loans || []) };
  const env = makeHarness(company);
  const invalid = env.api.markReviewed('not-a-real-priority');
  assert.equal(invalid.ok, false);
  assert.equal(company.cash, before.cash);
  assert.equal(company.ap, before.ap);
  assert.equal(company.products[0].stock, before.stock);
  assert.equal(JSON.stringify(company.loans || []), before.loans);
  assert.equal(company.realworldLayer11, undefined);
});

test('HTML output safely escapes company and source record text', () => {
  const company = sampleCompany();
  company.company = '<img src=x onerror=alert(1)>';
  company.realworldLayer9.activeEvents[0].title = '<script>bad()</script>';
  const env = makeHarness(company);
  const html = env.api.buildPanel();
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /<script>bad/);
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;script&gt;/);
});

test('module status reports missing dependencies instead of claiming they are ready', () => {
  const env = makeHarness(sampleCompany());
  const status = env.api.moduleStatus();
  assert.equal(status.layer9, false);
  assert.equal(status.layer10, false);
  assert.match(status.layer11, /RW-LAYER-11\.0/);
  env.window.REALWORLD_LAYER9 = { getRuntimeState() { return { initialized: true, wrapperInstalled: true }; } };
  env.window.REALWORLD_LAYER10 = { getState() { return { initialized: true }; }, buildCompanySnapshot() {} };
  const after = env.api.moduleStatus();
  assert.equal(after.layer9, true);
  assert.equal(after.layer10, true);
});

test('review storage remains bounded to the most recent 120 records', () => {
  const company = sampleCompany();
  company.realworldLayer11 = { schemaVersion: 1, reviews: Array.from({ length: 150 }, (_, index) => ({ key: `old-${index}`, week: index + 1, date: '2026-01-01', label: 'Historic item' })) };
  const env = makeHarness(company);
  env.api.markReviewed('overdraft-in-use');
  assert.equal(company.realworldLayer11.reviews.length, 120);
  assert.equal(company.realworldLayer11.reviews.at(-1).key, 'overdraft-in-use');
});

test('browser initialization injects the Command Center before the main dashboard panels and into Reports', () => {
  const env = makeHarness(sampleCompany());
  env.context.renderDashboard = () => '<div class="page-head"><h1>Dashboard</h1></div><section class="rw9-panel" data-testid="rw9-voluntary-closure"></section><div class="grid stats-grid">metrics</div>';
  env.context.renderReports = () => '<div class="page-head"><h1>Reports &amp; Journal</h1></div>';
  env.listeners.get('DOMContentLoaded')[0]();
  const dashboard = env.context.renderDashboard();
  const commandPosition = dashboard.indexOf('data-testid="rw11-command-center"');
  const closurePosition = dashboard.indexOf('data-testid="rw9-voluntary-closure"');
  const statsPosition = dashboard.indexOf('class="grid stats-grid"');
  assert.ok(commandPosition >= 0);
  assert.ok(commandPosition < closurePosition);
  assert.ok(closurePosition < statsPosition);
  assert.match(env.context.renderReports(), /data-testid="rw11-command-center"/);
});

test('the review button handler logs a review and requests a normal save without transaction posting', () => {
  const env = makeHarness(sampleCompany());
  env.listeners.get('DOMContentLoaded')[0]();
  const clickHandlers = env.listeners.get('click');
  assert.ok(clickHandlers && clickHandlers.length);
  const action = { getAttribute(name) { return name === 'data-rw11-key' ? 'overdraft-in-use' : null; } };
  clickHandlers[0]({
    target: { closest(selector) { return selector === '[data-rw11-action="review"]' ? action : null; } },
    preventDefault() {}, stopImmediatePropagation() {}
  });
  assert.equal(env.api.hasReviewed('overdraft-in-use'), true);
  assert.equal(env.saved.length, 1);
  assert.equal(env.company.cash, 12000);
  assert.equal(env.company.realworldLayer9.activeEvents[0].id, 'demand-downturn');
});
