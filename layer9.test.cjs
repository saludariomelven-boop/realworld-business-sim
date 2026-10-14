const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'layer9.js'), 'utf8');

function createHarness(options = {}) {
  const g = options.game || {
    version: 1, saveFormatVersion: 8, businessTemplateId: 'logistics-delivery', businessModel: 'services', businessDisplayName: 'Logistics & Delivery',
    countryCode: 'PH', currencyCode: 'PHP', companyStatus: 'active', company: 'Test Logistics', founder: 'Tester', location: 'Pasay', industry: 'agency',
    date: '2026-01-05', week: 1, cash: 100000, taxRate: 0.2, taxPayable: 0, retainedEarnings: 0,
    reputation: 70, economy: 1, inflation: 1, competitorAggression: 1, marketingBudget: 0, baselineMarketing: 100,
    baseCapacity: 10, monthlyRent: 10000, monthlyUtilities: 2000,
    products: [{ id: 'local-delivery', name: 'Local Delivery', kind: 'service', baseDemand: 10, price: 180, refPrice: 180, competitorPrice: 180, elasticity: 1, unitCost: 72, cost: 72 }],
    employees: [], competitors: [{ id: 'r1', stockIndex: 0.8 }], purchaseOrders: [], supplierAdvances: 0,
    assets: [], events: [], history: [], notes: [], journal: [], cashFlowHistory: [],
    totals: { revenue: 0, cogs: 0, tax: 0, net: 0, units: 0 }, lastWeek: null
  };
  const listenerMap = new Map();
  const attributes = new Map();
  const styleNodes = [];
  const dynamicNodes = new Map();
  const meta = { setAttribute: (k, v) => attributes.set(`meta:${k}`, v) };
  const buildLabel = { textContent: '' };
  const head = { appendChild: (node) => styleNodes.push(node) };
  const document = {
    readyState: 'loading', head, documentElement: head,
    addEventListener(type, callback, options) { const arr = listenerMap.get(type) || []; arr.push({ callback, options }); listenerMap.set(type, arr); },
    querySelector(selector) {
      if (selector === '#rw9-layer-styles') return null;
      if (selector === 'meta[name="application-version"]') return meta;
      if (selector === '.brand-build') return buildLabel;
      if (selector === '#rw9-growth-cash-preview' || selector === '#rw9-growth-reserve-preview') { if (!dynamicNodes.has(selector)) dynamicNodes.set(selector, { textContent: '', setAttribute(k, v) { this[k] = v; } }); return dynamicNodes.get(selector); }
      return null;
    },
    querySelectorAll() { return []; },
    createElement(tag) { return { tagName: tag.toUpperCase(), textContent: '', id: '' }; }
  };
  const calls = { journal: [], saves: 0, saveSnapshots: [], renders: 0, coreWeeks: 0, notifications: [] };
  const math = Object.create(Math); math.random = () => 0.99;
  const ctx = {
    document, window: { confirm: () => true }, Math: math, console,
    game: g,
    getIndustry() { return { baseCapacity: g.baseCapacity, products: g.products, roles: [] }; },
    renderDashboard() { return '<main>dashboard</main>'; },
    renderOperations() { return '<main>operations</main>'; },
    renderMarket() { return '<main>market</main>'; },
    renderFinance() { return '<main>finance</main>'; },
    renderRisk() { return '<main>risk</main>'; },
    renderReports() { return '<main>reports</main>'; },
    renderAll() { calls.renders++; }, renderView() { calls.renders++; },
    saveGame() { calls.saves++; calls.saveSnapshots.push(g.products.map((p) => ({ id: p.id, baseDemand: p.baseDemand, unitCost: p.unitCost }))); }, notify(message) { calls.notifications.push(message); },
    localModelAmount(v) { return v; }, money(v) { return `PHP ${Number(v).toFixed(2)}`; },
    customerDemandMultiplier() { return 1; }, seasonalDemandMultiplier() { return 1.2; }, seasonalOutlook() { return { factor: 1.2, name: 'Peak season' }; }, marketStrategyMultiplier() { return 1; },
    SUPPLIER_CATALOG: [
      { id: 'standard', name: 'Standard Supply', leadWeeks: 2, reliability: 0.85, priceFactor: 1 },
      { id: 'rapid', name: 'Rapid Supply', leadWeeks: 1, reliability: 0.95, priceFactor: 1.12 }
    ],
    getProductReorderPlan(p) { return { suppliers: [
      { id: 'standard', name: 'Standard Supply', leadWeeks: 2, reliability: 0.85, priceFactor: 1, inboundByArrival: 0, suggestedQuantity: p.kind === 'goods' ? 12 : 0, quantityCapped: false },
      { id: 'rapid', name: 'Rapid Supply', leadWeeks: 1, reliability: 0.95, priceFactor: 1.12, inboundByArrival: 0, suggestedQuantity: 0, quantityCapped: false }
    ] }; },
    estimateWeeklyProductDemand(p) { return p.baseDemand; },
    getWorkingCapitalPlanSettings() { return { reserve: 25000 }; }, computeWorkingCapitalForecast() { return { workingCapital: 25000, operatingCurrentLiabilities: 4000 }; },
    receiptJournal(memo, amount, account) { calls.journal.push({ memo, amount, account, type: 'receipt' }); g.cash += Number(amount); },
    payJournal(memo, amount, account) { calls.journal.push({ memo, amount, account, type: 'payment' }); g.cash -= Number(amount); },
    makeEntry(memo, lines) { calls.journal.push({ memo, lines, type: 'entry' }); },
    purchaseFixedAsset(amount, details) { if (amount > g.cash) return false; g.cash -= amount; const asset = { id: `asset-${g.assets.length + 1}`, name: details.name, category: details.category, purchaseWeek: g.week, cost: amount }; g.assets.push(asset); calls.journal.push({ memo: details.name, amount, type: 'asset' }); return true; },
    requestConfirm(message, callback, options) { calls.confirm = { message, options }; callback(); },
    runWeek() {
      calls.coreWeeks++;
      const reserved = ctx.getIndustry().baseCapacity;
      g.capacitySeenDuringWeek = reserved;
      g.demandSeenDuringWeek = g.products.map((p) => p.baseDemand);
      g.unitCostSeenDuringWeek = g.products.map((p) => p.unitCost);
      const report = { week: g.week, date: g.date, revenue: 200, cogs: 40, rent: 10, utilities: 5, payroll: 0, marketing: 0, other: 0, interest: 0, depreciation: 0, tax: 20, net: 125, units: 2, stockouts: 0 };
      g.totals.revenue = (g.totals.revenue || 0) + report.revenue;
      g.totals.cogs = (g.totals.cogs || 0) + report.cogs;
      g.totals.tax = (g.totals.tax || 0) + report.tax;
      g.totals.net = (g.totals.net || 0) + report.net;
      g.totals.units = (g.totals.units || 0) + report.units;
      g.retainedEarnings = (g.retainedEarnings || 0) + report.net;
      g.history.push(report); g.lastWeek = report;
      g.notes.unshift({ week: report.week, summary: 'core week' });
      ctx.saveGame(true);
      g.date = '2026-01-12'; g.week++;
      return 'core-week-closed';
    }
  };
  const context = vm.createContext(ctx);
  vm.runInContext(source, context, { filename: 'layer9.js', timeout: 10000 });
  const api = context.window.REALWORLD_LAYER9;
  api.init();
  return { context, api, game: g, calls, listenerMap, attributes, buildLabel, dynamicNodes };
}

test('Layer 9 exposes one integrated release label and preserves the v8 save boundary', () => {
  const h = createHarness();
  assert.equal(h.api.build, 'RW-LAYER-9.0 · Integrated Business Systems & Continuity · 2026-10-14');
  assert.equal(h.game.saveFormatVersion, 8);
  assert.equal(h.attributes.get('meta:content'), h.api.build);
  assert.equal(h.buildLabel.textContent, `Build ID: ${h.api.build}`);
  assert.equal(h.game.realworldLayer9.schemaVersion, 1);
  assert.equal(h.api.getRuntimeState().wrapperInstalled, true);
  assert.equal(h.game.realworldLayer9.closed, null);
});

test('demand explanation calculates an inspectable factor breakdown and noise band', () => {
  const h = createHarness();
  const d = h.api.estimateDemand(h.game.products[0], h.game);
  assert.ok(d.expected > 0);
  assert.equal(d.lower, Math.floor(d.expected * 0.88));
  assert.equal(d.upper, Math.ceil(d.expected * 1.12));
  assert.equal(d.seasonFactor, 1.2);
  assert.equal(d.customerMultiplier, 1);
  assert.ok(d.marketingMultiplier >= 1);
  assert.ok(d.reputationMultiplier > 0.9);
});

test('supplier snapshot includes core reorder suggestions and observed delivery performance', () => {
  const h = createHarness();
  h.game.products = [{ id: 'water', name: 'Bottled Water', kind: 'goods', baseDemand: 20, stock: 8, stockValue: 400, price: 30, unitCost: 20 }];
  h.game.purchaseOrders = [
    { id: 'po-1', status: 'received', productId: 'water', quantity: 10, placedWeek: 1, receivedWeek: 2, payableAmount: 100, supplierId: 'standard' },
    { id: 'po-2', status: 'received', productId: 'water', quantity: 10, placedWeek: 2, receivedWeek: 5, payableAmount: 100, supplierId: 'standard' },
    { id: 'po-3', status: 'open', productId: 'water', quantity: 4, placedWeek: 5, etaWeek: 7, payableAmount: 100, supplierId: 'rapid' }
  ];
  const snap = h.api.computeSupplySnapshot(h.game);
  assert.equal(snap.rows[0].recommendations[0].suggestedQuantity, 12);
  assert.equal(snap.supplierPerformance[0].receivedCount, 2);
  assert.equal(snap.supplierPerformance[0].onTimeCount, 1);
  assert.equal(snap.supplierPerformance[0].observedOnTimeRate, 0.5);
  assert.equal(snap.supplierPerformance[0].modeledDelayWeeksPerReceivedOrder, 0.5);
  assert.equal(snap.openOrderCount, 1);
  assert.match(h.context.renderOperations(), /Supplier reorder suggestions/);
  assert.match(h.context.renderOperations(), /data-action=\"prefill-reorder\"/);
  const financeMarkup = h.context.renderFinance();
  assert.match(financeMarkup, /rw9-growth-cash-preview/);
  assert.match(financeMarkup, /Delivery performance recorded in this company/);
});

test('growth cash preview updates without changing actual cash or the reserve planner', () => {
  const h = createHarness();
  const originalCash = h.game.cash;
  h.api.handleGrowthPreviewInput({ target: { id: 'rw9-growth-amount', value: '25000' } });
  assert.equal(h.dynamicNodes.get('#rw9-growth-cash-preview').textContent, 'PHP 75000.00');
  assert.equal(h.dynamicNodes.get('#rw9-growth-reserve-preview').textContent, 'PHP 50000.00');
  assert.equal(h.game.cash, originalCash);
  assert.equal(h.calls.journal.length, 0);
});

test('temporary economic factors are not persisted as permanent base demand or service cost', () => {
  const h = createHarness();
  const originalDemand = h.game.products[0].baseDemand;
  const originalCost = h.game.products[0].unitCost;
  h.api.beginEconomicEvent('demand-downturn', h.game);
  const result = h.context.runWeek();
  assert.equal(result, 'core-week-closed');
  assert.ok(h.calls.saveSnapshots.length > 0);
  assert.equal(h.game.demandSeenDuringWeek[0], originalDemand * 0.8);
  assert.equal(h.calls.saveSnapshots[0][0].baseDemand, originalDemand);
  assert.equal(h.game.products[0].baseDemand, originalDemand);
  assert.equal(h.game.products[0].unitCost, originalCost);
  assert.equal(h.game.realworldLayer9.eventHistory[0].status, 'active');
  assert.equal(h.game.realworldLayer9.activeEvents[0].remainingWeeks, 2);
  h.api.ageEconomicEvent(h.game); h.api.ageEconomicEvent(h.game);
  assert.equal(h.game.realworldLayer9.eventHistory[0].status, 'ended');
});

test('specialist queue only accepts bounded jobs for the Logistics & Delivery template', () => {
  const h = createHarness();
  const job = h.api.queueJob({ units: 8, feePerUnit: 180, variableCostPerUnit: 72, dueOffset: 0 });
  assert.equal(job.id, 'JOB-00001');
  assert.equal(job.dueWeek, 1);
  assert.equal(h.game.realworldLayer9.jobs.length, 1);
  assert.equal(h.calls.saves, 1);
  assert.throws(() => h.api.queueJob({ units: 201, feePerUnit: 180, variableCostPerUnit: 72, dueOffset: 0 }), /1–200 jobs/);
  const other = { ...h.game, businessTemplateId: 'retail', businessModel: 'goods', realworldLayer9: undefined };
  assert.throws(() => h.api.queueJob({ units: 1, feePerUnit: 10, variableCostPerUnit: 2, dueOffset: 0 }, other), /only available to the Logistics/);
});

test('due logistics jobs use reserved capacity and flow through journal helpers and weekly reporting', () => {
  const h = createHarness();
  h.api.queueJob({ units: 8, feePerUnit: 180, variableCostPerUnit: 72, dueOffset: 0 });
  const result = h.context.runWeek();
  assert.equal(result, 'core-week-closed');
  assert.equal(h.calls.coreWeeks, 1);
  assert.equal(h.game.capacitySeenDuringWeek, 7); // one-unit reserved throughput is removed from normal market capacity.
  assert.equal(h.game.lastWeek.revenue, 740); // 200 core sales + 540 from three reserved specialist delivery units.
  assert.equal(h.game.lastWeek.cogs, 256); // 40 core direct costs + 216 specialist variable cost.
  assert.equal(h.game.lastWeek.units, 5);
  assert.ok(h.calls.journal.some((x) => x.type === 'receipt' && x.account === 'Sales revenue'));
  assert.ok(h.calls.journal.some((x) => x.type === 'payment' && x.account === 'Service delivery cost'));
  assert.ok(h.game.realworldLayer9.jobs[0].remainingUnits < 8);
  assert.equal(h.game.week, 2);
});

test('persistent supplier disruption changes eligible ETA once and records an ending event', () => {
  const h = createHarness();
  h.game.purchaseOrders = [
    { id: 'po-1', status: 'open', etaWeek: 2, delayCount: 0 },
    { id: 'po-2', status: 'open', etaWeek: 3, delayCount: 2 },
    { id: 'po-3', status: 'received', etaWeek: 2, delayCount: 0 }
  ];
  const event = h.api.beginEconomicEvent('supplier-disruption', h.game);
  assert.equal(event.affectedOrders, 1);
  assert.equal(h.game.purchaseOrders[0].etaWeek, 3);
  assert.equal(h.game.purchaseOrders[0].delayCount, 1);
  assert.equal(h.game.purchaseOrders[1].etaWeek, 3);
  h.api.ageEconomicEvent(h.game);
  assert.equal(h.game.realworldLayer9.activeEvents.length, 0);
  assert.equal(h.game.realworldLayer9.eventHistory.at(-1).status, 'ended');
  assert.throws(() => h.api.beginEconomicEvent('not-real', h.game), /Unknown economic event/);
});

test('demand events persist across closes, modify the displayed estimator, and then expire', () => {
  const h = createHarness();
  const before = h.api.estimateDemand(h.game.products[0], h.game).expected;
  h.api.beginEconomicEvent('demand-downturn', h.game);
  const after = h.api.estimateDemand(h.game.products[0], h.game).expected;
  assert.ok(Math.abs(after / before - 0.8) < 0.000001);
  assert.equal(h.game.realworldLayer9.activeEvents[0].remainingWeeks, 3);
  h.api.ageEconomicEvent(h.game); h.api.ageEconomicEvent(h.game); h.api.ageEconomicEvent(h.game);
  assert.equal(h.game.realworldLayer9.activeEvents.length, 0);
  assert.equal(h.game.realworldLayer9.eventHistory.at(-1).status, 'ended');
});

test('service-cost and capacity events alter only their intended runtime factors', () => {
  const costHarness = createHarness();
  const originalCost = costHarness.game.products[0].unitCost;
  costHarness.api.beginEconomicEvent('service-cost-pressure', costHarness.game);
  costHarness.context.runWeek();
  assert.ok(Math.abs(costHarness.game.unitCostSeenDuringWeek[0] - originalCost * 1.12) < 1e-9);
  assert.equal(costHarness.game.products[0].unitCost, originalCost);
  assert.equal(costHarness.calls.saveSnapshots[0][0].unitCost, originalCost);

  const capacityHarness = createHarness();
  capacityHarness.api.beginEconomicEvent('capacity-shortage', capacityHarness.game);
  capacityHarness.context.runWeek();
  assert.equal(capacityHarness.game.capacitySeenDuringWeek, 8);
  assert.equal(capacityHarness.game.baseCapacity, 10); // The event changes simulated effective capacity only.
  assert.equal(capacityHarness.game.realworldLayer9.activeEvents[0].remainingWeeks, 1);
});

test('growth is a real fixed-asset transaction, adds capacity and upkeep, and enforces cooldown', () => {
  const h = createHarness();
  const beforeCash = h.game.cash;
  const growth = h.api.investGrowth(10000, h.game);
  assert.equal(growth.units, 1);
  assert.equal(growth.addedBaseCapacity, 5);
  assert.equal(growth.utilityIncrease, 80);
  assert.equal(h.game.cash, beforeCash - 10000);
  assert.equal(h.game.monthlyUtilities, 2080);
  assert.equal(h.game.assets[0].name, 'Growth capacity unit 1');
  assert.throws(() => h.api.investGrowth(10000, h.game), /Wait 4 more week/);
  h.game.week = 5;
  assert.equal(h.api.investGrowth(10000, h.game).units, 2);
});

test('Philippines source reviews are bounded status notes and do not award compliance', () => {
  const h = createHarness();
  const score = h.game.complianceScore;
  assert.equal(h.api.applyReview('business-name', h.game), true);
  assert.equal(h.game.realworldLayer9.countryReviews.length, 1);
  assert.equal(h.game.complianceScore, score);
  assert.equal(h.api.applyReview('business-name', h.game), false);
  const other = { ...h.game, countryCode: 'US', realworldLayer9: undefined };
  assert.equal(h.api.applyReview('business-name', other), false); // the review registry is intentionally limited to the Philippines.
});

test('voluntary closure persists, preserves records, and blocks the next operating week', () => {
  const h = createHarness();
  const startingWeek = h.game.week;
  assert.equal(h.api.closeBusiness(h.game), true);
  assert.equal(h.api.isClosed(h.game), true);
  assert.equal(h.game.week, startingWeek);
  assert.equal(h.game.companyStatus, 'active'); // preserve the core save schema; extension state blocks trading.
  const result = h.context.runWeek();
  assert.equal(result, undefined);
  assert.equal(h.calls.coreWeeks, 0);
  assert.equal(h.game.week, startingWeek);
  assert.equal(h.game.realworldLayer9.closed.atWeek, 0);
  assert.equal(h.api.closeBusiness(h.game), false);
});

test('bounded extension state trims event history and keeps invalid jobs out of the queue', () => {
  const h = createHarness();
  const s = h.api.ensureState(h.game);
  s.eventHistory = Array.from({ length: 55 }, (_, i) => ({ id: 'demand-surge', title: `Event ${i}`, status: 'ended' }));
  h.api.ensureState(h.game);
  assert.equal(h.game.realworldLayer9.eventHistory.length, 40);
  s.jobs.push({ id: 'broken', remainingUnits: 'not-a-number' });
  h.api.ensureState(h.game);
  assert.equal(h.game.realworldLayer9.jobs.some((j) => j.id === 'broken'), false);
  assert.equal(h.game.saveFormatVersion, 8);
});
