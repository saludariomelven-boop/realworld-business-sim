'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = __dirname;
const source = fs.readFileSync(path.join(ROOT, 'layer10.js'), 'utf8');
const loader = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function makeHarness(company = null, layer9 = null, includeContext = false, storageSeed = {}) {
  const listeners = new Map();
  const nodes = new Map([
    ['#rw10-full-context', { checked: !!includeContext, setAttribute() {} }],
    ['#rw10-include-notes', { checked: false }]
  ]);
  const document = {
    readyState: 'loading',
    addEventListener(name, callback) { const current = listeners.get(name) || []; current.push(callback); listeners.set(name, current); },
    querySelector(selector) { return nodes.get(selector) || null; },
    querySelectorAll() { return []; },
    createElement() { return { style: {}, setAttribute() {}, appendChild() {}, classList: { add() {}, remove() {}, toggle() {} } }; },
    head: { appendChild() {} },
    documentElement: { appendChild() {} }
  };
  const storage = new Map(Object.entries(storageSeed));
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };
  const window = { REALWORLD_LAYER9: layer9 || null, REALWORLD_LAYER8: { buildAIMessageList(question, previous, includeCompany) { return { messages: [{ role: 'system', content: 'company-aware assistant system' }, { role: 'user', content: String(question) }], snapshotIncluded: includeCompany }; } } };
  const context = vm.createContext({ window, document, localStorage, game: company, console, Intl, Date, WeakSet, Math, Number, String, Object, Array, Set, Map, JSON, RegExp, Promise, setTimeout, clearTimeout });
  vm.runInContext(source, context, { filename: 'layer10.js', timeout: 10000 });
  return { api: window.REALWORLD_LAYER10, context, window, document, storage, listeners, nodes };
}
function sampleCompany() {
  return {
    company: 'Layer 10 QA Trading', founder: 'Test Founder', businessDisplayName: 'Online Retail Shop', businessTemplateId: 'retail',
    countryCode: 'PH', currencyCode: 'PHP', location: 'Pasay, NCR', companyStatus: 'active', week: 7, date: '2026-10-14', cash: 123456.78,
    ar: 1000, ap: 2500, monthlyRent: 12000, monthlyUtilities: 2400, payrollPayable: 1200, taxPayable: 300, loanBalance: 4000,
    products: [{ id: 'p1', name: 'Water', kind: 'goods', stock: 20, baseDemand: 12, price: 35, unitCost: 18 }],
    employees: [{ id: 'e1', name: 'Rider', role: 'Delivery Rider', salary: 8000 }],
    purchaseOrders: [{ id: 'po1', status: 'open', productName: 'Water', supplierName: 'Sample Supplier', quantity: 100, etaWeek: 8 }],
    assets: [{ id: 'a1', name: 'Delivery bike', bookValue: 40000 }],
    loans: [{ id: 'l1', balance: 4000, arrears: 0 }],
    history: [{ week: 6, revenue: 55000, cogs: 24000, net: 11000, units: 20, stockouts: 0 }],
    journal: [{ week: 6, memo: 'Recorded sale' }], events: [{ week: 7, title: 'Modeled demand event' }],
    totals: { revenue: 250000, cogs: 110000, net: 52000 }, realworldLayer9: { closed: null, jobs: [{ id: 'JOB-00001', status: 'queued' }], growth: { units: 1, invested: 25000 }, activeEvents: [{ id: 'demand-surge' }] },
    applicationPreferences: { selectedView: 'finance' }, apiKey: 'must-not-leak'
  };
}

test('Layer 10 loader preserves pinned Layer 6 and skips the former on-device AI module', () => {
  assert.match(loader, /cca64607926733ee0d1130138606b2753a67dd99/);
  assert.match(loader, /layer7\.js/);
  assert.match(loader, /layer8\.2\.js/);
  assert.match(loader, /layer9\.js/);
  assert.match(loader, /layer10\.js/);
  assert.match(loader, /const files=\['layer7\.js','layer8\.2\.js','layer9\.js','layer10\.js','layer11\.js'\]/);
  assert.match(loader, /\?v=\'\+RELEASE/);
  assert.match(loader, /RW-LAYER-11\.0\.1/);
});

test('the new runtime contains no WebLLM or downloaded on-device model loader', () => {
  assert.doesNotMatch(source, /@mlc-ai\/web-llm|CreateMLCEngine|CreateWebWorkerMLCEngine|Llama-3\.2-1B-Instruct|navigator\.gpu|rw83-load-local-model|rw83-use-local-model|rw83-local-card/);
  assert.match(source, /online provider/i);
  assert.match(source, /data-rw10-report/);
});

test('complete snapshot exposes every core business area and Layer 9 extension state', () => {
  const env = makeHarness(sampleCompany());
  const snapshot = env.api.buildCompanySnapshot();
  assert.equal(snapshot.available, true);
  assert.equal(snapshot.snapshotType, 'REALWORLD complete available simulation state');
  assert.equal(snapshot.companyIdentity.company, 'Layer 10 QA Trading');
  assert.equal(snapshot.companyState.cash, 123456.78);
  assert.equal(snapshot.companyState.products[0].name, 'Water');
  assert.equal(snapshot.companyState.employees[0].role, 'Delivery Rider');
  assert.equal(snapshot.companyState.purchaseOrders[0].id, 'po1');
  assert.equal(snapshot.companyState.assets[0].name, 'Delivery bike');
  assert.equal(snapshot.companyState.loans[0].balance, 4000);
  assert.equal(snapshot.companyState.journal[0].memo, 'Recorded sale');
  assert.equal(snapshot.companyState.realworldLayer9.jobs[0].id, 'JOB-00001');
  assert.equal(snapshot.companyState.realworldLayer9.activeEvents[0].id, 'demand-surge');
  assert.equal(Object.hasOwn(snapshot.companyState, 'apiKey'), false);
  assert.ok(snapshot.coverage.topLevelFields >= 20);
});


test('full-context prompt contains the structured company state only when enabled, and notes only with separate consent', () => {
  const env = makeHarness(sampleCompany(), null, true);
  const prompt = env.api.buildPrompt('How is my company doing?', []);
  assert.equal(prompt.included, true);
  assert.match(prompt.messages.at(-1).content, /REALWORLD complete available simulation state/);
  assert.match(prompt.messages.at(-1).content, /"monthlyUtilities":2400/);
  assert.match(prompt.messages.at(-1).content, /"Delivery Rider"/);

  env.api.saveNotes('Protect a minimum cash reserve.');
  env.nodes.get('#rw10-include-notes').checked = true;
  const withNotes = env.api.buildPrompt('What should I focus on?', []);
  assert.match(withNotes.messages.at(-1).content, /Protect a minimum cash reserve/);

  env.nodes.get('#rw10-full-context').checked = false;
  const withoutContext = env.api.buildPrompt('General question', []);
  assert.equal(withoutContext.included, false);
  assert.doesNotMatch(withoutContext.messages.at(-1).content, /REALWORLD complete available simulation state/);
  assert.doesNotMatch(withoutContext.messages.at(-1).content, /Protect a minimum cash reserve/);
});

test('company snapshot caps pathological lists and reports when data is trimmed', () => {
  const company = sampleCompany();
  company.history = Array.from({ length: 400 }, (_, week) => ({ week, revenue: week * 100 }));
  const env = makeHarness(company);
  const snapshot = env.api.buildCompanySnapshot();
  assert.equal(snapshot.coverage.history, 400);
  assert.ok(snapshot.coverage.truncatedDetails.some((item) => item.includes('history')));
  assert.ok(snapshot.companyState.history.length <= 251);
});

test('company snapshots do not mutate the actual business state', () => {
  const company = sampleCompany();
  const before = JSON.stringify(company);
  const env = makeHarness(company);
  env.api.buildCompanySnapshot();
  assert.equal(JSON.stringify(company), before);
});

test('closure action is made visible on dashboard and reports when the layer panel is missing', () => {
  const layer9 = { isClosed: () => false, getState: () => ({ closed: null }) };
  const env = makeHarness(sampleCompany(), layer9);
  const original = '<div class="page-head"><h1>Dashboard</h1></div><div class="grid stats-grid">metrics</div>';
  const result = env.api.ensureClosureMarkup(original, false);
  assert.match(result, /data-testid="rw9-voluntary-closure"/);
  assert.match(result, /data-rw9-action="close-business"/);
  assert.ok(result.indexOf('rw9-voluntary-closure') < result.indexOf('stats-grid'));
  const reports = env.api.ensureClosureMarkup('<h1>Reports</h1>', true);
  assert.match(reports, /Close this business/);
});

test('Secretary reports are read-only and can summarize financial, stock, people, and ledger data', () => {
  const company = sampleCompany();
  const before = JSON.stringify(company);
  const env = makeHarness(company);
  assert.match(env.api.report('brief'), /Layer 10 QA Trading/);
  assert.match(env.api.report('cash'), /Cash and risk review/);
  assert.match(env.api.report('stock'), /Sample Supplier/);
  assert.match(env.api.report('team'), /Delivery Rider/);
  assert.match(env.api.report('weekly'), /Recorded weekly results/);
  assert.match(env.api.report('ledger'), /Ledger and balance overview/);
  assert.equal(JSON.stringify(company), before);
});


test('large company snapshots remain valid JSON and respect the advertised prompt budget', () => {
  const company = sampleCompany();
  company.history = Array.from({ length: 900 }, (_, week) => ({
    week, date: '2026-01-01', revenue: week * 1000, net: week * 100,
    memo: 'weekly business context '.repeat(40)
  }));
  company.journal = Array.from({ length: 900 }, (_, id) => ({
    id: `entry-${id}`, memo: 'accounting record '.repeat(50),
    metadata: Object.fromEntries(Array.from({ length: 60 }, (_, k) => [`field${k}`, 'detail '.repeat(30)]))
  }));
  company.customExtension = Object.fromEntries(Array.from({ length: 100 }, (_, index) => [`section${index}`, {
    notes: 'important context '.repeat(250), entries: Array.from({ length: 100 }, (_unused, row) => ({ id: row, description: 'entry '.repeat(100) }))
  }]));
  const env = makeHarness(company);
  const snapshot = env.api.buildCompanySnapshot();
  const encoded = JSON.stringify(snapshot);
  assert.doesNotThrow(() => JSON.parse(encoded));
  assert.ok(encoded.length <= 65000, `snapshot was ${encoded.length} characters`);
  assert.equal(snapshot.coverage.history, 900);
  assert.ok(snapshot.coverage.truncatedDetails.length > 0);
  assert.ok(snapshot.coverage.topLevelFields >= 20);
});

test('online Ask AI sends full company context through the existing provider and never mutates game state', async () => {
  const company = sampleCompany();
  const before = JSON.stringify(company);
  const env = makeHarness(company, null, true);
  let sentMessages = null;
  let sentOptions = null;
  env.window.puter = { ai: { chat: async (messages, testMode, options) => {
    sentMessages = messages; sentOptions = options;
    return { message: { content: 'Review stock coverage first, then compare the supplier ETA with expected demand.' } };
  } } };
  const ok = await env.api.sendAIQuestion('What should I do next?');
  assert.equal(ok, true);
  assert.ok(Array.isArray(sentMessages));
  assert.match(sentMessages.at(-1).content, /REALWORLD complete available simulation state/);
  assert.match(sentMessages.at(-1).content, /"cash":123456\.78/);
  assert.match(sentMessages.at(-1).content, /JOB-00001/);
  assert.equal(sentOptions.stream, true);
  assert.equal(JSON.stringify(company), before);
  assert.equal(env.api.getState().assistantBusy, false);
});

test('assistant full-context snapshot strips credential-like camelCase and underscored fields without stripping secretary fields', () => {
  const company = sampleCompany();
  company.clientSecret = 'not-to-share';
  company.AWS_SECRET_ACCESS_KEY = 'not-to-share';
  company.accessToken = 'not-to-share';
  company.secretaryNotes = 'keep normal business notes';
  const snapshot = makeHarness(company).api.buildCompanySnapshot();
  assert.equal(Object.hasOwn(snapshot.companyState, 'clientSecret'), false);
  assert.equal(Object.hasOwn(snapshot.companyState, 'AWS_SECRET_ACCESS_KEY'), false);
  assert.equal(Object.hasOwn(snapshot.companyState, 'accessToken'), false);
  assert.equal(snapshot.companyState.secretaryNotes, 'keep normal business notes');
});


test('company-scoped notes migrate nondestructively and do not follow a different game object', () => {
  const company = sampleCompany();
  const identityRaw = [company.countryCode, company.company, company.founder, company.businessTemplateId, company.businessModel, company.industry, company.location, company.capital].map((v) => String(v == null ? '' : v).trim().toLowerCase()).join('|');
  let hash = 2166136261;
  for (let i = 0; i < identityRaw.length; i++) { hash ^= identityRaw.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  const id = (hash >>> 0).toString(16).padStart(8, '0');
  const oldKey = `realworld-secretary-memory-v1:${id}`;
  const newKey = `realworld-secretary-memory-v2:${id}`;
  const env = makeHarness(company, null, false, { [oldKey]: 'Keep a cash reserve.' });
  assert.equal(env.api.readNotes(), 'Keep a cash reserve.');
  assert.equal(env.storage.get(newKey), 'Keep a cash reserve.');
  assert.equal(env.storage.get(oldKey), 'Keep a cash reserve.', 'migration must not delete the prior notes key');
  let clearCalls = 0;
  env.window.REALWORLD_LAYER8.clearGuideConversation = () => { clearCalls += 1; };
  env.api.syncCompanyScope();
  const firstMemoryKey = env.api.getState().memoryKey;
  env.context.game = { ...company, company: 'Another QA company' };
  env.api.syncCompanyScope();
  assert.notEqual(env.api.getState().memoryKey, firstMemoryKey);
  assert.equal(clearCalls, 1, 'switching companies clears the previous conversation context');
});


test('online provider sign-in is never triggered silently after an asynchronous load', async () => {
  const env = makeHarness(sampleCompany(), null, true);
  const input = { value: 'Explain my current cash position.', disabled: false };
  const submit = { disabled: false, textContent: 'Ask AI' };
  env.nodes.set('#rw7-guide-question', input);
  env.nodes.set('#rw7-guide-form button[type="submit"]', submit);
  let chatCalls = 0;
  env.window.puter = { ai: { chat: async () => { chatCalls += 1; return { message: { content: 'Should not send.' } }; } } };
  env.window.REALWORLD_LAYER8.getAIState = () => ({ loadState: 'ready', authState: 'signed-out' });
  const result = await env.api.sendAIQuestion(input.value);
  assert.equal(result, false);
  assert.equal(chatCalls, 0);
  assert.equal(input.value, 'Explain my current cash position.');
  assert.equal(env.api.getState().assistantBusy, false);
  assert.equal(submit.textContent, 'Ask AI');
  assert.equal(submit.disabled, true, 'ask stays disabled until the player explicitly connects the provider');
});

test('provider failures return the UI to an idle state and preserve the unsent question', async () => {
  const env = makeHarness(sampleCompany(), null, true);
  const input = { value: 'What needs attention?', disabled: false };
  const submit = { disabled: false, textContent: 'Ask AI' };
  env.nodes.set('#rw7-guide-question', input);
  env.nodes.set('#rw7-guide-form button[type="submit"]', submit);
  env.window.puter = { ai: { chat: async () => { throw new Error('provider offline'); } } };
  const result = await env.api.sendAIQuestion(input.value);
  assert.equal(result, false);
  assert.equal(input.value, 'What needs attention?');
  assert.equal(env.api.getState().assistantBusy, false);
  assert.equal(submit.textContent, 'Ask AI');
});

test('supplier and growth panels are promoted next to their relevant page headings', () => {
  const env = makeHarness(sampleCompany());
  const html = '<div class="page-head"><h1>Finance</h1></div><div class="panel">Existing finance</div><section data-testid="rw9-growth"><h3>Growth</h3></section>';
  const result = env.api.promotePanel(html, 'rw9-growth');
  assert.ok(result.indexOf('rw9-growth') > result.indexOf('page-head'));
  assert.ok(result.indexOf('rw9-growth') < result.indexOf('Existing finance'));
});

test('Philippines source list is consistent with the intended DTI, BIR, DOLE, and business hub checklist', () => {
  const items = [
    { id: 'business-name', source: 'DTI Business Name Registration System', url: 'https://bnrs.dti.gov.ph/' },
    { id: 'tax-registration', source: 'Bureau of Internal Revenue', url: 'https://www.bir.gov.ph/' },
    { id: 'employer-obligations', source: 'Social Security System — Employer', url: 'https://www.sss.gov.ph/employer-er/' },
    { id: 'local-permits', source: 'Local permits', url: 'https://example.invalid/' }
  ];
  const env = makeHarness(sampleCompany(), { isClosed: () => false, getState: () => ({ closed: null }), countryReviewItems: items });
  env.api.syncCountrySources();
  assert.equal(items.find((item) => item.id === 'employer-obligations').source, 'Department of Labor and Employment');
  assert.equal(items.find((item) => item.id === 'employer-obligations').url, 'https://www.dole.gov.ph/');
  assert.equal(items.find((item) => item.id === 'local-permits').source, 'Philippine Business Hub');
  assert.equal(items.find((item) => item.id === 'local-permits').url, 'https://business.gov.ph/home');
});

test('no-company state is handled without crashing', () => {
  const env = makeHarness(null);
  assert.equal(env.api.buildCompanySnapshot().available, false);
  assert.match(env.api.report('brief'), /No company is open/);
});

test('syncCompanyScope does not rewrite an unchanged notes label and trigger an observer feedback loop', () => {
  const env = makeHarness(sampleCompany());
  let stored = '';
  let assignments = 0;
  const label = {};
  Object.defineProperty(label, 'textContent', {
    get() { return stored; },
    set(value) { assignments += 1; stored = String(value); }
  });
  env.nodes.set('#rw10-notes-company', label);

  env.api.syncCompanyScope();
  assert.equal(assignments, 1, 'first sync writes the label once');
  const renderedLabel = stored;
  env.api.syncCompanyScope();
  env.api.syncCompanyScope();
  assert.equal(assignments, 1, 'unchanged label must not be re-assigned on observer callbacks');
  assert.match(renderedLabel, /Layer 10 QA Trading/);
});

test('syncCompanyScope without an open company also avoids repeated empty-label mutations', () => {
  const env = makeHarness(null);
  let stored = '';
  let assignments = 0;
  const label = {};
  Object.defineProperty(label, 'textContent', {
    get() { return stored; },
    set(value) { assignments += 1; stored = String(value); }
  });
  env.nodes.set('#rw10-notes-company', label);

  env.api.syncCompanyScope();
  env.api.syncCompanyScope();
  assert.equal(stored, 'Open a company to save or load company-specific notes.');
  assert.equal(assignments, 1, 'no-company state must not continually replace its text node');
});

