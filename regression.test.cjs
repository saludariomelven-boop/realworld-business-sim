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
  assert.match(finance, /Fixed-asset investment/);
  assert.match(finance, /Purchase equipment/);
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
