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
  const window = {};
  const context = vm.createContext({ window, document, console, Intl, Date, Math, Number, String, Object, Array, Set, Map, JSON, RegExp, Promise, AbortController, Event });
  vm.runInContext(source, context, { filename: 'layer12.js', timeout: 10000 });
  return { api: window.REALWORLD_LAYER12, window, document, listeners, context };
}
function snapshot() {
  return { available: true, companyIdentity: { company: 'QA company', companyStatus: 'active' }, companyState: { companyStatus: 'active', marketingBudget: 1000, products: [{ id: 'p1', name: 'Water', kind: 'goods', price: 35 }] } };
}

test('Layer 12 uses Puter user-pays without a developer API key', () => {
  const env = makeHarness();
  assert.equal(env.api.build, 'RW-LAYER-12.0.0 · Company Assistant Consolidation · 2026-10-16');
  assert.equal(env.api.model, 'gpt-5.6-luna');
  assert.equal(env.api.getState().provider, 'puter-user-pays');
  assert.match(source, /https:\/\/js\.puter\.com\/v2\//);
  assert.doesNotMatch(source, /REPLACE_WITH_FIREBASE|firebase-ai\.js|x-goog-api-key/);
});
test('message normalization preserves system instructions and merges adjacent same-role messages', () => {
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
test('marketing and capacity scenarios are bounded proposals only', () => {
  const api = makeHarness().api;
  const marketing = api.validateAction({ type: 'stage_marketing', factor: 1.25 }, snapshot());
  assert.equal(marketing.ok, true); assert.equal(marketing.action.stagedAmount, 1300);
  assert.equal(api.validateAction({ type: 'stage_marketing', factor: 3 }, snapshot()).ok, false);
  assert.equal(api.validateAction({ type: 'stage_capacity', amount: 50000 }, snapshot()).ok, true);
  assert.equal(api.validateAction({ type: 'stage_capacity', amount: -1 }, snapshot()).ok, false);
});
test('assistant rejects loans, purchases, week close, supplier orders, and closure', () => {
  const api = makeHarness().api;
  for (const type of ['loan', 'purchase', 'commit_purchase', 'week_close', 'close_business', 'delete_company', 'stage_supplier_order']) {
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
  assert.equal(JSON.stringify(data), before);
});
test('sendQuestion uses Puter with the built company-aware prompt and displays the answer', async () => {
  const env = makeHarness(); const messages = [];
  env.window.REALWORLD_LAYER10 = {
    buildPrompt(question) { return { messages: [{ role: 'system', content: 'Use current simulation facts.' }, { role: 'user', content: question }], included: true }; },
    addMessage(role, title, text, pending) { const wrapper = { children: [], appendChild(child) { this.children.push(child); } }; const ref = { role, title, text, pending, wrapper }; messages.push(ref); return ref; },
    updateMessage(ref, text, pending) { ref.updatedText = text; ref.pending = pending; }, buildCompanySnapshot: snapshot
  };
  let request = null;
  env.window.puter = { ai: { chat: async (chatMessages, options) => { request = { chatMessages, options }; return { message: { content: 'Use the recorded cash value in the finance panel.' } }; } } };
  assert.equal(await env.api.sendQuestion('How much cash do I have?'), true);
  assert.equal(request.options.model, 'gpt-5.6-luna'); assert.equal(request.options.normalize, true);
  assert.equal(request.chatMessages.at(-1).content, 'How much cash do I have?');
  assert.equal(messages[1].updatedText, 'Use the recorded cash value in the finance panel.'); assert.equal(env.api.getState().busy, false);
});
test('a tool proposal waits for a separate Stage for review click', async () => {
  const env = makeHarness(); let navigationCount = 0;
  env.context.navSet = () => { navigationCount += 1; };
  const messages = [];
  env.window.REALWORLD_LAYER10 = {
    buildPrompt(question) { return { messages: [{ role: 'system', content: 'Game snapshot' }, { role: 'user', content: question }] }; },
    addMessage(role, title, text) { const wrapper = { children: [], appendChild(child) { this.children.push(child); } }; const ref = { role, title, text, wrapper }; messages.push(ref); return ref; },
    updateMessage(ref, text) { ref.updatedText = text; }, buildCompanySnapshot: snapshot
  };
  env.window.puter = { ai: { chat: async () => ({ message: { content: null, tool_calls: [{ function: { name: 'propose_company_action', arguments: '{"type":"navigate","view":"finance"}' } }] } }) } };
  assert.equal(await env.api.sendQuestion('Open the finance section.'), true); assert.equal(navigationCount, 0);
  const card = messages[1].wrapper.children.find((child) => child.className === 'rw12-proposal'); assert.ok(card);
  const stageButton = card.children.find((child) => child.textContent === 'Stage for review'); assert.ok(stageButton);
  stageButton.listeners.click(); assert.equal(navigationCount, 1);
});
test('system instruction requires review and prohibits silent transaction execution', () => {
  const messages = makeHarness().api.appendSystemInstruction([{ role: 'user', content: 'Please advise.' }]);
  assert.match(messages[0].content, /cannot directly write game saves/i);
  assert.match(messages[0].content, /separate player click/i);
  assert.match(messages[0].content, /Never propose a loan, purchase, supplier order, week-close/i);
});
