
/*
 * REALWORLD Layer 12.0 — Company Assistant Consolidation
 * Gemini 3.8 Flash via Firebase AI Logic when configured; optional personal Gemini API key is session-only.
 * The assistant can advise, navigate, and stage supported changes for review. It never commits transactions.
 */
(function realworldLayer12() {
  'use strict';
  const BUILD = 'RW-LAYER-12.0.0 · Company Assistant Consolidation · 2026-10-16';
  const MODEL = 'gemini-3.8-flash';
  const KEY_SESSION = 'rw_company_assistant_personal_key_session_v1';
  const APP_NAME = 'realworld-company-assistant';
  const MAX_OUTPUT = 24000;
  const ACTION_TOOLS = [{ functionDeclarations: [{
    name: 'propose_company_action',
    description: 'Propose one non-committing REALWORLD UI action for the player to review. This function never executes or saves the action.',
    parameters: { type: 'OBJECT', properties: {
      type: { type: 'STRING', enum: ['stage_price','stage_marketing','stage_capacity','stage_supplier_order','navigate'] },
      productId: { type: 'STRING', description: 'Existing product ID from the supplied company snapshot.' },
      adjustmentPct: { type: 'INTEGER', enum: [-10,-5,5,10] },
      factor: { type: 'NUMBER', enum: [0.75,1.25,1.5] },
      amount: { type: 'NUMBER', description: 'Proposed capacity investment amount in company currency.' },
      supplierId: { type: 'STRING', description: 'Exact supplier ID from the available reorder-prefill context.' },
      quantity: { type: 'INTEGER', description: 'Exact integer quantity from the available reorder-prefill context.' },
      view: { type: 'STRING', enum: ['dashboard','operations','market','people','finance','risk','reports'] }
    }, required: ['type'] }
  }] }];
  let initialized = false;
  let busy = false;
  let seq = 0;
  let firebasePromise = null;
  let observer = null;
  const proposals = new Map();
  let proposalSequence = 0;
  function companyToken(company) { return company ? String(company.companyId || company.id || '') + '|' + String(company.company || '') + '|' + String(company.businessTemplateId || company.businessModel || '') : ''; }

  const $ = (selector, root) => { try { return (root || document).querySelector(selector); } catch (_) { return null; } };
  const list = (value) => Array.isArray(value) ? value : [];
  const safeText = (value, max = 500) => String(value == null ? '' : value).slice(0, max);
  const validFirebaseConfig = (config) => !!(config && typeof config === 'object' &&
    config.apiKey && !String(config.apiKey).startsWith('REPLACE_') && config.authDomain &&
    config.projectId && !String(config.projectId).startsWith('REPLACE_') && config.appId &&
    !String(config.appId).startsWith('REPLACE_'));
  const hasFirebaseConfig = () => validFirebaseConfig(window.REALWORLD_FIREBASE_CONFIG) &&
    !!window.REALWORLD_FIREBASE_APPCHECK_SITE_KEY && !String(window.REALWORLD_FIREBASE_APPCHECK_SITE_KEY).startsWith('REPLACE_');
  function getSessionKey() {
    try { return String(window.sessionStorage.getItem(KEY_SESSION) || '').trim(); } catch (_) { return ''; }
  }
  function setSessionKey(value) {
    try { if (value) window.sessionStorage.setItem(KEY_SESSION, value); else window.sessionStorage.removeItem(KEY_SESSION); return true; }
    catch (_) { return false; }
  }
  function normalizeMessages(messages) {
    const source = list(messages).filter((m) => m && typeof m === 'object');
    const system = source.filter((m) => m.role === 'system').map((m) => String(m.content || '')).filter(Boolean).join('\n\n');
    let contents = source.filter((m) => m.role !== 'system').map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.content == null ? '' : m.content).slice(0, 70000) }]
    })).filter((m) => m.parts[0].text.trim());
    while (contents.length && contents[0].role !== 'user') contents.shift();
    const merged = [];
    for (const item of contents) {
      const previous = merged[merged.length - 1];
      if (previous && previous.role === item.role) previous.parts[0].text += '\n\n' + item.parts[0].text;
      else merged.push(item);
    }
    contents = merged;
    if (!contents.length || contents[contents.length - 1].role !== 'user') throw new Error('The request has no final user message. Please try again.');
    return { systemInstruction: system, contents };
  }
  function parseActionMarker(text) {
    const source = String(text || '');
    const match = source.match(/\[\[RW_ACTION:(\{[\s\S]*?\})\]\]\s*$/);
    if (!match) return { text: source.trim(), action: null, error: null };
    try {
      const action = JSON.parse(match[1]);
      return { text: source.slice(0, match.index).trim(), action, error: null };
    } catch (_) {
      return { text: source.slice(0, match.index).trim(), action: null, error: 'The suggested action could not be read. No change was staged.' };
    }
  }
  function validateAction(action, company) {
    if (!action || typeof action !== 'object' || Array.isArray(action)) return { ok: false, reason: 'No valid action was supplied.' };
    const type = String(action.type || '');
    const products = list(company && company.products);
    if (type === 'stage_price') {
      const id = safeText(action.productId, 120);
      const pct = Number(action.adjustmentPct);
      if (!products.some((p) => p && String(p.id) === id)) return { ok: false, reason: 'That product is not in the active company.' };
      if (![-10, -5, 5, 10].includes(pct)) return { ok: false, reason: 'The requested price adjustment is outside the supported scenario choices.' };
      return { ok: true, action: { type, productId: id, adjustmentPct: pct }, summary: `Preview a ${pct > 0 ? '+' : ''}${pct}% price scenario for ${safeText(products.find(p => String(p.id) === id).name || id, 100)}. This only stages the existing price field.` };
    }
    if (type === 'stage_marketing') {
      const factor = Number(action.factor);
      if (![0.75, 1.25, 1.5].includes(factor)) return { ok: false, reason: 'The requested marketing change is outside supported scenario choices.' };
      return { ok: true, action: { type, factor }, summary: `Stage a ${Math.round((factor - 1) * 100)}% weekly marketing budget scenario. It will not be saved automatically.` };
    }
    if (type === 'stage_capacity') {
      const amount = Number(action.amount);
      if (!Number.isFinite(amount) || amount < 1000 || amount > 100000000 || Math.round(amount * 100) !== amount * 100) return { ok: false, reason: 'The proposed capacity amount is invalid or outside safe bounds.' };
      return { ok: true, action: { type, amount }, summary: `Prefill a capacity investment of ${amount.toLocaleString('en-PH', {maximumFractionDigits:2})}. The game's native confirmation remains required.` };
    }
    if (type === 'stage_supplier_order') {
      const id = safeText(action.productId, 120), supplierId = safeText(action.supplierId, 120), quantity = Number(action.quantity);
      if (!products.some((p) => p && String(p.id) === id)) return { ok: false, reason: 'That product is not in the active company.' };
      if (!supplierId || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) return { ok: false, reason: 'The supplier order proposal has invalid supplier or quantity details.' };
      return { ok: true, action: { type, productId: id, supplierId, quantity }, summary: `Prefill a supplier reorder for ${quantity.toLocaleString('en-PH')} units. You must review the supplier, total cost, cash impact, and native order form before placing it.` };
    }
    if (type === 'navigate') {
      const view = String(action.view || '');
      if (!['dashboard','operations','market','people','finance','risk','reports'].includes(view)) return { ok: false, reason: 'That destination is not supported.' };
      return { ok: true, action: { type, view }, summary: `Open the ${view} section. This does not change company data.` };
    }
    return { ok: false, reason: 'This action type is not supported. Purchases, loans, week-close, and business closure must always use the game’s native controls.' };
  }
  function appendSystemInstruction(messages, includeAvailableActions = false) {
    const copy = list(messages).map((m) => ({ role: String(m.role || 'user'), content: String(m.content || '') }));
    const instruction = [
      'You are the Company Assistant inside REALWORLD Business Simulation. Be practical, calm, precise, and conversational. Use only facts in the supplied simulation snapshot; distinguish recorded facts, estimates, and missing data. Do not invent company values, real-world facts, or actions completed.',
      'You may advise, explain, inspect the provided company snapshot, and suggest navigation. You cannot directly mutate the game or commit a purchase, supplier order, loan, investment, price, marketing budget, week close, or business closure. Native game controls and their confirmation flows must remain in control.',
      'When the user clearly asks for a supported non-committing staged action, use the propose_company_action function tool rather than pretending the action is completed. Use only exact product/supplier IDs and quantities present in supplied context. Only propose an action when clearly requested, not for ordinary advice. The application validates the proposal and asks the player to click a separate Stage button; the function itself has no side effects.',
      'Do not propose or emit action markers for committing/confirming purchases, loans, week close, deletion, or closure. If the request is consequential, explain how to review it in the native UI instead. Never claim that a staged value is saved.'
    ].join('\n');
    const supplierActions = includeAvailableActions ? Array.from(document.querySelectorAll('[data-action=\"prefill-reorder\"]')).map((el) => ({ productId: el.getAttribute('data-id'), supplierId: el.getAttribute('data-supplier-id'), quantity: Number(el.getAttribute('data-quantity')), label: safeText(el.textContent, 120) })).filter((item) => item.productId && item.supplierId && Number.isInteger(item.quantity) && item.quantity > 0).slice(0, 40) : [];
    const actionContext = supplierActions.length ? '\n\nAvailable supplier reorder prefills already present in the UI (use only these exact IDs and quantities): ' + JSON.stringify(supplierActions) : '';
    const system = copy.find((m) => m.role === 'system');
    if (system) system.content += '\n\n' + instruction + actionContext;
    else copy.unshift({ role: 'system', content: instruction + actionContext });
    return copy;
  }
  async function getFirebaseRuntime() {
    if (!hasFirebaseConfig()) throw new Error('The shared assistant service is not configured yet. Add your Firebase Web App config and reCAPTCHA Enterprise site key to firebase-config.js, or choose your personal Gemini key for this session.');
    if (!firebasePromise) firebasePromise = (async () => {
      const version = '12.5.0';
      const [appSdk, aiSdk, checkSdk] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-ai.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-app-check.js`)
      ]);
      const config = window.REALWORLD_FIREBASE_CONFIG;
      const existing = appSdk.getApps().find((app) => app.name === APP_NAME);
      const app = existing || appSdk.initializeApp(config, APP_NAME);
      if (!window.__REALWORLD_COMPANY_ASSISTANT_APPCHECK_READY__) {
        checkSdk.initializeAppCheck(app, {
          provider: new checkSdk.ReCaptchaEnterpriseProvider(window.REALWORLD_FIREBASE_APPCHECK_SITE_KEY),
          isTokenAutoRefreshEnabled: true
        });
        window.__REALWORLD_COMPANY_ASSISTANT_APPCHECK_READY__ = true;
      }
      const ai = aiSdk.getAI(app, { backend: new aiSdk.GoogleAIBackend() });
      return { aiSdk, ai };
    })().catch((error) => { firebasePromise = null; throw error; });
    return firebasePromise;
  }
  function extractRestResponse(data) {
    const candidates = list(data && data.candidates);
    const parts = candidates.flatMap((candidate) => list(candidate && candidate.content && candidate.content.parts));
    const call = parts.find((part) => part && part.functionCall && part.functionCall.name === 'propose_company_action');
    if (call && call.functionCall && call.functionCall.args && typeof call.functionCall.args === 'object') return '[[RW_ACTION:' + JSON.stringify(call.functionCall.args) + ']]';
    return parts.map((part) => typeof part.text === 'string' ? part.text : '').join('').trim();
  }
  function extractRestText(data) { return extractRestResponse(data).replace(/^\[\[RW_ACTION:[\s\S]*\]\]$/, '').trim(); }
  async function askPersonalKey(messages, key, signal) {
    if (!key || key.length < 15) throw new Error('Enter a valid Gemini API key, then choose Use for this session.');
    const normalized = normalizeMessages(messages);
    const body = { contents: normalized.contents, tools: ACTION_TOOLS, generationConfig: { maxOutputTokens: 1600, temperature: 0.55 } };
    if (normalized.systemInstruction) body.systemInstruction = { parts: [{ text: normalized.systemInstruction }] };
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body), signal
    });
    let data = null; try { data = await response.json(); } catch (_) {}
    if (!response.ok) {
      const message = safeText(data && data.error && data.error.message || `Gemini returned HTTP ${response.status}.`, 300);
      if (response.status === 400 || response.status === 401 || response.status === 403) throw new Error('Gemini rejected the personal key or request. Check the key, API access, and model availability.');
      if (response.status === 429) throw new Error('Gemini rate limit or quota reached for this key. Wait or check your Google AI quota.');
      throw new Error(message);
    }
    return extractRestResponse(data);
  }
  async function askFirebase(messages, signal) {
    const normalized = normalizeMessages(messages);
    const runtime = await getFirebaseRuntime();
    const model = runtime.aiSdk.getGenerativeModel(runtime.ai, {
      model: MODEL, tools: ACTION_TOOLS,
      ...(normalized.systemInstruction ? { systemInstruction: normalized.systemInstruction } : {})
    });
    const result = await model.generateContent(normalized.contents, { signal });
    const response = result && result.response;
    const calls = response && typeof response.functionCalls === 'function' ? response.functionCalls() : [];
    if (Array.isArray(calls) && calls.length && calls[0].name === 'propose_company_action' && calls[0].args) return '[[RW_ACTION:' + JSON.stringify(calls[0].args) + ']]';
    return response && typeof response.text === 'function' ? response.text() : '';
  }
  function setStatus(text, state = 'idle') {
    const el = $('#rw12-provider-status') || $('#rw10-assistant-status') || $('#rw8-ai-status');
    if (el) { el.textContent = String(text); if (el.dataset) el.dataset.state = state; }
  }
  function providerMode() { const mode = $('#rw12-provider-mode'); return mode ? mode.value : (hasFirebaseConfig() ? 'shared' : 'personal'); }
  function showProviderStatus() {
    const mode = providerMode();
    const key = getSessionKey();
    const shared = $('#rw12-provider-mode option[value="shared"]');
    if (shared) shared.disabled = !hasFirebaseConfig();
    const status = $('#rw12-provider-status');
    if (!status) return;
    if (mode === 'shared' && hasFirebaseConfig()) status.textContent = 'Shared service configured · Gemini 3.8 Flash · usage is subject to project/provider quotas and App Check.';
    else if (mode === 'shared') status.textContent = 'Shared service setup needed. Configure Firebase AI Logic and App Check, or use a personal key for this session.';
    else status.textContent = key ? 'Personal key is active for this browser tab session. Google quota and billing rules apply.' : 'No personal key is active. Enter a Gemini API key below, or configure the shared service.';
  }
  function addStyles() {
    if ($('#rw12-styles')) return;
    const style = document.createElement('style'); style.id = 'rw12-styles';
    style.textContent = `.rw12-settings{padding:9px 12px;border-top:1px solid var(--line);background:var(--panel);font-size:11px;color:var(--text)}.rw12-settings summary{cursor:pointer;font-weight:800;padding:5px 0}.rw12-settings label{display:block;margin:8px 0 4px;color:var(--muted)}.rw12-settings select,.rw12-settings input{min-width:0;max-width:100%;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);padding:8px;font:inherit}.rw12-settings select{width:100%}.rw12-key-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.rw12-key-row input{flex:1 1 180px}.rw12-key-row button,.rw12-proposal button{border:1px solid var(--line);border-radius:8px;background:var(--accent);color:var(--bg);padding:7px 9px;font:inherit;font-weight:800;cursor:pointer}.rw12-settings p{font-size:10px;line-height:1.5;color:var(--muted);overflow-wrap:anywhere}.rw12-settings .rw12-privacy{margin-bottom:4px}.rw12-settings #rw12-clear-chat{border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--text);padding:6px 9px;font:inherit;font-weight:750;cursor:pointer}.rw12-proposal{margin-top:9px;padding:9px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}.rw12-proposal p{margin:0 0 8px}.rw12-proposal small{display:block;margin-top:6px;color:var(--muted);font-size:10px}.rw8-ai-controls[hidden]{display:none!important}@media(max-width:480px){.rw12-key-row{display:grid;grid-template-columns:1fr}.rw12-key-row input{width:100%}}`;
    (document.head || document.documentElement).appendChild(style);
  }
  function addProviderSettings() {
    const panel = $('#rw7-guide-panel');
    if (!panel || $('#rw12-provider-settings')) return;
    const form = $('#rw7-guide-form', panel);
    if (!form || !form.insertAdjacentHTML) return;
    form.insertAdjacentHTML('beforebegin', `
      <details id="rw12-provider-settings" class="rw12-settings">
        <summary>Assistant connection &amp; privacy</summary>
        <label for="rw12-provider-mode">Connection</label>
        <select id="rw12-provider-mode"><option value="shared">Shared service (Firebase)</option><option value="personal">My Gemini API key (this session)</option></select>
        <div class="rw12-key-row"><input id="rw12-personal-key" type="password" autocomplete="off" spellcheck="false" placeholder="Paste personal Gemini API key" aria-label="Personal Gemini API key"><button type="button" id="rw12-use-key">Use for this session</button><button type="button" id="rw12-clear-key">Clear</button></div>
        <p id="rw12-provider-status" role="status" aria-live="polite"></p>
        <button type="button" id="rw12-clear-chat">Clear conversation</button>
        <p class="rw12-privacy">With full company context enabled, the available simulated company data is sent to the selected provider. The shared service uses your configured Firebase project and App Check; the personal option sends requests directly to Google using your key. A personal key is kept in session storage only and is not written to the company save or local storage. Do not enter a key on a shared/public device. Quotas are limited, not unlimited.</p>
      </details>`);
    const mode = $('#rw12-provider-mode');
    if (mode) {
      mode.value = hasFirebaseConfig() ? 'shared' : (getSessionKey() ? 'personal' : 'shared');
      mode.addEventListener('change', showProviderStatus);
    }
    const keyInput = $('#rw12-personal-key');
    const use = $('#rw12-use-key');
    const clear = $('#rw12-clear-key');
    if (use) use.addEventListener('click', () => {
      const value = String(keyInput && keyInput
