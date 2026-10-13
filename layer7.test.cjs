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
  const window = { setTimeout: (_fn) => 1, clearTimeout: () => {} };
  const context = vm.createContext({
    console, document, window, localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    window,
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
  return { context, company, storage, nodes, window, document, get navigated() { return navigated; }, get renderViewCalls() { return renderViewCalls; } };
}

test('Layer 8 add-on preserves Layer 7 visuals and initializes the universal AI Guide', () => {
  const env = makeHarness();
  assert.equal(env.context.window.REALWORLD_LAYER8.build, 'RW-LAYER-8.0 · Universal AI Business Assistant · 2026-10-13');
  assert.ok(env.nodes.get('#rw7-guide-panel'));
  assert.ok(env.nodes.get('#rw7-guide-fab'));
  assert.ok(env.nodes.get('#rw7-theme-toggle'));
  assert.match(env.nodes.get('.brand-build').textContent, /RW-LAYER-8\.0/);
  assert.equal(env.nodes.get('meta[name="application-version"]').attributes.content, env.context.window.REALWORLD_LAYER8.build);
  assert.ok(env.nodes.get('#rw8-ai-model'));
  assert.ok(env.nodes.get('#rw8-share-company'));
  assert.ok(env.nodes.get('#rw8-web-search'));
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
  const answer = env.context.window.REALWORLD_LAYER8.guideAnswer('Why is my cash decreasing?');
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
  const items = env.context.window.REALWORLD_LAYER8.milestoneList();
  assert.equal(items.find((item) => item.id === 'first-week').earned, true);
  assert.equal(items.find((item) => item.id === 'first-revenue').earned, true);
  assert.equal(items.find((item) => item.id === 'supplier-delivery').earned, true);
  assert.equal(items.find((item) => item.id === 'four-weeks').earned, false);
  assert.equal(items.find((item) => item.id === 'balanced-books').earned, true);
  assert.equal(JSON.stringify(env.company), before, 'Milestone evaluation must not mutate company state');
  assert.match(env.context.window.REALWORLD_LAYER8.renderMilestones(), /do not award money/i);
});

test('appearance preference is separate from company records and toggles safely', () => {
  const env = makeHarness();
  const before = JSON.stringify(env.company);
  assert.equal(env.context.window.REALWORLD_LAYER8.themePreference(), 'soft-dark');
  env.context.window.REALWORLD_LAYER8.toggleTheme();
  assert.equal(env.nodes.get('body').dataset.theme, 'warm-light');
  assert.equal(env.context.window.REALWORLD_LAYER8.themePreference(), 'warm-light');
  assert.equal(JSON.stringify(env.company), before, 'Theme changes must not modify company records');
  assert.equal(env.storage.get('realworld-theme-preference-v1'), 'warm-light');
});

test('Puter is lazy-loaded only when the Guide opens; the add-on exposes no transaction actions', () => {
  const env = makeHarness();
  assert.equal(env.document.head.children.filter(node => String(node.src || '') === 'https://js.puter.com/v2/').length, 0, 'Do not load third-party AI code at startup');
  assert.match(source, /https:\/\/js\.puter\.com\/v2\//);
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket/i);
  assert.doesNotMatch(source, /\bsaveGame\s*\(|\bmakeEntry\s*\(|\bplacePurchaseOrder\s*\(/);
  assert.match(source, /cannot execute orders or change saved company records/i);
  assert.match(source, /safeEscape\(message\.text\)/);
  assert.match(source, /sdk\.ai\.chat\(prompt\.messages, false, options\)/);
});


test('company snapshot is opt-in, compact, and excludes company and employee names', () => {
  const env = makeHarness();
  const runtime = env.window.REALWORLD_LAYER8;
  const without = runtime.buildAIMessageList('Explain my margins', [], false);
  assert.equal(without.snapshotIncluded, false);
  assert.doesNotMatch(without.messages.at(-1).content, /REALWORLD company snapshot/i);
  assert.match(without.messages.at(-1).content, /current screen is Dashboard/i);
  const withData = runtime.buildAIMessageList('Analyze current operations', [], true);
  assert.equal(withData.snapshotIncluded, true);
  assert.match(withData.messages.at(-1).content, /REALWORLD company snapshot/i);
  assert.match(withData.messages.at(-1).content, /"cash":85000/);
  assert.match(withData.messages.at(-1).content, /"week":5/);
  assert.doesNotMatch(withData.messages.at(-1).content, /QA Leaf Trading/);
  assert.doesNotMatch(withData.messages.at(-1).content, /founder|employeeName|customerName/i);
  assert.ok(withData.messages.length >= 2);
});

test('company snapshot preserves missing forecast values as unknown instead of inventing zero', () => {
  const env = makeHarness();
  env.context.computeWorkingCapitalForecast = () => ({
    historyAvailable: false, historyWeeks: null, averageWeeklyNet: null,
    cashRunwayWeeks: null, reserveBreachWeek: null, scenarioLabel: ''
  });
  const snapshot = env.window.REALWORLD_LAYER8.buildCompanySnapshot();
  assert.equal(snapshot.workingCapitalForecast.historyWeeks, null);
  assert.equal(snapshot.workingCapitalForecast.averageWeeklyNet, null);
  assert.equal(snapshot.workingCapitalForecast.cashRunwayWeeks, null);
  assert.equal(snapshot.workingCapitalForecast.reserveBreachWeek, null);
});

test('AI message builder preserves recent role-based context and system accuracy rules', () => {
  const env = makeHarness();
  const messages = env.window.REALWORLD_LAYER8.buildAIMessageList('What next?', [
    { role: 'user', text: 'My shop is slow' },
    { role: 'assistant', title: 'REALWORLD AI', body: 'Check foot traffic and margins.' }
  ], false).messages;
  assert.equal(messages[0].role, 'system');
  assert.match(messages[0].content, /Prioritize accuracy over confidence/);
  assert.equal(messages.slice(1).map(m => m.role).join(','), 'user,assistant,user');
  assert.match(messages[1].content, /My shop is slow/);
  assert.match(messages[2].content, /Check foot traffic/);
  assert.match(messages[3].content, /What next/);
});

test('failed local fallback text is not misrepresented as a prior AI answer in later context', () => {
  const env = makeHarness();
  const built = env.window.REALWORLD_LAYER8.buildAIMessageList('Try again', [
    { role: 'user', text: 'First question' },
    { role: 'assistant', title: 'Built-in Guide fallback · AI unavailable', body: 'This came from the local Guide, not AI.' },
    { role: 'assistant', title: 'REALWORLD AI · GPT-6.1 Sol · Balanced', body: 'A prior actual AI answer.' }
  ], false);
  const transcript = built.messages.map((message) => message.content).join('\n');
  assert.doesNotMatch(transcript, /This came from the local Guide/);
  assert.match(transcript, /A prior actual AI answer/);
});

test('response parser supports the documented Puter response shapes', () => {
  const env = makeHarness();
  const parse = env.window.REALWORLD_LAYER8.extractResponseText;
  assert.equal(parse('plain text'), 'plain text');
  assert.equal(parse({ message: { content: 'message text' } }), 'message text');
  assert.equal(parse({ message: { content: [{ type: 'text', text: 'hello ' }, { type: 'reasoning', text: 'hidden reasoning' }, { type: 'text', text: 'world' }] } }), 'hello world');
  assert.equal(parse({ text: 'stream fallback' }), 'stream fallback');
});

test('Puter SDK is loaded only after opening Guide, then announces ready status', async () => {
  const env = makeHarness();
  const runtime = env.window.REALWORLD_LAYER8;
  assert.equal(env.document.head.children.filter(node => String(node.src || '') === 'https://js.puter.com/v2/').length, 0);
  runtime.openGuide();
  const scripts = env.document.head.children.filter(node => String(node.src || '') === 'https://js.puter.com/v2/');
  assert.equal(scripts.length, 1);
  const script = scripts[0];
  assert.equal(script.src, 'https://js.puter.com/v2/');
  env.window.puter = { ai: { chat: () => Promise.resolve('unused') } };
  script.onload();
  await runtime.loadPuterSDK(false);
  assert.equal(runtime.getAIState().loadState, 'ready');
  assert.match(env.nodes.get('#rw8-ai-status').textContent, /Puter AI ready/);
});

test('streaming AI answers use Puter messages-array signature and do not mutate company state', async () => {
  const env = makeHarness();
  const before = JSON.stringify(env.company);
  let receivedMessages;
  let receivedTestMode;
  let receivedOptions;
  env.window.puter = { ai: { chat: (messages, testMode, options) => {
    receivedMessages = messages;
    receivedTestMode = testMode;
    receivedOptions = options;
    return Promise.resolve((async function* () {
      yield { type: 'text', text: 'Use a ' };
      yield { type: 'text', text: 'small test.' };
    })());
  } } };
  const result = await env.window.REALWORLD_LAYER8.sendGuideQuestion('How should I test a price change?');
  assert.equal(receivedTestMode, false);
  assert.equal(receivedMessages[0].role, 'system');
  assert.equal(receivedMessages.at(-1).role, 'user');
  assert.equal(receivedOptions.model, 'openai/gpt-6.1-sol');
  assert.equal(receivedOptions.stream, true);
  assert.equal(receivedOptions.reasoning_effort, 'high');
  assert.equal(result, undefined);
  const runtime = env.window.REALWORLD_LAYER8;
  assert.equal(runtime.getAIState().busy, false);
  const rendered = env.nodes.get('#rw7-guide-messages').innerHTML;
  assert.match(rendered, /Use a small test\./);
  assert.match(rendered, /REALWORLD AI/);
  assert.equal(JSON.stringify(env.company), before, 'AI chat must not change company state');
});

test('streamed reasoning and non-text chunks are not shown to the player', async () => {
  const env = makeHarness();
  const before = JSON.stringify(env.company);
  env.window.puter = { ai: { chat: () => Promise.resolve((async function* () {
    yield { type: 'reasoning', text: 'private reasoning should not display' };
    yield { type: 'text', text: 'Here is the answer.' };
    yield { type: 'tool_use', text: 'tool payload should not display' };
  })()) } };
  await env.window.REALWORLD_LAYER8.sendGuideQuestion('Give me a brief answer');
  const bodies = env.nodes.get('#rw7-guide-messages').innerHTML;
  assert.match(bodies, /Here is the answer\./);
  assert.doesNotMatch(bodies, /private reasoning should not display|tool payload should not display/);
  assert.equal(JSON.stringify(env.company), before, 'An AI response must not mutate company state');
});

test('web search is opt-in and uses documented tool shape', async () => {
  const env = makeHarness();
  env.nodes.get('#rw8-web-search').checked = true;
  let receivedOptions;
  env.window.puter = { ai: { chat: (_messages, _testMode, options) => {
    receivedOptions = options;
    return Promise.resolve((async function* () { yield { type: 'text', text: 'Found current sources.' }; })());
  } } };
  await env.window.REALWORLD_LAYER8.sendGuideQuestion('What is the latest guidance on this topic?');
  assert.equal(receivedOptions.tools.length, 1);
  assert.equal(receivedOptions.tools[0].type, 'web_search');
});

test('failed AI response is clearly labelled fallback and does not modify finances', async () => {
  const env = makeHarness();
  const before = JSON.stringify(env.company);
  env.window.puter = { ai: { chat: () => Promise.reject(new Error('network timeout')) } };
  await env.window.REALWORLD_LAYER8.sendGuideQuestion('Why is my cash decreasing?');
  const messages = env.nodes.get('#rw7-guide-messages').innerHTML;
  assert.match(messages, /Built-in Guide fallback/);
  assert.match(messages, /AI connection failed|AI status|connection failed/i);
  assert.equal(JSON.stringify(env.company), before);
  assert.equal(env.window.REALWORLD_LAYER8.getAIState().busy, false);
});

test('AI and user text are rendered as text, not executable HTML', async () => {
  const env = makeHarness();
  env.window.puter = { ai: { chat: () => Promise.resolve((async function* () {
    yield { type: 'text', text: '<img src=x onerror=alert(1)>' };
  })()) } };
  await env.window.REALWORLD_LAYER8.sendGuideQuestion('<script>alert(1)</script>');
  const html = env.nodes.get('#rw7-guide-messages').innerHTML;
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
