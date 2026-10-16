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

function flushNativeEvents() { return new Promise((resolve) => setImmediate(resolve)); }

test('loader identifies Layer 11, pins the accepted Layer 6 engine, and cache-busts the complete supported stack', () => {
  assert.match(loader, /RW-LAYER-11\.9\.0 · Saved Decision Ledger & Change History · 2026-10-16/);
  assert.match(loader, /cca64607926733ee0d1130138606b2753a67dd99\/index\.html/);
  assert.match(loader, /const RELEASE = '11\.9\.0'/);
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
  assert.match(status.layer11, /RW-LAYER-11\./);
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



test('Expansion & Competitive Strategy appears once on Dashboard, stays out of Reports, and does not mutate save data during render', () => {
  const company = sampleCompany();
  company.cash = 200000;
  company.marketStrategy = 'balanced';
  company.marketingBudget = 1000;
  company.baselineMarketing = 1000;
  company.products = [{ id: 'bottle', name: 'Everyday Bottle', kind: 'goods', price: 100, cost: 40, unitCost: 40, baseDemand: 10, refPrice: 100, elasticity: 1, stock: 50, stockValue: 2000, competitorPrice: 95 }];
  const before = JSON.stringify(company);
  const env = makeHarness(company);
  env.context.estimateWeeklyProductDemand = vm.runInContext(`(product) => Number(product.baseDemand) * Math.pow(100 / Math.max(1, Number(product.price)), 1) * ((game.marketStrategy || 'balanced') === 'value' ? 1.015 : (game.marketStrategy || 'balanced') === 'premium' ? 0.99 : 1)`, env.context);
  env.context.renderDashboard = () => '<div class="page-head"><h1>Dashboard</h1></div><section data-testid="rw9-voluntary-closure"></section><div class="grid stats-grid">metrics</div>';
  env.context.renderReports = () => '<div class="page-head"><h1>Reports &amp; Journal</h1></div>';
  env.listeners.get('DOMContentLoaded')[0]();
  const dashboard = env.context.renderDashboard();
  assert.match(dashboard, /data-testid="rw11-expansion-strategy-lab"/);
  assert.equal((dashboard.match(/data-testid="rw11-expansion-strategy-lab"/g) || []).length, 1);
  assert.ok(dashboard.indexOf('data-testid="rw11-command-center"') < dashboard.indexOf('data-testid="rw11-expansion-strategy-lab"'));
  assert.doesNotMatch(env.context.renderReports(), /data-testid="rw11-expansion-strategy-lab"/);
  assert.equal(JSON.stringify(company), before);
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

test('pricing and demand scenario calculation uses the core estimator and never mutates company state', () => {
  const company = sampleCompany();
  company.marketingBudget = 1000;
  company.baselineMarketing = 1000;
  company.products = [
    { id: 'bottle', name: 'Everyday Bottle', kind: 'goods', price: 100, cost: 40, unitCost: 40, baseDemand: 10, refPrice: 100, elasticity: 1, stock: 50, stockValue: 2000, competitorPrice: 95 },
    { id: 'stand', name: 'Phone Stand', kind: 'goods', price: 60, cost: 20, unitCost: 20, baseDemand: 8, refPrice: 60, elasticity: 1.2, stock: 30, stockValue: 600, competitorPrice: 58 }
  ];
  const before = JSON.stringify(company);
  const env = makeHarness(company);
  env.context.estimateWeeklyProductDemand = (product) => {
    const reference = Number(product.refPrice || product.price);
    const price = Math.max(1, Number(product.price));
    const marketing = 1 + Math.min(0.78, Math.sqrt(Math.max(0, company.marketingBudget) / Math.max(1, company.baselineMarketing)) * 0.13);
    return Number(product.baseDemand) * Math.pow(reference / price, Number(product.elasticity) || 1) * marketing;
  };
  const base = env.api.calculateMarketScenario(company, 0, 1);
  assert.equal(base.available, true);
  assert.equal(base.rows.length, 2);
  assert.ok(Math.abs(base.changeAfterMarketing) < 1e-8, 'zero adjustment should reproduce the baseline potential');
  const discount = env.api.calculateMarketScenario(company, -10, 1.25);
  assert.equal(discount.available, true);
  assert.equal(discount.rows[0].proposedPrice, 90);
  assert.ok(discount.rows[0].scenarioDemand > discount.rows[0].currentDemand);
  assert.equal(discount.targetMarketing, 1250);
  assert.notEqual(discount.changeAfterMarketing, 0);
  assert.equal(JSON.stringify(company), before, 'scenario previews must not mutate products, cash, marketing, or saved records');
});

test('pricing planner safely handles missing estimator and unsupported scenario input', () => {
  const company = sampleCompany();
  company.products = [{ id: 'p', kind: 'goods', price: 10, baseDemand: 5, cost: 2 }];
  const env = makeHarness(company);
  const unavailable = env.api.calculateMarketScenario(company, 0, 1);
  assert.equal(unavailable.available, false);
  assert.match(unavailable.reason, /estimator/i);
  const badOption = env.api.calculateMarketScenario(company, 17, 1, () => 1);
  assert.equal(badOption.available, false);
  assert.match(badOption.reason, /supported scenario/i);
});

test('market renderer receives one Pricing & Demand Lab before market metrics and stages no automatic transaction', () => {
  const company = sampleCompany();
  company.marketingBudget = 1500;
  company.baselineMarketing = 1500;
  company.products = [{ id: 'bottle', name: 'Everyday Bottle', kind: 'goods', price: 100, cost: 40, unitCost: 40, stock: 50, stockValue: 2000, baseDemand: 10, refPrice: 100, elasticity: 1 }];
  const env = makeHarness(company);
  env.context.estimateWeeklyProductDemand = (p) => Number(p.baseDemand) * Math.pow((Number(p.refPrice) || p.price) / Math.max(1, Number(p.price)), Number(p.elasticity) || 1);
  env.context.renderMarket = () => '<div class="page-head"><h1>Market &amp; sales</h1></div><div class="grid four-col stats-grid">market metrics</div>';
  env.listeners.get('DOMContentLoaded')[0]();
  const html = env.context.renderMarket();
  assert.match(html, /data-testid="rw11-market-strategy-lab"/);
  assert.match(html, /Pricing &amp; Demand Lab/);
  assert.ok(html.indexOf('data-testid="rw11-market-strategy-lab"') < html.indexOf('market metrics'));
  assert.match(html, /data-rw11-stage-price="bottle"/);
  assert.match(html, /Preview only/);
  assert.equal(JSON.stringify(company).includes('rw11'), false, 'the planner does not write transient UI state into the save');
  assert.equal(env.api.getState().wrappedMarket, true);
});


test('staging a price scenario fills Operations input but never changes the saved product or writes a transaction', () => {
  const company = sampleCompany();
  company.marketingBudget = 1000;
  company.baselineMarketing = 1000;
  company.products = [{ id: 'bottle', name: 'Everyday Bottle', kind: 'goods', price: 100, cost: 40, unitCost: 40, stock: 50, stockValue: 2000, baseDemand: 10, refPrice: 100, elasticity: 1 }];
  const env = makeHarness(company);
  env.context.estimateWeeklyProductDemand = (product) => Number(product.baseDemand) * Math.pow((Number(product.refPrice) || product.price) / Math.max(1, Number(product.price)), Number(product.elasticity) || 1);
  const before = JSON.stringify(company);
  let targetView = '';
  const notices = [];
  const input = {
    value: '100.00',
    getAttribute(name) { return name === 'data-price-input' ? 'bottle' : null; },
    dispatchEvent() {}, scrollIntoView() {}, focus() {}
  };
  env.context.navSet = (view) => { targetView = view; };
  env.context.notify = (message) => notices.push(message);
  env.document.querySelectorAll = (selector) => selector === '[data-price-input]' ? [input] : [];
  env.listeners.get('DOMContentLoaded')[0]();
  const changeHandler = env.listeners.get('change').find((fn) => fn === env.listeners.get('change')[0]);
  assert.ok(changeHandler);
  changeHandler({ target: { value: '-5', getAttribute(name) { return name === 'data-rw11-price-adjustment' ? '' : null; } } });
  const button = { getAttribute(name) { return name === 'data-rw11-stage-price' ? 'bottle' : null; } };
  env.listeners.get('click')[0]({
    target: { closest(selector) { return selector === '[data-rw11-stage-price]' ? button : null; } },
    preventDefault() {}, stopImmediatePropagation() {}
  });
  assert.equal(targetView, 'operations');
  assert.equal(input.value, '95.00');
  assert.equal(company.products[0].price, 100, 'staging must not apply the selling price');
  assert.equal(JSON.stringify(company), before, 'staging must not mutate any serialized company state');
  assert.equal(env.saved.length, 0, 'staging must not save the game');
  assert.match(notices.join(' '), /not saved yet/i);
});


test('staging a marketing scenario fills the existing budget field but does not change the committed budget', () => {
  const company = sampleCompany();
  company.marketingBudget = 1000;
  company.baselineMarketing = 1000;
  company.products = [{ id: 'bottle', name: 'Everyday Bottle', kind: 'goods', price: 100, cost: 40, unitCost: 40, stock: 50, stockValue: 2000, baseDemand: 10, refPrice: 100, elasticity: 1 }];
  const env = makeHarness(company);
  env.context.estimateWeeklyProductDemand = (product) => Number(product.baseDemand) * Math.pow((Number(product.refPrice) || product.price) / Math.max(1, Number(product.price)), Number(product.elasticity) || 1);
  const before = JSON.stringify(company);
  let targetView = '';
  const notices = [];
  const input = { value: '1000.00', dispatchEvent() {}, scrollIntoView() {}, focus() {} };
  const baseQuerySelector = env.document.querySelector.bind(env.document);
  env.document.querySelector = (selector) => selector === '#marketing-budget' ? input : baseQuerySelector(selector);
  env.context.navSet = (view) => { targetView = view; };
  env.context.notify = (message) => notices.push(message);
  env.listeners.get('DOMContentLoaded')[0]();
  const changeHandler = env.listeners.get('change')[0];
  changeHandler({ target: { value: '1.25', getAttribute(name) { return name === 'data-rw11-marketing-factor' ? '' : null; } } });
  const button = { getAttribute(name) { return name === 'data-rw11-stage-marketing' ? '' : null; } };
  env.listeners.get('click')[0]({
    target: { closest(selector) { return selector === '[data-rw11-stage-marketing]' ? button : null; } },
    preventDefault() {}, stopImmediatePropagation() {}
  });
  assert.equal(targetView, 'market');
  assert.equal(input.value, '1300.00');
  assert.equal(company.marketingBudget, 1000, 'staging must not commit the new budget');
  assert.equal(JSON.stringify(company), before, 'staging must not mutate serialized business state');
  assert.equal(env.saved.length, 0, 'staging must not save the game');
  assert.match(notices.join(' '), /not saved yet/i);
});



test('competitive strategy matrix compares value, balanced, and premium profiles while restoring the live save exactly', () => {
  const company = sampleCompany();
  company.cash = 150000;
  company.marketStrategy = 'balanced';
  company.marketingBudget = 1500;
  company.baselineMarketing = 1500;
  company.products = [{ id: 'bottle', name: 'Everyday Bottle', kind: 'goods', price: 100, cost: 40, unitCost: 40, baseDemand: 10, refPrice: 100, elasticity: 1, stock: 50, stockValue: 2000, competitorPrice: 95 }];
  const before = JSON.stringify(company);
  const env = makeHarness(company);
  env.context.estimateWeeklyProductDemand = vm.runInContext(`(product) => {
    const strategy = game.marketStrategy || 'balanced';
    const multiplier = strategy === 'value' ? 1.015 : strategy === 'premium' ? 0.99 : 1;
    return Number(product.baseDemand) * Math.pow(100 / Math.max(1, Number(product.price)), Number(product.elasticity) || 1) * multiplier;
  }`, env.context);
  const matrix = env.api.calculateCompetitiveStrategies(company);
  assert.equal(matrix.available, true);
  assert.equal(matrix.profiles.length, 3);
  assert.deepEqual(Array.from(matrix.profiles, (row) => row.id), ['value', 'balanced', 'premium']);
  assert.equal(matrix.profiles[0].priceAdjustment, -5);
  assert.equal(matrix.profiles[0].marketingFactor, 1.25);
  assert.equal(matrix.profiles[1].priceAdjustment, 0);
  assert.equal(matrix.profiles[2].priceAdjustment, 5);
  assert.equal(matrix.profiles[1].changeVsCurrent, 0);
  assert.equal(JSON.stringify(company), before, 'strategy preview must restore marketStrategy and must not change cash, products, budgets or ledgers');
});

test('expansion and competitive planner displays rival references and existing capacity costs without mutating state', () => {
  const company = sampleCompany();
  company.cash = 200000;
  company.marketStrategy = 'balanced';
  company.marketingBudget = 1500;
  company.baselineMarketing = 1500;
  company.products = [{ id: 'bottle', name: 'Everyday Bottle', kind: 'goods', price: 100, cost: 40, unitCost: 40, baseDemand: 10, refPrice: 100, elasticity: 1, stock: 50, stockValue: 2000, competitorPrice: 95 }];
  company.realworldLayer9.growth = { units: 1, lastWeek: 0, invested: 25000, monthlyUtilityIncrease: 200, assetIds: [] };
  const before = JSON.stringify(company);
  const env = makeHarness(company);
  env.context.estimateWeeklyProductDemand = vm.runInContext(`(product) => Number(product.baseDemand) * Math.pow(100 / Math.max(1, Number(product.price)), 1) * ((game.marketStrategy || 'balanced') === 'value' ? 1.015 : (game.marketStrategy || 'balanced') === 'premium' ? 0.99 : 1)`, env.context);
  const html = env.api.buildExpansionStrategyLab(company);
  assert.match(html, /data-testid="rw11-expansion-strategy-lab"/);
  assert.match(html, /Value fighter/);
  assert.match(html, /Balanced growth/);
  assert.match(html, /Premium positioning/);
  assert.match(html, /Rival reference/);
  assert.match(html, /data-rw11-stage-growth="25000\.00"/);
  assert.match(html, /0\.8% of the amount/);
  assert.equal(JSON.stringify(company), before, 'rendering strategy and expansion planning must be read-only');
});

test('staging a market strategy pre-fills existing controls without committing strategy, price, budget, cash, or a save', () => {
  const company = sampleCompany();
  company.marketStrategy = 'balanced';
  company.marketingBudget = 1000;
  company.baselineMarketing = 1000;
  company.products = [{ id: 'bottle', name: 'Everyday Bottle', kind: 'goods', price: 100, cost: 40, unitCost: 40, baseDemand: 10, refPrice: 100, elasticity: 1, stock: 50, stockValue: 2000, competitorPrice: 95 }];
  const before = JSON.stringify(company);
  const env = makeHarness(company);
  env.context.estimateWeeklyProductDemand = vm.runInContext(`(product) => Number(product.baseDemand) * Math.pow(100 / Math.max(1, Number(product.price)), 1) * ((game.marketStrategy || 'balanced') === 'value' ? 1.015 : (game.marketStrategy || 'balanced') === 'premium' ? 0.99 : 1)`, env.context);
  let targetView = '';
  let marketHTML = '';
  const strategyInput = { value: 'balanced', scrollIntoView() {}, focus() {} };
  env.document.querySelector = (selector) => selector === '#market-strategy' ? strategyInput : null;
  env.context.navSet = (view) => {
    targetView = view;
    // Simulate the target view's synchronous render that occurs during navigation in the live app.
    if (view === 'market') marketHTML = env.api.buildMarketLab(company);
  };
  const cases = [
    { id: 'value', strategy: 'value', price: -5, marketing: 1.25, title: 'Value fighter' },
    { id: 'balanced', strategy: 'balanced', price: 0, marketing: 1, title: 'Balanced growth' },
    { id: 'premium', strategy: 'premium', price: 5, marketing: 1, title: 'Premium positioning' }
  ];
  for (const profile of cases) {
    const staged = env.api.stageCompetitiveProfile(profile.id);
    assert.equal(staged.ok, true, `${profile.id} should stage`);
    assert.equal(staged.saved, false);
    assert.equal(targetView, 'market');
    assert.equal(strategyInput.value, profile.strategy);
    assert.match(marketHTML, new RegExp(`<option value="${profile.price}" selected>`), `${profile.id} price selector remains staged after navigation render`);
    assert.match(marketHTML, new RegExp(`<option value="${profile.marketing}" selected>`), `${profile.id} marketing selector remains staged after navigation render`);
    assert.ok(marketHTML.includes('data-testid="rw11-staged-profile"'), `${profile.id} should show the staged-profile disclosure`);
    assert.ok(marketHTML.includes(profile.title), `${profile.id} title should be shown in the staged-profile disclosure`);
    assert.match(marketHTML, /temporary planning selections/);
    assert.equal(company.marketStrategy, 'balanced');
    assert.equal(JSON.stringify(company), before, `${profile.id} staging must not mutate saved company data`);
    assert.equal(env.saved.length, 0, `${profile.id} staging must not request a save`);
  }
});


test('manual scenario changes clear the staged-profile banner while keeping the new preview selection read-only', () => {
  const company = sampleCompany();
  company.marketStrategy = 'balanced';
  company.marketingBudget = 1000;
  company.baselineMarketing = 1000;
  company.products = [{ id: 'bottle', name: 'Everyday Bottle', kind: 'goods', price: 100, cost: 40, unitCost: 40, baseDemand: 10, refPrice: 100, elasticity: 1, stock: 50, stockValue: 2000, competitorPrice: 95 }];
  const before = JSON.stringify(company);
  const env = makeHarness(company);
  env.context.estimateWeeklyProductDemand = (product) => Number(product.baseDemand) * Math.pow(100 / Math.max(1, Number(product.price)), 1);
  const strategyInput = { value: 'balanced', scrollIntoView() {}, focus() {} };
  env.document.querySelector = (selector) => selector === '#market-strategy' ? strategyInput : null;
  env.context.navSet = () => {};
  env.context.renderView = () => {};
  env.listeners.get('DOMContentLoaded')[0]();
  env.api.stageCompetitiveProfile('value');
  assert.match(env.api.buildMarketLab(company), /data-testid="rw11-staged-profile"/);
  const changeHandlers = env.listeners.get('change');
  assert.ok(changeHandlers && changeHandlers.length);
  changeHandlers[0]({ target: { value: '-10', getAttribute(name) { return name === 'data-rw11-price-adjustment' ? '' : null; } } });
  const html = env.api.buildMarketLab(company);
  assert.doesNotMatch(html, /data-testid="rw11-staged-profile"/);
  assert.match(html, /<option value="-10" selected>/);
  assert.equal(JSON.stringify(company), before);
  assert.equal(env.saved.length, 0);
});

test('staging capacity investment fills the existing Layer 9 input only and respects the active cash/cooldown gates', () => {
  const company = sampleCompany();
  company.cash = 150000;
  company.realworldLayer9.growth = { units: 1, lastWeek: 0, invested: 25000, monthlyUtilityIncrease: 200, assetIds: [] };
  const before = JSON.stringify(company);
  const env = makeHarness(company);
  let targetView = '';
  const amountInput = { value: '25000.00', disabled: false, dispatchEvent() {}, scrollIntoView() {}, focus() {} };
  env.document.querySelector = (selector) => selector === '#rw9-growth-amount' ? amountInput : null;
  env.context.navSet = (view) => { targetView = view; };
  const staged = env.api.stageGrowthInvestment(50000);
  assert.equal(staged.ok, true);
  assert.equal(staged.saved, false);
  assert.equal(targetView, 'dashboard');
  assert.equal(amountInput.value, '50000.00');
  assert.equal(JSON.stringify(company), before);
  assert.equal(env.saved.length, 0);

  company.realworldLayer9.growth.lastWeek = company.week;
  const beforeBlocked = JSON.stringify(company);
  const blocked = env.api.stageGrowthInvestment(25000);
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /Wait 4 more week/);
  assert.equal(JSON.stringify(company), beforeBlocked, 'the rejected staging attempt must not mutate company state');
});

test('marketing budget staging rounds to the nearest native form step and clearly discloses the actual staged amount', () => {
  const company = sampleCompany();
  company.cash = 150000;
  company.marketingBudget = 1500;
  company.baselineMarketing = 1500;
  company.products = [{ id: 'bottle', name: 'Everyday Bottle', kind: 'goods', price: 100, cost: 40, unitCost: 40, baseDemand: 10, refPrice: 100, elasticity: 1, stock: 50, stockValue: 2000, competitorPrice: 95 }];
  const before = JSON.stringify(company);
  const env = makeHarness(company);
  env.context.estimateWeeklyProductDemand = vm.runInContext(`(product) => Number(product.baseDemand) * Math.pow(100 / Math.max(1, Number(product.price)), 1)`, env.context);
  env.context.localModelAmount = (value) => value;
  let targetView = '';
  const notices = [];
  const budgetInput = { value: '1500.00', dispatchEvent() {}, scrollIntoView() {}, focus() {} };
  env.document.querySelector = (selector) => selector === '#marketing-budget' ? budgetInput : null;
  env.context.navSet = (view) => { targetView = view; };
  env.context.notify = (message) => notices.push(message);
  env.listeners.get('DOMContentLoaded')[0]();
  env.listeners.get('change')[0]({ target: { value: '1.25', getAttribute(name) { return name === 'data-rw11-marketing-factor' ? '' : null; } } });
  const staged = env.api.stageScenarioMarketingBudget();
  assert.equal(staged.ok, true);
  assert.equal(staged.targetMarketing, 1875);
  assert.equal(staged.stagedMarketing, 1900);
  assert.equal(staged.rounded, true);
  assert.equal(budgetInput.value, '1900.00');
  assert.equal(targetView, 'market');
  assert.equal(company.marketingBudget, 1500);
  assert.equal(JSON.stringify(company), before);
  assert.equal(env.saved.length, 0);
  assert.match(notices.join(' '), /rounded to the nearest accepted budget step/i);
  assert.match(notices.join(' '), /1,900/);
});


test('saved decision ledger is read-only when empty and appears in Dashboard/Reports command center', () => {
  const company = sampleCompany();
  const before = JSON.stringify(company);
  const env = makeHarness(company);
  const html = env.api.buildPanel();
  assert.match(html, /data-testid="rw11-decision-log"/);
  assert.match(html, /No saved strategy changes have been recorded yet/);
  assert.match(html, /staging actions do not appear here/i);
  assert.equal(JSON.stringify(company), before, 'rendering the empty log must not mutate a save');
  assert.equal(env.saved.length, 0);
});

test('successful market-positioning submit logs only the committed change, preserves reviews, and saves the log', async () => {
  const company = sampleCompany();
  company.marketStrategy = 'balanced';
  company.realworldLayer11 = { schemaVersion: 1, reviews: [{ key: 'prior-review', week: 4, date: '2026-10-13', label: 'Prior item' }] };
  const env = makeHarness(company);
  env.listeners.get('DOMContentLoaded')[0]();
  const select = { value: 'value' };
  const form = { getAttribute(name) { return name === 'data-form' ? 'market-strategy' : null; }, querySelector(selector) { return selector === '#market-strategy' ? select : null; } };
  const event = { target: form };
  for (const handler of env.listeners.get('submit') || []) handler(event);
  company.marketStrategy = 'value'; // emulate the existing native core submit handler
  await flushNativeEvents();
  const rows = company.realworldLayer11.decisions;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'market-strategy');
  assert.equal(rows[0].subject, 'Market positioning');
  assert.equal(rows[0].beforeText, 'Balanced positioning');
  assert.equal(rows[0].afterText, 'Value pricing');
  assert.equal(company.realworldLayer11.reviews[0].key, 'prior-review', 'decision log must preserve review history');
  assert.equal(env.saved.at(-1), true);
  assert.equal(company.cash, 12000);
  assert.equal(JSON.stringify(company.products), JSON.stringify(sampleCompany().products));
  const html = env.api.buildPanel();
  assert.match(html, /Saved decision log/);
  assert.match(html, /Balanced positioning/);
  assert.match(html, /Value pricing/);
});

test('successful native marketing submit logs actual accepted budget, but staging-only submit without a value change logs nothing', async () => {
  const company = sampleCompany();
  company.marketingBudget = 1500;
  const env = makeHarness(company);
  env.listeners.get('DOMContentLoaded')[0]();
  const input = { value: '1900' };
  const form = { getAttribute(name) { return name === 'data-form' ? 'marketing' : null; }, querySelector(selector) { return selector === '#marketing-budget' ? input : null; } };
  for (const handler of env.listeners.get('submit') || []) handler({ target: form });
  company.marketingBudget = 1900; // emulate a successful native commit after validation
  await flushNativeEvents();
  let rows = company.realworldLayer11.decisions;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'marketing-budget');
  assert.equal(rows[0].beforeText, `${new Intl.NumberFormat('en-PH', {style:'currency',currency:'PHP',maximumFractionDigits:2}).format(1500)}/week`);
  assert.equal(rows[0].afterText, `${new Intl.NumberFormat('en-PH', {style:'currency',currency:'PHP',maximumFractionDigits:2}).format(1900)}/week`);
  const beforeCount = env.saved.length;
  for (const handler of env.listeners.get('submit') || []) handler({ target: form });
  await flushNativeEvents();
  assert.equal(company.realworldLayer11.decisions.length, 1, 'same value resubmitted must not add a decision');
  assert.equal(env.saved.length, beforeCount, 'no-change submission must not save another log row');
});

test('successful Save selling price click logs only the product whose saved price changed', async () => {
  const company = sampleCompany();
  company.products[0].price = 100;
  company.products[0].name = 'Rice';
  const env = makeHarness(company);
  env.listeners.get('DOMContentLoaded')[0]();
  const input = { value: '105.00', getAttribute(name) { return name === 'data-price-input' ? 'p1' : null; } };
  env.document.querySelectorAll = (selector) => selector === '[data-price-input]' ? [input] : [];
  const button = { getAttribute(name) { return name === 'data-action' ? 'save-price' : name === 'data-id' ? 'p1' : null; }, closest(selector) { return selector === '[data-action="save-price"]' ? this : null; } };
  for (const handler of env.listeners.get('click') || []) handler({ target: button });
  company.products[0].price = 105; // emulate successful native click handler
  await flushNativeEvents();
  const rows = company.realworldLayer11.decisions;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'product-price');
  assert.equal(rows[0].subject, 'Rice');
  assert.match(rows[0].beforeText, /100/);
  assert.match(rows[0].afterText, /105/);
  assert.equal(company.cash, 12000);
  assert.equal(env.saved.at(-1), true);
});

test('staged profile interactions and failed/no-change submissions do not create decision records', async () => {
  const company = sampleCompany();
  const env = makeHarness(company);
  env.listeners.get('DOMContentLoaded')[0]();
  const select = { value: 'value' };
  const form = { getAttribute(name) { return name === 'data-form' ? 'market-strategy' : null; }, querySelector(selector) { return selector === '#market-strategy' ? select : null; } };
  for (const handler of env.listeners.get('submit') || []) handler({ target: form });
  await flushNativeEvents();
  assert.equal(company.realworldLayer11, undefined, 'no recorded commit means no decision ledger write');
  assert.equal(env.saved.length, 0);
});

test('decision history remains bounded and escaped while existing review rows survive updates', async () => {
  const company = sampleCompany();
  company.marketStrategy = 'balanced';
  company.realworldLayer11 = {
    schemaVersion: 1,
    reviews: [{ key: 'keep-review', week: 5, date: '2026-10-14', label: 'Review' }],
    decisions: Array.from({ length: 80 }, (_, index) => ({ id: `old-${index}`, week: 1, date: '2026-01-01', kind: 'market-strategy', subject: '<img src=x>', beforeText: 'Balanced', afterText: 'Value' }))
  };
  const env = makeHarness(company);
  env.listeners.get('DOMContentLoaded')[0]();
  const select = { value: 'value' };
  const form = { getAttribute(name) { return name === 'data-form' ? 'market-strategy' : null; }, querySelector(selector) { return selector === '#market-strategy' ? select : null; } };
  for (const handler of env.listeners.get('submit') || []) handler({ target: form });
  company.marketStrategy = 'value';
  await flushNativeEvents();
  assert.equal(company.realworldLayer11.decisions.length, 80);
  assert.equal(company.realworldLayer11.decisions.at(-1).beforeText, 'Balanced positioning');
  assert.equal(company.realworldLayer11.reviews[0].key, 'keep-review');
  const html = env.api.buildPanel();
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img src=x&gt;/);
});
