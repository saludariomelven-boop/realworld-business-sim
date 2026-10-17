'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'layer12.js'), 'utf8');
function makeHarness() {
  const listeners = new Map();
  const document = {
    readyState: 'loading', head: { appendChild() {} }, documentElement: { appendChild() {} },
    addEventListener(name, fn) { const rows = listeners.get(name) || []; rows.push(fn); listeners.set(name, rows); },
    querySelector() { return null; }, querySelectorAll() { return []; },
    createElement() {
      return { style: {}, dataset: {}, attributes: {}, children: [], listeners: {},
        setAttribute(name, value) { this.attributes[name] = String(value); },
        addEventListener(name, callback) { this.listeners[name] = callback; },
        appendChild(child) { this.children.push(child); }, remove() {}, focus() {}, scrollIntoView() {} };
    }
  };
  const window = { REALWORLD_ASSISTANT_CONFIG: { endpoint: 'https://assistant.example.test/chat' } };
  const context = vm.createContext({ window, document, console, Intl, Date, Math, Number, String, Object, Array, Set, Map, JSON, RegExp, URL, Promise, AbortController, Event, setTimeout, clearTimeout, fetch: async () => { throw new Error('Test fetch was not configured'); } });
  vm.runInContext(source, context, { filename: 'layer12.js', timeout: 10000 });
  return { api: window.REALWORLD_LAYER12, window, document, listeners, context };
}
function snapshot() {
  return { available: true, companyIdentity: { company: 'QA company', companyStatus: 'active' }, companyState: { companyStatus: 'active', marketingBudget: 1000, products: [{ id: 'p1', name: 'Water', kind: 'goods', price: 35 }] } };
}
function mockRuntime(messages) {
  return {
    buildPrompt(question) { return { messages: [{ role: 'system', content: 'Use current simulation facts.' }, { role: 'user', content: question }], included: true }; },
    addMessage(role, title, text, pending) { const wrapper = { children: [], appendChild(child) { this.children.push(child); } }; const ref = { role, title, text, pending, wrapper }; messages.push(ref); return ref; },
    updateMessage(ref, text, pending) { ref.updatedText = text; ref.pending = pending; },
    buildCompanySnapshot: snapshot,
    report(type) { return 'Local ' + type + ' report for QA company'; },
    formatReportInChat(title, body) { messages.push({ role: 'assistant', title, text: body }); },
    clearAssistantConversation() {}
  };
}

test('Layer 12 uses a configured shared endpoint and contains no direct Puter provider', () => {
  const env = makeHarness();
  assert.equal(env.api.build, 'RW-LAYER-12.1.0 · Business Partner & shared-service consolidation · 2026-10-17');
  assert.equal(env.api.model, 'gemini-3.8-flash');
  assert.equal(env.api.getState().provider, 'shared-gemini-worker');
  assert.equal(env.api.getState().configured, true);
  assert.doesNotMatch(source, /js\.puter\.com|window\.puter|puter\.ai\.chat/);
  assert.match(source, /REALWORLD_ASSISTANT_CONFIG/);
  assert.match(source, /callSharedService/);
});

test('message normalization preserves app instructions and merges adjacent same-role messages', () => {
  const normalized = makeHarness().api.normalizeMessages([
    { role: 'system', content: 'System prompt' }, { role: 'assistant', content: 'old opening removed' },
    { role: 'user', content: 'Question one' }, { role: 'user', content: 'Question two' },
    { role: 'assistant', content: 'Earlier answer' }, { role: 'user', content: 'Final question' }
  ]);
  assert.match(normalized[0].content, /System prompt/);
  assert.equal(normalized[1].role, 'user');
  assert.match(normalized[1].content, /Question one[\s\S]*Question two/);
  assert.equal(normalized.at(-1).content, 'Final question');
});

test('message normalization rejects a history without a final user question', () => {
  assert.throws(() => makeHarness().api.normalizeMessages([{ role: 'assistant', content: 'only an answer' }]), /final user message/i);
});

test('tool-call decoding safely parses proposals and rejects invalid JSON', () => {
  const api = makeHarness().api;
  const ordinary = api.extractToolProposal({ message: { content: 'A normal answer.' } });
  assert.equal(ordinary.text, 'A normal answer.'); assert.equal(ordinary.action, null);
  const proposed = api.extractToolProposal({ message: { content: null, tool_calls: [{ function: { name: 'propose_company_action', arguments: '{"type":"navigate","view":"finance"}' } }] } });
  assert.equal(proposed.action.type, 'navigate'); assert.equal(proposed.action.view, 'finance'); assert.equal(proposed.error, null);
  const invalid = api.extractToolProposal({ message: { tool_calls: [{ function: { name: 'propose_company_action', arguments: '{invalid' } }] } });
  assert.match(invalid.error, /could not be read/i);
});

test('price proposals require an exact existing goods product and supported percentage', () => {
  const api = makeHarness().api;
  assert.equal(api.validateAction({ type: 'stage_price', productId: 'p1', adjustmentPct: 5 }, snapshot()).action.targetPrice, 36.75);
  assert.equal(api.validateAction({ type: 'stage_price', productId: 'ghost', adjustmentPct: 5 }, snapshot()).ok, false);
  assert.equal(api.validateAction({ type: 'stage_price', productId: 'p1', adjustmentPct: 99 }, snapshot()).ok, false);
  assert.equal(api.validateAction({ type: 'stage_price', productId: 'p1', adjustmentPct: 5 }, { available: true, companyState: { products: [{ id: 'p1', kind: 'service', price: 35 }] } }).ok, false);
});

test('marketing, strategy, and capacity are bounded staged proposals', () => {
  const api = makeHarness().api;
  const marketing = api.validateAction({ type: 'stage_marketing', factor: 1.25 }, snapshot());
  assert.equal(marketing.ok, true); assert.equal(marketing.action.stagedAmount, 1300);
  assert.equal(api.validateAction({ type: 'stage_marketing', factor: 3 }, snapshot()).ok, false);
  assert.equal(api.validateAction({ type: 'stage_capacity', amount: 50000 }, snapshot()).ok, true);
  assert.equal(api.validateAction({ type: 'stage_capacity', amount: -1 }, snapshot()).ok, false);
  assert.equal(api.validateAction({ type: 'stage_strategy', strategyId: 'premium' }, snapshot()).ok, true);
  assert.equal(api.validateAction({ type: 'stage_strategy', strategyId: 'invented' }, snapshot()).ok, false);
});

test('read-only report and navigation actions are allowlisted', () => {
  const api = makeHarness().api;
  assert.equal(api.validateAction({ type: 'navigate', view: 'finance' }, snapshot()).ok, true);
  assert.equal(api.validateAction({ type: 'navigate', view: 'settings' }, snapshot()).ok, false);
  assert.equal(api.validateAction({ type: 'show_report', reportType: 'cash' }, snapshot()).ok, true);
  assert.equal(api.validateAction({ type: 'show_report', reportType: 'arbitrary' }, snapshot()).ok, false);
});

test('assistant rejects direct transactions, loans, supplier orders, week close, and closure', () => {
  const api = makeHarness().api;
  for (const type of ['loan', 'purchase', 'commit_purchase', 'week_close', 'close_business', 'delete_company', 'stage_supplier_order', 'hire_employee', 'fire_employee']) {
    assert.equal(api.validateAction({ type }, snapshot()).ok, false, `expected ${type} to be rejected`);
  }
});

test('closed or insolvent companies cannot receive staged operating actions; navigation remains available', () => {
  const api = makeHarness().api; const data = snapshot();
  data.companyIdentity.companyStatus = 'closed';
  assert.equal(api.validateAction({ type: 'stage_price', productId: 'p1', adjustmentPct: 5 }, data).ok, false);
  data.companyIdentity.companyStatus = 'active'; data.companyState.realworldLayer9 = { closed: { atWeek: 7 } };
  assert.equal(api.validateAction({ type: 'stage_marketing', factor: 1.25 }, data).ok, false);
  assert.equal(api.validateAction({ type: 'navigate', view: 'finance' }, data).ok, true);
});

test('proposal validation leaves company state unchanged', () => {
  const api = makeHarness().api; const data = snapshot(); const before = JSON.stringify(data);
  api.validateAction({ type: 'stage_price', productId: 'p1', adjustmentPct: -5 }, data);
  api.validateAction({ type: 'stage_marketing', factor: 1.5 }, data);
  api.validateAction({ type: 'stage_strategy', strategyId: 'value' }, data);
  assert.equal(JSON.stringify(data), before);
});

test('sendQuestion posts the company-aware prompt to the configured shared service', async () => {
  const env = makeHarness(); const messages = [];
  env.window.REALWORLD_LAYER10 = mockRuntime(messages);
  let request = null;
  env.context.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return { ok: true, status: 200, json: async () => ({ ok: true, model: 'gemini-3.8-flash', message: { content: 'Use the recorded cash value in the finance panel.' } }) };
  };
  assert.equal(await env.api.sendQuestion('How much cash do I have?'), true);
  assert.equal(request.url, 'https://assistant.example.test/chat');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.credentials, 'omit');
  assert.equal(request.body.messages.at(-1).content, 'How much cash do I have?');
  assert.equal(messages[1].updatedText, 'Use the recorded cash value in the finance panel.');
  assert.equal(env.api.getState().busy, false);
});

test('navigation requested by the player uses the validated native navigation path', async () => {
  const env = makeHarness(); let navigationCount = 0; const messages = [];
  env.context.navSet = () => { navigationCount += 1; };
  env.window.REALWORLD_LAYER10 = mockRuntime(messages);
  env.context.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, message: { content: null, tool_calls: [{ function: { name: 'propose_company_action', arguments: '{"type":"navigate","view":"finance"}' } }] } }) });
  assert.equal(await env.api.sendQuestion('Open the finance section.'), true);
  assert.equal(navigationCount, 1);
  assert.match(messages[1].updatedText, /Opened finance/);
  assert.equal(messages[1].wrapper.children.some((child) => child.className === 'rw12-proposal'), false);
});

test('a financial proposal waits for a separate Stage for review click', async () => {
  const env = makeHarness(); const messages = [];
  env.window.REALWORLD_LAYER10 = mockRuntime(messages);
  env.window.REALWORLD_LAYER11 = { stageCompetitiveProfile(id) { return { ok: true, profile: id }; } };
  env.context.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, message: { content: 'I prepared this option for your review.', tool_calls: [{ function: { name: 'propose_company_action', arguments: '{"type":"stage_strategy","strategyId":"premium"}' } }] } }) });
  assert.equal(await env.api.sendQuestion('Stage premium positioning for me.'), true);
  const card = messages[1].wrapper.children.find((child) => child.className === 'rw12-proposal'); assert.ok(card);
  const stageButton = card.children.find((child) => child.textContent === 'Stage for review'); assert.ok(stageButton);
  assert.equal(typeof stageButton.listeners.click, 'function');
});

test('required game instructions cover company-state accuracy and explicit transaction boundaries', () => {
  const messages = makeHarness().api.appendSystemInstruction([{ role: 'user', content: 'Please advise.' }]);
  assert.match(messages[0].content, /simulation snapshot as the authority/i);
  assert.match(messages[0].content, /player must still use the game/i);
  assert.match(messages[0].content, /Never silently execute/i);
  assert.match(messages[0].content, /purchases, supplier orders, borrowing/i);
});

test('legacy AI identity and advice-only restriction are replaced by Business Partner management guidance', () => {
  const messages = makeHarness().api.appendSystemInstruction([
    { role: 'system', content: 'You are REALWORLD AI, a broadly useful assistant inside a business simulation. You have no tools that can change the game. Never claim you placed orders, hired staff, changed prices, advanced a week, saved data, or changed company finances. You only explain, calculate, and recommend.' },
    { role: 'user', content: 'Help me. [REALWORLD interface context: current screen is finance. The assistant is advisory only; it cannot change the simulation.]' }
  ]);
  assert.doesNotMatch(messages[0].content, /You are REALWORLD AI/i);
  assert.doesNotMatch(messages[0].content, /You have no tools that can change the game/i);
  assert.match(messages[0].content, /You may use only the explicit, validated staged-action tools/i);
  assert.match(messages[0].content, /Do not call yourself an AI/i);
  assert.match(messages[1].content, /Supported management actions can stage existing native form values/i);
  assert.doesNotMatch(messages[1].content, /advisory only; it cannot change the simulation/i);
});
