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
  const script = `${scripts[0][1]}\n;globalThis.__test = { getGame:()=>game, setGame:v=>{game=v}, getIndustry:()=>getIndustry(), getWarnings:()=>__warnings, balanceSheet:()=>balanceSheet(), cashFlowSummary:()=>cashFlowSummary(), createGame, runWeek, purchaseFixedAsset, validateSaveCandidate, renderCashFlowStatement, renderLoanPortfolio, clone, cashFlowNet, emptyCashFlow, loanRequest };`;
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
    assert.equal(game.loanStatus, 'paid_off');
    assert.equal(game.loanMissedPayments, 0, `${term}-month loan should not miss installments in the well-funded scenario`);
    assert.equal(game.loanArrears, 0);
    assert.equal(game.loanLateFeesPayable, 0);
    assert.ok(Math.abs(env.run('balanceSheet().delta')) < 1, `${term}-month balance-sheet variance`);
    assert.ok(Math.abs(env.context.validateSaveCandidate(JSON.parse(JSON.stringify(game))).cashFlowPeriodOpeningCash - game.cashFlowPeriodOpeningCash) < 1);
    assertJournalBalanced(game);
    for (const row of game.cashFlowHistory) assert.ok(Math.abs(row.variance) < 1, `${term}-month loan W${row.week} cash-flow variance ${row.variance}`);
  }
});


test('Phase 5.4.2 allows multiple concurrent loans with independent schedules and aggregate liabilities', () => {
  const env = bootGame();
  makeCompany(env, 'agency', 2000000);
  env.context.document.querySelector('#loan-amount').value = '100000';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.context.loanRequest();
  const first = {...env.getGame().loans[0]};
  env.context.document.querySelector('#loan-amount').value = '50000';
  env.context.document.querySelector('#loan-term-months').value = '24';
  env.context.loanRequest();
  const game = env.getGame();
  assert.equal(game.loans.length, 2);
  assert.notEqual(game.loans[0].id, game.loans[1].id);
  assert.equal(game.loans[0].loanBalance, 100000);
  assert.equal(game.loans[1].loanBalance, 50000);
  assert.equal(game.loans[0].loanTermMonths, 12);
  assert.equal(game.loans[1].loanTermMonths, 24);
  assert.equal(game.loanBalance, 150000, 'compatibility field is portfolio principal total');
  assert.equal(game.loanOriginalAmount, 150000, 'original facilities aggregate correctly');
  assert.equal(game.loanWeeklyPayment, env.run('sumMoney(game.loans.map(l => l.loanWeeklyPayment))'));
  assert.match(env.context.renderFinance(), /Concurrent loan portfolio/);
  assert.match(env.context.renderFinance(), /Term Loan 1/);
  assert.match(env.context.renderFinance(), /Term Loan 2/);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 0.11);
  assertJournalBalanced(game);
  const restored = env.context.validateSaveCandidate(JSON.parse(JSON.stringify(env.context.encodeSavePayload(game))));
  assert.equal(restored.loans.length, 2);
  assert.equal(restored.loanBalance, 150000);
});

test('Phase 5.4.2 principal payment changes only the selected loan', () => {
  const env = bootGame();
  makeCompany(env, 'agency', 2000000);
  env.context.document.querySelector('#loan-amount').value = '100000';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.context.loanRequest();
  env.context.document.querySelector('#loan-amount').value = '50000';
  env.context.document.querySelector('#loan-term-months').value = '24';
  env.context.loanRequest();
  const [a,b] = env.getGame().loans;
  const bBalance = b.loanBalance;
  const beforeCash = env.getGame().cash;
  env.context.repayLoan(1000, a.id);
  const after = env.getGame();
  assert.equal(after.loans[0].loanBalance, 99000);
  assert.equal(after.loans[1].loanBalance, bBalance);
  assert.equal(after.loanBalance, 99000+bBalance);
  assert.equal(after.cash, beforeCash-1000);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 0.11);
  assertJournalBalanced(after);
});

test('Phase 5.4.2 defaulted loan does not change another loan status or schedule', () => {
  const env = bootGame();
  makeCompany(env, 'agency', 2000000);
  env.context.document.querySelector('#loan-amount').value = '100000';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.context.loanRequest();
  env.context.document.querySelector('#loan-amount').value = '50000';
  env.context.document.querySelector('#loan-term-months').value = '24';
  env.context.loanRequest();
  const [defaulted, current] = env.getGame().loans;
  const defaultPrincipal = defaulted.loanBalance;
  const currentPrincipal = current.loanBalance;
  env.context.markLoanDefault('QA isolation scenario', defaulted.id);
  assert.equal(env.getGame().loans[0].loanStatus, 'defaulted');
  assert.equal(env.getGame().loans[1].loanStatus, 'current');
  env.context.processLoanInstallment({other:0}, 0, defaulted.id);
  assert.equal(env.getGame().loans[0].loanBalance, defaultPrincipal, 'defaulted loan stops scheduled repayment');
  env.context.processLoanInstallment({other:0}, 0, current.id);
  const after = env.getGame();
  assert.equal(after.loans[0].loanBalance, defaultPrincipal);
  assert.ok(after.loans[1].loanBalance < currentPrincipal, 'healthy loan continues its own schedule');
  assert.equal(after.loans[1].loanStatus, 'current');
  assert.equal(after.loanStatus, 'defaulted', 'portfolio summary reflects the one default without corrupting the other record');
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 0.11);
  assertJournalBalanced(after);
});

test('Phase 5.4.2 legacy single-loan save migrates to one loan record', () => {
  const env = bootGame();
  makeCompany(env, 'agency', 2000000);
  env.context.document.querySelector('#loan-amount').value = '100000';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.context.loanRequest();
  const legacy = JSON.parse(JSON.stringify(env.getGame()));
  delete legacy.loans;
  delete legacy.loanSequence;
  const migrated = env.context.validateSaveCandidate(legacy);
  assert.equal(migrated.loans.length, 1);
  assert.equal(migrated.loans[0].id, 'loan-0001');
  assert.equal(migrated.loans[0].loanBalance, legacy.loanBalance);
  assert.equal(migrated.loanBalance, legacy.loanBalance);
  assert.equal(migrated.loanStatus, 'current');
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 0.11);
});

test('Phase 5.4.2 overdue payment cures only the selected loan', () => {
  const env = bootGame();
  makeCompany(env, 'agency', 2000000);
  env.context.document.querySelector('#loan-amount').value = '100000';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.context.loanRequest();
  env.context.document.querySelector('#loan-amount').value = '50000';
  env.context.document.querySelector('#loan-term-months').value = '24';
  env.context.loanRequest();
  const g = env.getGame();
  const [target, other] = g.loans;
  const otherBalance = other.loanBalance;
  const openingCash = g.cash;
  env.run(`game.cash=0;game.retainedEarnings-=${openingCash};game.cashFlowOpeningCash=0;game.cashFlowPeriodOpeningCash=0;`);
  env.context.processLoanInstallment({other:0}, 0, target.id);
  env.run(`game.retainedEarnings=roundMoneyValue(game.retainedEarnings-game.loans[0].loanLateFeesPayable)`);
  assert.ok(env.getGame().loans[0].loanArrears > 0);
  assert.equal(env.getGame().loans[1].loanStatus, 'current');
  env.run('game.cash=50000;game.capital=roundMoneyValue(game.capital+50000)');
  const beforePay = env.getGame().loans[0];
  const payment = roundLoanTotalForTest(beforePay.loanArrears + beforePay.loanLateFeesPayable + beforePay.loanInterestPayable);
  env.context.payLoanArrears(payment, target.id);
  const after = env.getGame();
  assert.equal(after.loans[0].loanArrears, 0);
  assert.equal(after.loans[0].loanLateFeesPayable, 0);
  assert.equal(after.loans[0].loanStatus, 'current');
  assert.equal(after.loans[1].loanBalance, otherBalance, 'unselected loan principal must not change');
  assert.equal(after.loans[1].loanStatus, 'current');
  assert.equal(after.loanBalance, env.run('sumMoney(game.loans.map(l=>l.loanBalance))'));
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 0.11);
  assertJournalBalanced(after);
  function roundLoanTotalForTest(value) { return Math.round(value*100)/100; }
});

test('Phase 5.4.2 weekly close accrues, services, and persists concurrent loans independently', () => {
  const env = bootGame();
  makeCompany(env, 'agency', 2000000);
  env.context.document.querySelector('#loan-amount').value = '100000';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.context.loanRequest();
  env.context.document.querySelector('#loan-amount').value = '50000';
  env.context.document.querySelector('#loan-term-months').value = '24';
  env.context.loanRequest();
  const before = env.getGame().loans.map(l => ({balance:l.loanBalance,weeks:l.loanWeeksRemaining}));
  env.context.runWeek();
  const after = env.getGame();
  assert.equal(after.loans.length, 2);
  for(let i=0;i<2;i++){
    assert.ok(after.loans[i].loanBalance < before[i].balance, `loan ${i+1} principal should amortize independently`);
    assert.equal(after.loans[i].loanWeeksRemaining, before[i].weeks-1);
    assert.equal(after.loans[i].loanStatus, 'current');
  }
  assert.equal(after.loanBalance, env.run('sumMoney(game.loans.map(l=>l.loanBalance))'));
  assert.equal(after.loanInterestPayable, env.run('sumMoney(game.loans.map(l=>l.loanInterestPayable))'));
  assert.ok(Math.abs(after.cashFlowHistory[0].variance) < 0.11);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 0.11);
  const restored = env.context.validateSaveCandidate(JSON.parse(JSON.stringify(env.context.encodeSavePayload(after))));
  assert.equal(restored.loans.length, 2);
  assert.equal(restored.loanBalance, after.loanBalance);
  assertJournalBalanced(after);
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

test('missed term-loan installment creates arrears and fee without silently drawing an overdraft', () => {
  const env = bootGame();
  makeCompany(env, 'agency', 1500000);
  env.context.document.querySelector('#loan-amount').value = '100000';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.context.loanRequest();
  const before = env.getGame();
  const originalCash = before.cash;
  env.run(`game.cash = 0; game.retainedEarnings -= ${originalCash}; game.cashFlowOpeningCash = 0; game.cashFlowPeriodOpeningCash = 0;`);
  const originalOverdraft = env.getGame().overdraft;
  env.run('processLoanInstallment({other:0})');
  const after = env.getGame();
  // Apply the test helper's weekly P&L close for the assessed late fee.
  env.run('game.retainedEarnings = Math.round((game.retainedEarnings - game.loanLateFeesPayable) * 100) / 100');
  assert.ok(after.loanArrears > 0);
  assert.ok(after.loanLateFeesPayable > 0);
  assert.equal(after.overdraft, originalOverdraft);
  assert.equal(after.cash, 0);
  assert.equal(after.loanStatus, 'past_due');
  assert.equal(after.loanMissedPayments, 1);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 0.11);
  assertJournalBalanced(after);
});

test('four consecutive unpaid installments trigger default, a credit-score penalty, and a preserved principal liability', () => {
  const env = bootGame();
  makeCompany(env, 'agency', 1500000);
  env.context.document.querySelector('#loan-amount').value = '100000';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.context.loanRequest();
  const original = env.getGame();
  const originalCash = original.cash;
  const score = original.creditScore;
  env.run(`game.cash=0;game.retainedEarnings-=${originalCash};game.cashFlowOpeningCash=0;game.cashFlowPeriodOpeningCash=0;`);
  for (let i = 0; i < 4; i++) {
    env.run('processLoanInstallment({other:0})');
    if (i < 3) env.run('game.week++');
  }
  const after = env.getGame();
  env.run('game.retainedEarnings = Math.round((game.retainedEarnings - game.loanLateFeesPayable) * 100) / 100');
  assert.equal(after.loanStatus, 'defaulted');
  assert.equal(after.loanDelinquencyWeeks, 4);
  assert.equal(after.loanDefaultCount, 1);
  assert.ok(after.loanDefaultWeek > 0);
  assert.equal(after.creditScore, score - 18);
  assert.ok(after.loanBalance > 0, 'Default must not erase outstanding principal');
  assert.equal(after.loanWeeksRemaining, 48);
  const principalAtDefault = after.loanBalance;
  env.run('processLoanInstallment({other:0})');
  assert.equal(env.getGame().loanBalance, principalAtDefault, 'defaulted loan must stop automatic scheduled principal payments');
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 0.11);
  assertJournalBalanced(after);
});

test('late fees and term interest are recognized as liabilities without an unearned cash outflow', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  env.context.document.querySelector('#loan-amount').value = '50000';
  env.context.document.querySelector('#loan-term-months').value = '24';
  env.context.loanRequest();
  const g = env.getGame();
  const openingCash = g.cash;
  env.run(`game.loanInterestPayable = 250; game.loanLateFeesPayable = 125; game.retainedEarnings -= 375; game.cashFlowCurrent = {operatingIn:0, operatingOut:0, investingIn:0, investingOut:0, financingIn:0, financingOut:0};`);
  const cf = env.getGame().cashFlowCurrent;
  assert.equal(env.getGame().cash, openingCash);
  assert.equal(env.getGame().loanInterestPayable, 250);
  assert.equal(env.getGame().loanLateFeesPayable, 125);
  assert.equal(env.getGame().cashFlowCurrent.operatingOut, cf.operatingOut);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 0.11);
});

test('partial debt cure uses only available cash, reduces arrears and does not create overdraft', () => {
  const env = bootGame();
  makeCompany(env, 'agency', 1500000);
  env.context.document.querySelector('#loan-amount').value = '100000';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.context.loanRequest();
  const original = env.getGame();
  const originalCash = original.cash;
  env.run(`game.cash=0;game.retainedEarnings-=${originalCash};game.cashFlowOpeningCash=0;game.cashFlowPeriodOpeningCash=0;`);
  env.run('processLoanInstallment({other:0})');
  env.run('game.retainedEarnings = Math.round((game.retainedEarnings - game.loanLateFeesPayable) * 100) / 100');
  const missed = env.getGame();
  const missedPrincipal = missed.loanBalance;
  const arrearsBefore = missed.loanArrears;
  const feeBefore = missed.loanLateFeesPayable;
  env.run('game.cash=50000; game.capital+=50000');
  const amount = Math.min(50000, Math.round((arrearsBefore + feeBefore) * 100) / 100);
  env.context.payLoanArrears(amount);
  const after = env.getGame();
  assert.equal(after.loanArrears, 0);
  assert.equal(after.loanLateFeesPayable, 0);
  assert.equal(after.loanStatus, 'current');
  assert.equal(after.overdraft, 0);
  assert.equal(after.cash, 50000 - amount);
  assert.ok(after.loanBalance < missedPrincipal);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 0.11);
  assertJournalBalanced(after);
});

test('unpaid loan at maturity is marked defaulted and remains valid in an exported save', () => {
  const env = bootGame();
  makeCompany(env, 'agency', 1500000);
  env.context.document.querySelector('#loan-amount').value = '100000';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.context.loanRequest();
  const original = env.getGame();
  const cash = original.cash;
  env.run(`game.cash=0;game.retainedEarnings-=${cash};game.cashFlowOpeningCash=0;game.cashFlowPeriodOpeningCash=0;game.loanWeeksRemaining=1;`);
  env.run('processLoanInstallment({other:0})');
  const after = env.getGame();
  env.run('game.retainedEarnings = Math.round((game.retainedEarnings - game.loanLateFeesPayable) * 100) / 100');
  assert.equal(after.loanWeeksRemaining, 0);
  assert.equal(after.loanStatus, 'defaulted');
  assert.ok(after.loanBalance > 0);
  const validated = env.context.validateSaveCandidate(JSON.parse(JSON.stringify(after)));
  assert.equal(validated.loanStatus, 'defaulted');
  assert.equal(validated.loanBalance, after.loanBalance);
});

test('Phase 5.1 saves migrate to a current loan status without inventing arrears or default history', () => {
  const env = bootGame();
  const game = makeCompany(env, 'retail');
  env.context.document.querySelector('#loan-amount').value = '50000';
  env.context.document.querySelector('#loan-term-months').value = '24';
  env.context.loanRequest();
  const legacy = JSON.parse(JSON.stringify(env.getGame()));
  for (const key of ['loanStatus','loanInterestPayable','loanArrears','loanArrearsPrincipal','loanArrearsInterest','loanLateFeesPayable','loanMissedPayments','loanDelinquencyWeeks','loanDefaultWeek','loanDefaultCount']) delete legacy[key];
  const migrated = env.context.validateSaveCandidate(legacy);
  assert.equal(migrated.loanStatus, 'current');
  assert.equal(migrated.loanArrears, 0);
  assert.equal(migrated.loanLateFeesPayable, 0);
  assert.equal(migrated.loanMissedPayments, 0);
  assert.equal(migrated.loanDefaultCount, 0);
});


test('finance screen exposes loan status, arrears, and cash-only debt payment controls', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  env.context.document.querySelector('#loan-amount').value = '50000';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.context.loanRequest();
  const rendered = env.context.renderFinance();
  assert.match(rendered, /Loan repayment status/);
  assert.match(rendered, /Scheduled arrears/);
  assert.match(rendered, /does not create revenue or profit/);
  assert.match(rendered, /<span class="tag good">current<\/span>/);
  assert.doesNotMatch(rendered, /data-form="loan-arrears-payment"/, 'cash-cure form should not be shown while the loan is current');
});

test('invalid or unaffordable overdue-debt payment leaves all financial state unchanged', () => {
  const env = bootGame();
  makeCompany(env, 'agency');
  env.context.document.querySelector('#loan-amount').value = '50000';
  env.context.document.querySelector('#loan-term-months').value = '24';
  env.context.loanRequest();
  const before = env.getGame();
  const beforeState = JSON.stringify({cash:before.cash,loanBalance:before.loanBalance,arrears:before.loanArrears,fees:before.loanLateFeesPayable,interest:before.loanInterestPayable,overdraft:before.overdraft,journal:before.journal.length});
  env.context.payLoanArrears(-100);
  env.context.payLoanArrears(before.cash + 1);
  const after = env.getGame();
  assert.equal(JSON.stringify({cash:after.cash,loanBalance:after.loanBalance,arrears:after.loanArrears,fees:after.loanLateFeesPayable,interest:after.loanInterestPayable,overdraft:after.overdraft,journal:after.journal.length}), beforeState);
});

test('real weekly close records a missed installment without overdraft and preserves both ledgers', () => {
  const env = bootGame();
  makeCompany(env, 'agency', 1500000);
  env.context.document.querySelector('#loan-amount').value = '100000';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.context.loanRequest();
  const original = env.getGame();
  const originalCash = original.cash;
  const originalOverdraft = original.overdraft;
  env.run(`game.cash=0;game.retainedEarnings-=${originalCash};game.cashFlowOpeningCash=0;game.cashFlowPeriodOpeningCash=0;game.cashFlowCurrent=emptyCashFlow();game.products.forEach(p=>p.baseDemand=0);game.marketingBudget=0;`);
  env.context.runWeek();
  const after = env.getGame();
  assert.ok(after.loanArrears > 0);
  assert.ok(after.loanLateFeesPayable > 0);
  assert.equal(after.loanStatus, 'past_due');
  assert.equal(after.overdraft, originalOverdraft, 'scheduled loan shortfall must not create overdraft borrowing');
  assert.equal(after.cash, 0);
  assert.equal(after.cashFlowHistory.length, 1);
  assert.ok(Math.abs(after.cashFlowHistory[0].variance) < 0.11);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 0.11);
  assertJournalBalanced(after);
});

test('centavo conversion handles decimal edge cases symmetrically and sums integer centavos', () => {
  const env = bootGame();
  assert.deepEqual(Array.from(env.run('[moneyToCentavos(1.005), moneyToCentavos(-1.005), moneyToCentavos(2.675), moneyToCentavos(-2.675), moneyToCentavos(0.1 + 0.2)]')), [101, -101, 268, -268, 30]);
  assert.equal(env.run('roundMoneyValue(0.1 + 0.2)'), 0.3);
  assert.equal(env.run('sumMoney([0.1, 0.2])'), 0.3);
  assert.equal(env.run('sumMoney([0.1, 0.2, -0.3])'), 0);
});

test('centavo formatter shows exact positive and negative PHP amounts', () => {
  const env = bootGame();
  assert.equal(env.run('moneyExact(1.005)'), '₱1.01');
  assert.equal(env.run('moneyExact(-2.675)'), '−₱2.68');
  assert.equal(env.run('moneyExact(1234.5)'), '₱1,234.50');
});

test('cash-flow calculation uses integer-centavo signed arithmetic', () => {
  const env = bootGame();
  assert.equal(env.run('cashFlowNet({operatingIn:0.1, operatingOut:0.2, investingIn:0.2, investingOut:0.1, financingIn:0.3, financingOut:0.3})'), 0);
  assert.equal(env.run('cashFlowNet({operatingIn:0.1, operatingOut:0, investingIn:0.2, investingOut:0, financingIn:0, financingOut:0})'), 0.3);
});

test('journal entry centavo normalization produces exact balanced totals', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  env.context.makeEntry('Centavo QA entry', [
    { account: 'Centavo expense', debit: 0.1 + 0.2, credit: 0 },
    { account: 'Cash', debit: 0, credit: 0.3 }
  ]);
  const entry = env.getGame().journal[0];
  assert.equal(entry.memo, 'Centavo QA entry');
  assert.equal(entry.total, 0.3);
  assert.equal(entry.lines.reduce((sum, line) => sum + moneyCentsForTest(line.debit), 0), 30);
  assert.equal(entry.lines.reduce((sum, line) => sum + moneyCentsForTest(line.credit), 0), 30);
  function moneyCentsForTest(value) { return Math.round(value * 100); }
});

test('default event reports the immediate one-time score penalty separately from prior distress changes', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  env.context.__test.getGame().creditScore = 50;
  env.context.markLoanDefault('four consecutive overdue weeks');
  const event = env.getGame().events[0];
  assert.equal(env.getGame().creditScore, 32);
  assert.match(event.description, /immediately before default: 50\.0/);
  assert.match(event.description, /one-time default penalty: −18\.0 points/);
  assert.match(event.description, /score after default penalty: 32\.0/);
  assert.match(event.description, /Weekly distress-related score changes are separate/);
});

test('Finance UI shows exact centavo values for asset records and loan distress balances', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  env.context.purchaseFixedAsset(25000.005, { name: 'Centavo Test Asset', category: 'equipment' });
  const asset = env.getGame().assets.find(a => a.name === 'Centavo Test Asset');
  assert.equal(asset.cost, 25000.01);
  let rendered = env.context.renderFinance();
  assert.match(rendered, /₱25,000\.01/);

  const game = env.getGame();
  game.loanOriginalAmount = 100000;
  game.loanBalance = 99776.92;
  game.loanStatus = 'past_due';
  game.loanArrearsPrincipal = 1581.91;
  game.loanArrearsInterest = 0;
  game.loanArrears = 1581.91;
  game.loanInterestPayable = 246.15;
  game.loanLateFeesPayable = 30.77;
  rendered = env.context.renderFinance();
  assert.match(rendered, /₱1,581\.91/);
  assert.match(rendered, /₱246\.15/);
  assert.match(rendered, /₱30\.77/);
});


test('selling-price input uses centavo-safe rounding for 1.005 and allows centavo values in the UI', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  const product = env.getGame().products[0];
  const input = env.context.document.querySelector(`#price-${product.id}`);
  input.value = '1.005';
  env.run(`savePrice(${JSON.stringify(product.id)})`);
  const saved = env.getGame().products.find(p => p.id === product.id);
  assert.equal(saved.price, 1.01);
  assert.equal(env.run('moneyToCentavos(game.products[0].price)'), 101);
  const rendered = env.run('renderOperations()');
  assert.match(rendered, /step="0\.01"/);
  assert.match(rendered, /₱1\.01/);
});

test('cash-flow statement displays cents so operating inflow less outflow equals the displayed subtotal', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  const game = env.getGame();
  game.cashFlowOpeningCash = 1000;
  game.cashFlowPeriodOpeningCash = 1000;
  game.cashFlowCurrent = {operatingIn:0, operatingOut:0, investingIn:0, investingOut:0, financingIn:0, financingOut:0};
  game.cashFlowCurrent.operatingIn = 45947.04;
  game.cashFlowCurrent.operatingOut = 1746.54;
  game.cash = 1000 + env.run('sumMoney([45947.04, -1746.54])');
  const rendered = env.run('renderCashFlowStatement()');
  assert.match(rendered, /₱45,947\.04/);
  assert.match(rendered, /−₱1,746\.54/);
  assert.match(rendered, /₱44,200\.50/);
});

test('income statement shows exact cents and derives subtotals using centavo aggregation', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  const game = env.getGame();
  game.totals.revenue = 49942.41;
  game.totals.cogs = 22250.17;
  game.totals.rent = 4140.25;
  game.totals.utilities = 966.12;
  game.totals.marketing = 1500.11;
  game.totals.other = 2000;
  game.totals.depreciation = 48.33;
  game.totals.interest = 246.15;
  game.totals.tax = 4158.32;
  const gross = env.run('sumMoney([game.totals.revenue, -game.totals.cogs])');
  const operating = env.run('sumMoney([game.totals.rent, game.totals.utilities, game.totals.payroll, game.totals.marketing, game.totals.other, game.totals.depreciation])');
  game.totals.net = env.run('sumMoney([gross, -operating, -game.totals.interest, game.totals.assetDisposalGain, -game.totals.assetDisposalLoss, -game.totals.tax])'.replace('gross', String(gross)).replace('operating', String(operating))); 
  const rendered = env.run('renderReports()');
  assert.match(rendered, /₱49,942\.41/);
  assert.match(rendered, /₱22,250\.17/);
  assert.match(rendered, new RegExp(`₱${Math.abs(env.run(`sumMoney([${gross}, -${operating}])`)).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2}).replace('.', '\\.')}`));
});


test('owner capital contribution normalizes monetary input to integer centavos', () => {
  const env = bootGame();
  const game = makeCompany(env, 'retail');
  const beforeCapital = game.capital;
  const beforeCash = game.cash;
  env.context.document.querySelector('#capital-injection').value = '1000.005';
  env.run('injectCapital()');
  const after = env.getGame();
  assert.equal(after.capital, beforeCapital + 1000.01);
  assert.equal(after.cash, beforeCash + 1000.01);
  assertJournalBalanced(after);
});

test('loan origination normalizes monetary input to integer centavos', () => {
  const env = bootGame();
  makeCompany(env, 'agency', 1500000);
  env.context.document.querySelector('#loan-amount').value = '10000.005';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.run('loanRequest()');
  const after = env.getGame();
  assert.equal(after.loanBalance, 10000.01);
  assert.equal(after.loanOriginalAmount, 10000.01);
  assertJournalBalanced(after);
  assert.ok(Math.abs(env.run('balanceSheet().delta')) < 0.11);
});

test('invalid selling price leaves the existing price unchanged', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  const product = env.getGame().products[0];
  const before = product.price;
  env.context.document.querySelector(`#price-${product.id}`).value = '0';
  env.run(`savePrice(${JSON.stringify(product.id)})`);
  assert.equal(env.getGame().products.find(p => p.id === product.id).price, before);
});


test('credit score UI rounds floating-point artifacts to one decimal in dashboard and loan panel', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  env.getGame().creditScore = 44.39999999999999;
  const dashboard = env.run('renderDashboard()');
  const finance = env.run('renderFinance()');
  assert.match(dashboard, /44\.4<span class="muted" style="font-size:11px"> \/ 100<\/span>/);
  assert.match(finance, /current credit score: 44\.4\/100/);
  assert.doesNotMatch(dashboard, /44\.39999999999999/);
  assert.doesNotMatch(finance, /44\.39999999999999/);
  assert.equal(env.getGame().creditScore, 44.39999999999999, 'display formatting must not mutate saved score state');
});


test('Phase 5.4.1 local saves use a versioned integer-centavo envelope across nested financial records', () => {
  const env = bootGame();
  const game = makeCompany(env, 'retail');
  const originalCash = game.cash;
  const stored = JSON.parse(env.context.localStorage.getItem('realworld-business-sim-v1'));
  assert.equal(stored.saveFormat, 'REALWORLD');
  assert.equal(stored.saveFormatVersion, 4);
  assert.equal(stored.moneyStorage, 'integer-centavo');
  assert.equal(stored.currency, 'PHP');
  assert.ok(Number.isSafeInteger(stored.state.cash));
  assert.equal(stored.state.cash, env.context.moneyToCentavos(originalCash));
  assert.ok(Number.isSafeInteger(stored.state.products[0].price));
  assert.equal(stored.state.products[0].price, env.context.moneyToCentavos(game.products[0].price));
  assert.ok(Number.isSafeInteger(stored.state.assets[0].cost));
  assert.ok(Number.isSafeInteger(stored.state.journal[0].lines[0].debit));
  assert.ok(Number.isSafeInteger(stored.state.journal[0].total));
  assert.equal(stored.state.journal[0].total, env.context.moneyToCentavos(game.journal[0].total));
  const restored = env.context.validateSaveCandidate(JSON.parse(JSON.stringify(stored)));
  assert.equal(restored.cash, originalCash);
  assert.equal(restored.company, game.company);
  assert.equal(restored.journal[0].total, game.journal[0].total);
  assert.ok(Math.abs(env.context.balanceSheet().delta) < 1);
});

test('Phase 5.4.1 legacy flat v1 saves remain readable and re-encode as integer centavos', () => {
  const env = bootGame();
  const game = makeCompany(env, 'retail');
  const legacy = JSON.parse(JSON.stringify(game));
  assert.equal(legacy.version, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(legacy, 'saveFormat'), false);
  const restoredLegacy = env.context.validateSaveCandidate(legacy);
  const newPayload = env.context.encodeSavePayload(restoredLegacy);
  assert.equal(newPayload.saveFormatVersion, 4);
  assert.ok(Number.isSafeInteger(newPayload.state.cash));
  assert.equal(newPayload.state.cash, env.context.moneyToCentavos(game.cash));
  const finalState = env.context.validateSaveCandidate(JSON.parse(JSON.stringify(newPayload)));
  assert.equal(finalState.cash, game.cash);
  assert.equal(finalState.loanBalance, game.loanBalance);
  assert.equal(finalState.assets.length, game.assets.length);
  assert.ok(Math.abs(env.context.balanceSheet().delta) < 1);
});

test('Phase 5.4.1 rejects unsupported envelopes and fractional centavos before state replacement', () => {
  const env = bootGame();
  const game = makeCompany(env, 'retail');
  const beforeCompany = game.company;
  const good = env.context.encodeSavePayload(game);
  const badVersion = JSON.parse(JSON.stringify(good));
  badVersion.saveFormatVersion = 99;
  assert.throws(() => env.context.validateSaveCandidate(badVersion), /Unsupported or malformed/);
  const fractional = JSON.parse(JSON.stringify(good));
  fractional.state.cash = 1.5;
  assert.throws(() => env.context.validateSaveCandidate(fractional), /integer centavos/);
  assert.equal(env.getGame().company, beforeCompany, 'invalid payload must not replace current company');
});


test('Phase 5.4.2 migrates v2 and v3 envelopes with a legacy single loan and journal totals', () => {
  const env = bootGame();
  const game = makeCompany(env, 'retail');
  env.context.document.querySelector('#loan-amount').value = '100000';
  env.context.document.querySelector('#loan-term-months').value = '12';
  env.context.loanRequest();
  const originalBalance = game.loanBalance;
  // Actual v2/v3 state predates the loan collection; legacy singleton fields remain at the root.
  const legacyRuntime = JSON.parse(JSON.stringify(game));
  delete legacyRuntime.loans;
  delete legacyRuntime.loanSequence;
  const v2State = env.run('transformMoneyStorageFields(JSON.parse('+JSON.stringify(JSON.stringify(legacyRuntime))+'), "encode", "state", MONEY_STORAGE_FIELDS_V2)');
  assert.equal(v2State.journal[0].total, game.journal[0].total, 'v2 journal total remains in pesos');
  assert.ok(Number.isSafeInteger(v2State.journal[0].lines[0].debit), 'v2 journal lines remain in centavos');
  assert.equal(Object.hasOwn(v2State,'loans'), false, 'legacy v2 has no loan collection');
  const v2Payload = {saveFormat:'REALWORLD',saveFormatVersion:2,moneyStorage:'integer-centavo',currency:'PHP',state:v2State};
  const restored = env.context.validateSaveCandidate(JSON.parse(JSON.stringify(v2Payload)));
  assert.equal(restored.journal[0].total, game.journal[0].total);
  assert.equal(restored.loans.length, 1);
  assert.equal(restored.loans[0].loanBalance, originalBalance);
  const v4Payload = env.context.encodeSavePayload(restored);
  assert.equal(v4Payload.saveFormatVersion, 4);
  assert.ok(Number.isSafeInteger(v4Payload.state.journal[0].total));
  assert.equal(v4Payload.state.journal[0].total, env.context.moneyToCentavos(game.journal[0].total));
  assert.equal(env.context.validateSaveCandidate(v4Payload).journal[0].total, game.journal[0].total);
  const v3State = env.run('transformMoneyStorageFields(JSON.parse('+JSON.stringify(JSON.stringify(legacyRuntime))+'), "encode", "state", MONEY_STORAGE_FIELDS_V3)');
  const v3LegacyEnvelope = {saveFormat:'REALWORLD',saveFormatVersion:3,moneyStorage:'integer-centavo',currency:'PHP',state:v3State};
  const restoredV3 = env.context.validateSaveCandidate(JSON.parse(JSON.stringify(v3LegacyEnvelope)));
  assert.equal(restoredV3.journal[0].total, game.journal[0].total);
  assert.equal(restoredV3.loans.length, 1);
  assert.equal(restoredV3.loans[0].loanBalance, originalBalance);
  assert.equal(env.context.encodeSavePayload(restoredV3).saveFormatVersion, 4);
});


test('Phase 5.4.3 loan portfolio renders term counts, exact rate precision, and per-status health', () => {
  const env = bootGame();
  makeCompany(env, 'retail');
  const loans = [
    {id:'loan-0001',name:'Term Loan 1',lender:'QA Lender',createdWeek:1,loanBalance:90000,loanAnnualRate:0.128,loanTermMonths:12,loanWeeksRemaining:48,loanWeeklyPayment:2051.14,loanOriginalAmount:100000,loanStatus:'current',loanInterestPayable:0,loanArrears:0,loanArrearsPrincipal:0,loanArrearsInterest:0,loanLateFeesPayable:0,loanMissedPayments:1,loanDelinquencyWeeks:0,loanDefaultWeek:0},
    {id:'loan-0002',name:'Term Loan 2',lender:'QA Lender',createdWeek:1,loanBalance:49070.55,loanAnnualRate:0.128,loanTermMonths:24,loanWeeksRemaining:100,loanWeeklyPayment:545.52,loanOriginalAmount:50000,loanStatus:'defaulted',loanInterestPayable:123.08,loanArrears:885.56,loanArrearsPrincipal:885.56,loanArrearsInterest:0,loanLateFeesPayable:43.67,loanMissedPayments:4,loanDelinquencyWeeks:4,loanDefaultWeek:4}
  ];
  env.run(`game.loans = ${JSON.stringify(loans)}; game.cash = 10000;`);
  const markup = env.context.renderLoanPortfolio();
  assert.match(markup, /Portfolio health: 1 current · 0 past due · 1 defaulted · 0 paid off/);
  assert.ok(markup.includes('<span class="row-title">Weeks remaining</span><span class="row-value num">48</span>'));
  assert.ok(markup.includes('<span class="row-title">Weeks remaining</span><span class="row-value num">100</span>'));
  assert.ok(markup.includes('<span class="row-title">Annual interest rate</span><span class="row-value num">12.8%</span>'));
  assert.doesNotMatch(markup, /Weeks remaining<\/span><span class="row-value num">₱/);
  assert.ok(markup.includes('Defaulted: scheduled installments are suspended. Outstanding principal, arrears, interest, and fees remain liabilities.'));
  assert.ok(markup.includes('Debt payments can still be made against this facility.'));
  assert.ok(markup.includes('Scheduled repayments are active for this facility.'));
});
