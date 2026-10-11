const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1, 'Expected exactly one inline application script');

class MockElement {
  constructor(selector = '') {
    this.selector = selector;
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
    this.files = [];
    this.dataset = {};
    this.children = [];
    this.className = '';
    this.style = {};
    this.classList = {
      add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false
    };
    this.firstElementChild = this;
  }
  addEventListener() {}
  removeEventListener() {}
  appendChild(node) { this.children.push(node); return node; }
  remove() {}
  click() {}
  focus() {}
  select() {}
  reportValidity() { return true; }
  closest() { return null; }
  querySelector() { return new MockElement('nested'); }
  querySelectorAll() { return []; }
  setAttribute() {}
  getAttribute() { return null; }
}

function bootGame() {
  const nodes = new Map();
  const getNode = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, new MockElement(selector));
    return nodes.get(selector);
  };
  const storage = new Map();
  const warnings = [];
  const document = {
    querySelector: getNode,
    querySelectorAll: () => [],
    createElement: (tag) => new MockElement(tag),
    addEventListener() {},
    removeEventListener() {},
    body: getNode('body')
  };
  const localStorage = {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  };
  const window = { addEventListener() {}, scrollTo() {} };
  class MutationObserver { observe() {} disconnect() {} }
  let seed = 123456789;
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const context = vm.createContext({
    console: { log() {}, info() {}, warn: (...args) => warnings.push(args), error: (...args) => warnings.push(args) },
    document, window, localStorage, MutationObserver,
    setTimeout: () => 0, clearTimeout() {}, URL,
    Blob, Date, Math: deterministicMath, JSON, Number, String, Object, Array, Map, Set, RegExp,
    parseInt, parseFloat, isFinite, NaN, Infinity
  });
  const script = `${scripts[0][1]}\n;globalThis.__test = { getGame:()=>game, setGame:v=>{game=v}, getIndustry:()=>getIndustry(), getWarnings:()=>__warnings, balanceSheet:()=>balanceSheet(), cashFlowSummary:()=>cashFlowSummary(), createGame, runWeek, purchaseFixedAsset, validateSaveCandidate, renderCashFlowStatement, clone, cashFlowNet, emptyCashFlow, loanRequest };`;
  // Put warnings in the context for inspection without modifying the shipped app.
  context.__warnings = warnings;
  vm.runInContext(script, context, { filename: 'REALWORLD-inline.js', timeout: 10000 });
  return { context, getGame: () => vm.runInContext('game', context), run: (src) => vm.runInContext(src, context, { timeout: 10000 }), nodes, warnings };
}

function makeCompany(env, industry = 'retail', capital = 1500000) {
  env.context.createGame({ company: `QA ${industry}`, founder: 'QA Tester', location: 'Test City', industry, capital });
  const game = env.getGame();
  assert.ok(game, `Company should be created for ${industry}`);
  return game;
}

function assertJournalBalanced(game) {
  for (const entry of game.journal) {
    const dr = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const cr = entry.lines.reduce((sum, line) => sum + line.credit, 0);
    assert.ok(Math.abs(dr - cr) <= 0.11, `${entry.memo} should balance; debit=${dr}, credit=${cr}`);
  }
}

test('source contains period-level cash-flow and fixed-asset UI', () => {
  assert.match(html, /Cash flow by period/);
  assert.match(html, /data-action="toggle-cashflow-history"/);
  assert.match(html, /data-form="fixed-asset-purchase"/);
  assert.match(html, /data-action="toggle-cashflow-history/);
});

test('fixed asset purchase is capitalized and classified as investing cash outflow', () => {
  const env = bootGame();
  const game = makeCompany(env, 'retail');
  const openingCash = game.cash;
  const openingEquipment = game.equipment;
  const result = env.context.purchaseFixedAsset(25000);
  const after = env.getGame();
  assert.equal(after.cash, openingCash - 25000);
  assert.equal(after.equipment, openingEquipment + 25000);
  assert.equal(after.cashFlowCurrent.investingOut, 25000);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 1);
  assert.ok(after.journal.some((entry) => entry.memo.includes('Purchase fixed asset')));
  const cf = env.run('cashFlowSummary()');
  assert.ok(Math.abs(cf.variance) < 1, `Cash flow should reconcile; variance=${cf.variance}`);
});

test('fixed asset purchase rejects spending beyond available cash without mutation', () => {
  const env = bootGame();
  const game = makeCompany(env, 'cafe');
  const before = JSON.stringify({ cash: game.cash, equipment: game.equipment, journal: game.journal.length, cf: game.cashFlowCurrent });
  env.context.purchaseFixedAsset(game.cash + 10000);
  const after = env.getGame();
  assert.equal(JSON.stringify({ cash: after.cash, equipment: after.equipment, journal: after.journal.length, cf: after.cashFlowCurrent }), before);
});

test('period close stores opening cash, actual closing cash, and cash-flow variance', () => {
  const env = bootGame();
  const game = makeCompany(env, 'agency');
  const openingCash = game.cash;
  env.context.purchaseFixedAsset(20000);
  env.context.runWeek();
  const after = env.getGame();
  assert.equal(after.cashFlowHistory.length, 1);
  const row = after.cashFlowHistory[0];
  assert.equal(row.openingCash, openingCash);
  assert.equal(row.closingCash, after.cashFlowPeriodOpeningCash);
  assert.ok(Math.abs(row.variance) < 1, `Period variance=${row.variance}`);
  assert.ok(Math.abs((row.closingCash - row.openingCash) - row.netChange) < 1);
  assert.equal(after.cashFlowCurrent.operatingIn + after.cashFlowCurrent.operatingOut + after.cashFlowCurrent.investingIn + after.cashFlowCurrent.investingOut + after.cashFlowCurrent.financingIn + after.cashFlowCurrent.financingOut, 0);
});

test('30-week multi-industry simulation keeps journal and balance sheet reconciled', () => {
  for (const industry of ['retail', 'cafe', 'agency']) {
    const env = bootGame();
    const game = makeCompany(env, industry, 1500000);
    for (let i = 0; i < 30; i++) env.context.runWeek();
    const after = env.getGame();
    const bs = env.run('balanceSheet()');
    assert.ok(Math.abs(bs.delta) < 1, `${industry} balance sheet variance ${bs.delta}`);
    assert.equal(after.cashFlowHistory.length, 30);
    for (const row of after.cashFlowHistory) {
      assert.ok(Math.abs(row.variance) < 1, `${industry} W${row.week} cash flow variance ${row.variance}`);
      assert.ok(Math.abs((row.closingCash-row.openingCash)-row.netChange) < 1);
    }
    assertJournalBalanced(after);
  }
});

test('older Phase 3 save migrates period opening cash without inventing history', () => {
  const env = bootGame();
  const game = makeCompany(env, 'retail');
  env.context.runWeek();
  const legacy = JSON.parse(JSON.stringify(env.getGame()));
  delete legacy.cashFlowPeriodOpeningCash;
  for (const row of legacy.cashFlowHistory) {
    delete row.openingCash; delete row.closingCash; delete row.netChange; delete row.variance;
  }
  const migrated = env.context.validateSaveCandidate(legacy);
  assert.equal(migrated.cashFlowPeriodOpeningCash, migrated.cashFlowOpeningCash + migrated.cashFlowHistory.reduce((a,row)=>a+env.context.cashFlowNet(row),0));
  assert.equal(migrated.cashFlowHistory.length, 1, 'Existing history is preserved, not fabricated');
});

test('save validation rejects a cash-flow period with a material reconciliation variance', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  env.context.runWeek();
  const candidate = JSON.parse(JSON.stringify(env.getGame()));
  candidate.cashFlowHistory[0].variance = 99999;
  assert.throws(() => env.context.validateSaveCandidate(candidate), /does not reconcile|Invalid cash-flow|variance/i);
});


test('cash-flow report renders in-progress period and expandable historical rows', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  env.context.runWeek();
  const rendered = env.context.renderCashFlowStatement();
  assert.match(rendered, /Cash flow by period/);
  assert.match(rendered, /In progress/);
  assert.match(rendered, /Opening cash/);
  assert.match(rendered, /Closing cash/);
  assert.match(rendered, /Show all 1 periods/);
  const finance = env.context.renderFinance();
  assert.match(finance, /Fixed-asset register/);
  assert.match(finance, /Purchase a fixed asset/);
  assert.match(finance, /Sell or dispose of an asset/);
});

test('12, 24, and 36 month loans amortize to zero without balance-sheet drift', () => {
  for (const term of [12, 24, 36]) {
    const env = bootGame();
    makeCompany(env, 'agency', 2000000);
    env.context.document.querySelector('#loan-amount').value = '100000';
    env.context.document.querySelector('#loan-term-months').value = String(term);
    env.context.loanRequest();
    assert.equal(env.getGame().loanBalance, 100000);
    const maxWeeks = term * 52 / 12;
    for (let i = 0; i < maxWeeks; i++) env.context.runWeek();
    const game = env.getGame();
    assert.equal(game.loanBalance, 0, `${term}-month loan should be fully repaid`);
    assert.equal(game.loanWeeksRemaining, 0);
    assert.equal(game.loanWeeklyPayment, 0);
    assert.ok(Math.abs(env.run('balanceSheet().delta')) < 1, `${term}-month balance-sheet variance`);
    assert.ok(Math.abs(env.context.validateSaveCandidate(JSON.parse(JSON.stringify(game))).cashFlowPeriodOpeningCash - game.cashFlowPeriodOpeningCash) < 1);
    assertJournalBalanced(game);
  }
});


test('individual fixed-asset purchases preserve name, category, cost, and investing classification', () => {
  const env = bootGame();
  const game = makeCompany(env, 'retail');
  const openingCash = game.cash;
  const openingCost = game.equipment;
  const ok = env.context.purchaseFixedAsset(25000, { name: 'Delivery van', category: 'vehicle' });
  const after = env.getGame();
  assert.equal(ok, true);
  assert.equal(after.assets.length, 2);
  const asset = after.assets.find(a => a.name === 'Delivery van');
  assert.ok(asset);
  assert.equal(asset.category, 'vehicle');
  assert.equal(asset.cost, 25000);
  assert.equal(asset.status, 'active');
  assert.equal(after.cash, openingCash - 25000);
  assert.equal(after.equipment, openingCost + 25000);
  assert.equal(after.cashFlowCurrent.investingOut, 25000);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 1);
  assert.ok(Math.abs(env.context.cashFlowSummary().variance) < 1);
});

test('disposing at net book value removes asset cost and depreciation with investing inflow and no gain/loss', () => {
  const env = bootGame();
  const game = makeCompany(env, 'retail');
  const openingCash = game.cash;
  const openingAssetCost = game.equipment;
  const result = env.context.disposeFixedAsset('asset-0001', openingAssetCost);
  const after = env.getGame();
  assert.equal(result, true);
  assert.equal(after.assets[0].status, 'disposed');
  assert.equal(after.assets[0].saleProceeds, openingAssetCost);
  assert.equal(after.assets[0].disposalBookValue, openingAssetCost);
  assert.equal(after.equipment, 0);
  assert.equal(after.accumDep, 0);
  assert.equal(after.cash, openingCash + openingAssetCost);
  assert.equal(after.cashFlowCurrent.investingIn, openingAssetCost);
  assert.equal(after.totals.assetDisposalGain, 0);
  assert.equal(after.totals.assetDisposalLoss, 0);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 1);
  assert.ok(Math.abs(env.context.cashFlowSummary().variance) < 1);
  assertJournalBalanced(after);
  assert.doesNotThrow(() => env.context.validateSaveCandidate(JSON.parse(JSON.stringify(after))));
});

test('sale above book value records a gain and an illustrative tax reserve without double-counting at week close', () => {
  const env = bootGame();
  const game = makeCompany(env, 'agency');
  const originalCash = game.cash;
  const ok = env.context.purchaseFixedAsset(20000, { name: 'Test generator', category: 'machinery' });
  assert.equal(ok, true);
  const asset = env.getGame().assets.find(a => a.name === 'Test generator');
  const taxBefore = env.getGame().taxPayable;
  assert.equal(env.context.disposeFixedAsset(asset.id, 25000), true);
  let after = env.getGame();
  assert.equal(after.assets.find(a => a.id === asset.id).status, 'disposed');
  assert.equal(after.assets.find(a => a.id === asset.id).disposalGain, 5000);
  assert.equal(after.totals.assetDisposalGain, 5000);
  assert.equal(after.totals.assetDisposalLoss, 0);
  assert.equal(after.taxPayable, taxBefore + 1000);
  assert.equal(after.retainedEarnings, 4000);
  assert.equal(after.totals.net, 4000);
  assert.equal(after.cash, originalCash + 5000);
  assert.equal(after.cashFlowCurrent.investingOut, 20000);
  assert.equal(after.cashFlowCurrent.investingIn, 25000);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 1);
  assert.ok(Math.abs(env.context.cashFlowSummary().variance) < 1);
  assertJournalBalanced(after);
  env.context.runWeek();
  after = env.getGame();
  assert.equal(after.lastWeek.assetDisposalGain, 5000);
  assert.equal(after.lastWeek.assetDisposalLoss, 0);
  assert.equal(after.totals.assetDisposalGain, 5000, 'gain must not be counted a second time at week close');
  assert.equal(after.pendingAssetDisposalGain, 0);
  assert.equal(after.pendingAssetDisposalTax, 0);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 1);
  assert.ok(Math.abs(env.context.cashFlowSummary().variance) < 1);
});

test('zero-proceeds disposal records a loss and does not invent a cash inflow', () => {
  const env = bootGame();
  const game = makeCompany(env, 'cafe');
  const startCash = game.cash;
  assert.equal(env.context.purchaseFixedAsset(10000, { name: 'Old laptop', category: 'equipment' }), true);
  const asset = env.getGame().assets.find(a => a.name === 'Old laptop');
  const cashBeforeDisposal = env.getGame().cash;
  assert.equal(env.context.disposeFixedAsset(asset.id, 0), true);
  const after = env.getGame();
  assert.equal(after.cash, cashBeforeDisposal);
  assert.equal(after.assets.find(a => a.id === asset.id).disposalLoss, 10000);
  assert.equal(after.totals.assetDisposalLoss, 10000);
  assert.equal(after.totals.assetDisposalGain, 0);
  assert.equal(after.cashFlowCurrent.investingIn, 0);
  assert.equal(after.cashFlowCurrent.investingOut, 10000);
  assert.equal(after.equipment, game.equipment);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 1);
  assert.ok(Math.abs(env.context.cashFlowSummary().variance) < 1);
  assertJournalBalanced(after);
  assert.equal(startCash - after.cash, 10000);
});

test('old Phase 4 saves migrate to one explicit legacy asset and keep balances intact', () => {
  const env = bootGame();
  const game = makeCompany(env, 'retail');
  env.context.purchaseFixedAsset(15000, { name: 'Untracked old purchase', category: 'equipment' });
  env.context.runWeek();
  const legacy = JSON.parse(JSON.stringify(env.getGame()));
  delete legacy.assets;
  delete legacy.assetSequence;
  delete legacy.pendingAssetDisposalGain;
  delete legacy.pendingAssetDisposalLoss;
  delete legacy.pendingAssetDisposalTax;
  delete legacy.totals.assetDisposalGain;
  delete legacy.totals.assetDisposalLoss;
  for (const row of legacy.history) { delete row.assetDisposalGain; delete row.assetDisposalLoss; }
  if (legacy.lastWeek) { delete legacy.lastWeek.assetDisposalGain; delete legacy.lastWeek.assetDisposalLoss; }
  const migrated = env.context.validateSaveCandidate(legacy);
  assert.equal(migrated.assets.length, 1, 'legacy aggregate must not be split into invented items');
  assert.equal(migrated.assets[0].isLegacyPool, true);
  assert.equal(migrated.assets[0].purchaseDate, null, 'unknown historical purchase date remains unknown');
  assert.equal(migrated.assets[0].cost, migrated.equipment);
  assert.equal(migrated.assets[0].accumDep, migrated.accumDep);
  assert.equal(migrated.totals.assetDisposalGain, 0);
  assert.equal(migrated.totals.assetDisposalLoss, 0);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 1);
});

test('save validation rejects a fixed-asset register that does not reconcile to ledger totals', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  const tampered = JSON.parse(JSON.stringify(env.getGame()));
  tampered.assets[0].cost += 12345;
  assert.throws(() => env.context.validateSaveCandidate(tampered), /register does not match|Balance sheet does not reconcile/i);
});

test('invalid or repeated asset disposal is rejected without changing financial state', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  const before = JSON.stringify(env.getGame());
  assert.equal(env.context.disposeFixedAsset('asset-0001', -1), false);
  assert.equal(JSON.stringify(env.getGame()), before);
  assert.equal(env.context.disposeFixedAsset('asset-0001', 42000), true);
  const afterFirst = JSON.stringify(env.getGame());
  assert.equal(env.context.disposeFixedAsset('asset-0001', 42000), false);
  assert.equal(JSON.stringify(env.getGame()), afterFirst);
});


test('asset disposal after depreciation removes both gross cost and accumulated depreciation', () => {
  const env = bootGame();
  makeCompany(env, 'retail', 1500000);
  assert.equal(env.context.purchaseFixedAsset(30000, { name: 'Shop freezer', category: 'machinery' }), true);
  const asset = env.getGame().assets.find(a => a.name === 'Shop freezer');
  for (let i = 0; i < 12; i++) env.context.runWeek();
  const before = env.getGame();
  const depreciated = before.assets.find(a => a.id === asset.id);
  assert.ok(depreciated.accumDep > 0);
  const bookValue = Math.round((depreciated.cost - depreciated.accumDep) * 100) / 100;
  const oldCost = before.equipment;
  const oldAccumDep = before.accumDep;
  const cashBefore = before.cash;
  assert.equal(env.context.disposeFixedAsset(asset.id, bookValue), true);
  const after = env.getGame();
  assert.equal(after.assets.find(a => a.id === asset.id).status, 'disposed');
  assert.equal(after.assets.find(a => a.id === asset.id).disposalBookValue, bookValue);
  assert.equal(after.equipment, Math.round((oldCost - depreciated.cost) * 100) / 100);
  assert.equal(after.accumDep, Math.round((oldAccumDep - depreciated.accumDep) * 100) / 100);
  assert.equal(after.cash, cashBefore + bookValue);
  assert.equal(after.cashFlowCurrent.investingIn, bookValue);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 1);
  assert.ok(Math.abs(env.context.cashFlowSummary().variance) < 1);
  assert.doesNotThrow(() => env.context.validateSaveCandidate(JSON.parse(JSON.stringify(after))));
  assertJournalBalanced(after);
});

test('multi-asset depreciation and the 104-week cash-flow cap remain reconciled over 110 weeks', () => {
  const env = bootGame();
  makeCompany(env, 'agency', 1500000);
  assert.equal(env.context.purchaseFixedAsset(25000, { name: 'Workstation set', category: 'equipment' }), true);
  assert.equal(env.context.purchaseFixedAsset(60000, { name: 'Service vehicle', category: 'vehicle' }), true);
  for (let i = 0; i < 110; i++) env.context.runWeek();
  const after = env.getGame();
  assert.equal(after.cashFlowHistory.length, 104);
  assert.equal(after.assets.filter(a => a.status === 'active').length, 3);
  assert.ok(after.assets.filter(a => a.status === 'active').every(a => a.accumDep >= 0 && a.accumDep <= a.cost));
  const activeCost = Math.round(after.assets.filter(a => a.status === 'active').reduce((n,a) => n+a.cost,0)*100)/100;
  const activeDep = Math.round(after.assets.filter(a => a.status === 'active').reduce((n,a) => n+a.accumDep,0)*100)/100;
  assert.equal(after.equipment, activeCost);
  assert.equal(after.accumDep, activeDep);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 1);
  assert.ok(Math.abs(env.context.cashFlowSummary().variance) < 1);
  assert.doesNotThrow(() => env.context.validateSaveCandidate(JSON.parse(JSON.stringify(after))));
});
