/* REALWORLD Layer 8.2 — Business Desk polish.
 * Additive presentation layer: leaves the pinned business engine and Layer 8.1 assistant logic untouched.
 * This file formats advisor replies safely, provides named profiles, and improves small-screen controls.
 */
(function realworldLayer82() {
  'use strict';

  const BUILD_LABEL = 'RW-LAYER-8.2 · Business Desk · Clear Answers & Responsive Advisor Controls · 2026-10-14';
  const PROFILES = [
    { id: 'openai/gpt-6.1-sol', name: 'Mara', role: 'Business Guide', style: 'Practical guidance and clear next steps.', oldLabel: 'GPT-6.1 Sol · Balanced' },
    { id: 'openai/gpt-6-astra', name: 'Darius', role: 'Strategy Planner', style: 'Longer-term plans, trade-offs, and risks.', oldLabel: 'GPT-6 Astra · Advanced' },
    { id: 'openai/gpt-6-luna', name: 'Lina', role: 'Quick Guide', style: 'Concise, plain-language answers.', oldLabel: 'GPT-6 Luna · Lightweight' },
    { id: 'openai/gpt-oss-120b', name: 'Theo', role: 'Research Analyst', style: 'Structured analysis and evidence-aware research.', oldLabel: 'GPT-OSS 120B · Open-weight' }
  ];
  let observer = null;
  let menuOpen = false;
  let initialized = false;

  const css = `
  .rw82-advisor-row{display:grid;grid-template-columns:94px minmax(0,1fr);align-items:start;gap:8px;font-size:12px;color:var(--muted);margin:2px 0 4px}
  .rw82-advisor-label{padding-top:12px;font-weight:800}
  .rw82-advisor-picker{position:relative;min-width:0}
  .rw82-advisor-trigger{width:100%;min-height:44px;text-align:left;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--text);padding:10px 12px;font:inherit;font-size:12px;font-weight:850;cursor:pointer;touch-action:manipulation}
  .rw82-advisor-trigger:focus-visible,.rw82-advisor-option:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
  .rw82-advisor-menu{position:absolute;z-index:260;left:0;right:0;top:calc(100% + 5px);display:grid;gap:4px;padding:6px;border:1px solid var(--line);border-radius:12px;background:var(--panel);box-shadow:0 12px 30px #0005}
  .rw82-advisor-menu[hidden]{display:none!important}
  .rw82-advisor-option{display:grid;gap:2px;width:100%;min-height:46px;text-align:left;border:1px solid transparent;border-radius:8px;padding:8px 10px;background:transparent;color:var(--text);font:inherit;cursor:pointer;touch-action:manipulation}
  .rw82-advisor-option span{font-size:12px;font-weight:850}.rw82-advisor-option small{font-size:10px;line-height:1.4;color:var(--muted)}
  .rw82-advisor-option:hover,.rw82-advisor-option[aria-checked="true"]{background:var(--panel2);border-color:var(--line)}.rw82-advisor-option[aria-checked="true"] span{color:var(--accent)}
  .rw8-ai-model-row[hidden]{display:none!important}
  .rw82-rich{white-space:normal;overflow-wrap:anywhere;line-height:1.65}
  .rw82-rich p{margin:0 0 9px}.rw82-rich p:last-child{margin-bottom:0}
  .rw82-rich h1,.rw82-rich h2,.rw82-rich h3,.rw82-rich h4{line-height:1.28;margin:12px 0 6px;font-weight:850;color:var(--text)}.rw82-rich h1{font-size:17px}.rw82-rich h2{font-size:15px}.rw82-rich h3{font-size:13px}.rw82-rich h4{font-size:12px}
  .rw82-rich ul,.rw82-rich ol{margin:5px 0 10px;padding-left:21px}.rw82-rich li{padding-left:2px;margin:3px 0}
  .rw82-rich blockquote{margin:7px 0 10px;padding:5px 0 5px 11px;border-left:3px solid var(--accent);color:var(--muted)}
  .rw82-rich pre{max-width:100%;overflow:auto;white-space:pre;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);font-size:11px}
  .rw82-rich code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.95em;background:var(--bg);border:1px solid var(--line);border-radius:4px;padding:1px 4px}.rw82-rich pre code{padding:0;border:0;background:transparent}
  .rw82-table-wrap{max-width:100%;overflow-x:auto;margin:8px 0 10px;border:1px solid var(--line);border-radius:8px}.rw82-rich table{width:100%;min-width:220px;border-collapse:collapse;font-size:11px}.rw82-rich th,.rw82-rich td{padding:7px 8px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line);overflow-wrap:anywhere}.rw82-rich th{font-weight:850;background:var(--panel)}.rw82-rich tr:last-child td{border-bottom:0}.rw82-rich a{color:var(--blue);text-decoration:underline;overflow-wrap:anywhere}
  @media(max-width:760px){.rw82-advisor-row{grid-template-columns:1fr;gap:5px}.rw82-advisor-label{padding-top:0}.rw82-advisor-trigger{min-height:46px}.rw82-advisor-option{min-height:48px}.rw8-ai-options summary{min-height:42px;display:flex;align-items:center}.rw8-ai-disclosure{font-size:10px}}
  @media(max-width:380px){.rw82-advisor-trigger{padding:11px;font-size:12px}.rw82-rich table{font-size:10px}.rw82-rich th,.rw82-rich td{padding:6px}}
  @media(pointer:coarse){.rw82-advisor-trigger,.rw82-advisor-option,.rw8-ai-connect,.rw8-ai-retry,.rw8-ai-options summary,.rw7-guide-form button{min-height:44px}}
  `;

  function query(selector, root) { return (root || document).querySelector(selector); }
  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }
  function renderInline(value) {
    const input = String(value == null ? '' : value);
    const tick = String.fromCharCode(96);
    const pattern = new RegExp('(\\[([^\\]]+)\\]\\((https?:\\/\\/[^\\s)]+)\\)|' + tick + '([^' + tick + '\\n]+)' + tick + '|\\*\\*([^*\\n]+)\\*\\*|__([^_\\n]+)__|\\*([^*\\n]+)\\*|_([^_\\n]+)_)', 'g');
    let output = '';
    let last = 0;
    let match;
    while ((match = pattern.exec(input))) {
      output += escapeHTML(input.slice(last, match.index));
      if (match[2] !== undefined && match[3] !== undefined) {
        output += '<a href="' + escapeHTML(match[3]) + '" target="_blank" rel="noopener noreferrer">' + escapeHTML(match[2]) + '</a>';
      } else if (match[4] !== undefined) output += '<code>' + escapeHTML(match[4]) + '</code>';
      else if (match[5] !== undefined || match[6] !== undefined) output += '<strong>' + escapeHTML(match[5] !== undefined ? match[5] : match[6]) + '</strong>';
      else if (match[7] !== undefined || match[8] !== undefined) output += '<em>' + escapeHTML(match[7] !== undefined ? match[7] : match[8]) + '</em>';
      else output += escapeHTML(match[0]);
      last = pattern.lastIndex;
    }
    return output + escapeHTML(input.slice(last));
  }
  function renderMarkdown(value) {
    const text = String(value == null ? '' : value).replace(/\r\n?/g, '\n').slice(0, 20000);
    const lines = text.split('\n');
    const result = [];
    const fence = String.fromCharCode(96).repeat(3);
    const isSeparator = (line) => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line || '');
    const isTable = (i) => i + 1 < lines.length && lines[i].includes('|') && isSeparator(lines[i + 1]);
    const isList = (line) => /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line || '');
    const startsBlock = (i) => /^\s{0,3}#{1,4}\s+/.test(lines[i] || '') || (lines[i] || '').trim().startsWith(fence) || /^\s*>/.test(lines[i] || '') || isList(lines[i]) || isTable(i);
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) { i++; continue; }
      if (trimmed.startsWith(fence)) {
        i++;
        const code = [];
        while (i < lines.length && !lines[i].trim().startsWith(fence)) code.push(lines[i++]);
        if (i < lines.length) i++;
        result.push('<pre><code>' + escapeHTML(code.join('\n')) + '</code></pre>');
        continue;
      }
      const heading = trimmed.match(/^(#{1,4})\s+(.+?)\s*#*$/);
      if (heading) {
        const n = heading[1].length;
        result.push('<h' + n + '>' + renderInline(heading[2]) + '</h' + n + '>');
        i++;
        continue;
      }
      if (isTable(i)) {
        const cells = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
        const headers = cells(line);
        i += 2;
        let table = '<div class="rw82-table-wrap"><table><thead><tr>' + headers.map((cell) => '<th>' + renderInline(cell) + '</th>').join('') + '</tr></thead><tbody>';
        while (i < lines.length && lines[i].trim() && lines[i].includes('|') && !isSeparator(lines[i])) {
          const row = cells(lines[i]);
          table += '<tr>' + headers.map((_cell, index) => '<td>' + renderInline(row[index] || '') + '</td>').join('') + '</tr>';
          i++;
        }
        result.push(table + '</tbody></table></div>');
        continue;
      }
      if (/^\s*>/.test(line)) {
        const quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, '').trim());
        result.push('<blockquote><p>' + renderInline(quote.join(' ')) + '</p></blockquote>');
        continue;
      }
      if (isList(line)) {
        const ordered = /^\s*\d+[.)]\s+/.test(line);
        const tag = ordered ? 'ol' : 'ul';
        let list = '<' + tag + '>';
        while (i < lines.length && isList(lines[i]) && /^\s*\d+[.)]\s+/.test(lines[i]) === ordered) {
          list += '<li>' + renderInline(lines[i++].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/, '')) + '</li>';
        }
        result.push(list + '</' + tag + '>');
        continue;
      }
      const paragraph = [trimmed];
      i++;
      while (i < lines.length && lines[i].trim() && !startsBlock(i)) paragraph.push(lines[i++].trim());
      result.push('<p>' + renderInline(paragraph.join(' ')) + '</p>');
    }
    return result.join('');
  }
  function profileForModel(model) { return PROFILES.find((profile) => profile.id === model) || PROFILES[0]; }
  function styleMessagesForAdvisor(messages, model) {
    const profile = profileForModel(model);
    const cloned = Array.isArray(messages) ? messages.map((message) => message && typeof message === 'object' ? { ...message } : message) : [];
    const system = cloned.find((message) => message && message.role === 'system');
    if (system) {
      system.content = String(system.content || '') + '\n\nSelected in-world advisor: ' + profile.name + ' — ' + profile.role + '. Communication style: ' + profile.style + ' Keep wording clean and readable; format with ordinary headings and lists when useful; avoid raw Markdown markers when possible. Do not claim to be a real human and do not reveal underlying model/provider names unless the user explicitly asks about the technical implementation.';
    }
    return cloned;
  }
  function ensureChatStyle() {
    let sdk;
    try { sdk = window.puter; } catch (_) { return; }
    if (!sdk || !sdk.ai || typeof sdk.ai.chat !== 'function' || sdk.ai.chat.__rw82Wrapped) return;
    const original = sdk.ai.chat;
    const wrapped = function realworldAdvisorChat(messages, testMode, options) {
      const modelSelect = query('#rw8-ai-model');
      const model = modelSelect && modelSelect.value ? modelSelect.value : PROFILES[0].id;
      const args = Array.from(arguments);
      if (Array.isArray(messages)) args[0] = styleMessagesForAdvisor(messages, model);
      return original.apply(this, args);
    };
    wrapped.__rw82Wrapped = true;
    try { sdk.ai.chat = wrapped; } catch (_) { /* The underlying advisor still works if the SDK is non-writable. */ }
  }
  function profileFromVisibleLabel(text) { return PROFILES.find((profile) => text.includes(profile.oldLabel) || text.includes(profile.id)) || profileForModel('openai/gpt-6.1-sol'); }
  function friendlyStatus(text) {
    const current = String(text || '');
    const profile = profileFromVisibleLabel(current);
    if (/AI response complete/i.test(current)) return 'Response ready · ' + profile.name + '. Check important facts before acting.';
    if (/AI connected to your Puter account|AI is already connected to your Puter account/i.test(current)) return 'Connected through Puter · ' + profile.name + ' is ready. Ask whenever you are ready.';
    if (/Puter AI is loaded, but not connected/i.test(current)) return 'Your advisor service is ready but not connected. Choose Connect your account to sign in. No question is sent before you connect; the built-in Guide remains available.';
    if (/Puter AI is ready/i.test(current)) return 'Business Desk ready · ' + profile.name + ' is ready. Connect your account if sign-in is needed.';
    if (/Conversation cleared\. Puter AI is ready/i.test(current)) return 'Conversation cleared. The Business Desk is ready for a new question.';
    return current.replace(/\bConnect AI\b/g, 'Connect your account').replace(/\bAsk AI\b/g, 'Ask').replace(/Puter could not complete this response\./g, 'The advisor service could not complete this response.').replace(/The selected model may be unavailable\. Choose another model from the list and retry\./g, 'This advisor is temporarily unavailable. Choose another advisor and try again.').replace(/model access/i, 'advisor access');
  }
  function friendlyTitle(text) {
    const current = String(text || '');
    const profile = profileFromVisibleLabel(current);
    if (/^REALWORLD AI\s*·/i.test(current)) return profile.name + ' · ' + profile.role;
    if (/^Welcome to REALWORLD AI$/i.test(current)) return 'Welcome to the Business Desk';
    if (/^REALWORLD AI$/i.test(current)) return 'Business Desk';
    if (/^Built-in Guide fallback/i.test(current)) return 'Built-in Guide · Offline answer';
    return current;
  }
  function ensureStyles() {
    if (query('#rw82-styles')) return;
    const style = document.createElement('style');
    style.id = 'rw82-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }
  function ensureAdvisorPicker() {
    const select = query('#rw8-ai-model');
    if (!select) return;
    const oldRow = select.closest('.rw8-ai-model-row');
    if (oldRow) oldRow.hidden = true;
    if (query('#rw82-advisor-picker')) return;
    const host = oldRow || select.parentElement;
    if (!host || !host.insertAdjacentHTML) return;
    const menuItems = PROFILES.map((profile) => '<button class="rw82-advisor-option" type="button" role="menuitemradio" aria-checked="' + (select.value === profile.id || (!select.value && profile.id === PROFILES[0].id) ? 'true' : 'false') + '" data-rw82-advisor="' + profile.id + '"><span>' + profile.name + ' · ' + profile.role + '</span><small>' + profile.style + '</small></button>').join('');
    const markup = '<div class="rw82-advisor-row"><span class="rw82-advisor-label">Your advisor</span><div class="rw82-advisor-picker" id="rw82-advisor-picker"><button id="rw82-advisor-trigger" class="rw82-advisor-trigger" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="rw82-advisor-menu">Mara · Business Guide ▾</button><div id="rw82-advisor-menu" class="rw82-advisor-menu" role="menu" aria-label="Choose a business advisor" hidden>' + menuItems + '</div></div></div>';
    host.insertAdjacentHTML('afterend', markup);
    refreshAdvisorPicker();
  }
  function refreshAdvisorPicker() {
    ensureChatStyle();
    const select = query('#rw8-ai-model');
    const trigger = query('#rw82-advisor-trigger');
    const selected = profileForModel(select && select.value);
    const label = selected.name + ' · ' + selected.role + ' ▾';
    if (trigger && trigger.textContent !== label) trigger.textContent = label;
    const menu = query('#rw82-advisor-menu');
    if (menu) menu.querySelectorAll('[data-rw82-advisor]').forEach((button) => button.setAttribute('aria-checked', button.getAttribute('data-rw82-advisor') === selected.id ? 'true' : 'false'));
  }
  function setMenuOpen(open) {
    menuOpen = !!open;
    const menu = query('#rw82-advisor-menu');
    const trigger = query('#rw82-advisor-trigger');
    if (menu) menu.hidden = !menuOpen;
    if (trigger) trigger.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
  }
  function chooseAdvisor(model) {
    if (!PROFILES.some((profile) => profile.id === model)) return false;
    const select = query('#rw8-ai-model');
    if (!select) return false;
    select.value = model;
    setMenuOpen(false);
    refreshAdvisorPicker();
    try { select.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    return true;
  }
  function decorateVisibleText(root) {
    const panel = query('#rw7-guide-panel', root) || root;
    if (!panel || !panel.querySelectorAll) return;
    const title = query('#rw7-guide-title', panel);
    if (title && title.textContent !== 'Business Desk') title.textContent = 'Business Desk';
    const description = query('#rw7-guide-description', panel);
    const copy = 'Get a second opinion, understand the numbers, and plan your next move. You approve every action.';
    if (description && description.textContent !== copy) description.textContent = copy;
    const fab = query('#rw7-guide-fab');
    if (fab && !fab.textContent.includes('Business Desk')) fab.innerHTML = '<span aria-hidden="true">✦</span> Business Desk';
    const connect = query('#rw8-ai-connect', panel);
    if (connect && !connect.disabled && connect.textContent !== 'Connect your account') connect.textContent = 'Connect your account';
    const submit = query('#rw7-guide-form button[type="submit"]', panel);
    if (submit && !submit.disabled && submit.textContent === 'Ask AI') submit.textContent = 'Ask';
    if (submit && submit.textContent === 'Thinking…') submit.textContent = 'Working…';
    panel.querySelectorAll('.rw7-msg-title').forEach((node) => {
      const next = friendlyTitle(node.textContent);
      if (next !== node.textContent) node.textContent = next;
    });
    const status = query('#rw8-ai-status', panel);
    if (status) {
      const next = friendlyStatus(status.textContent);
      if (next !== status.textContent) status.textContent = next;
    }
    const note = query('.rw7-guide-note', panel);
    const noteCopy = 'Advice only: your advisors cannot place orders, hire staff, change prices, or edit saved company records. Verify important facts before acting.';
    if (note && note.textContent !== noteCopy) note.textContent = noteCopy;
    const input = query('#rw7-guide-question', panel);
    if (input && input.value === 'What should I focus on next?') input.value = '';
  }
  function formatMessageBodies(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('.rw8-msg-body').forEach((body) => {
      if (body.querySelector('.rw82-rich')) return;
      // Layer 8.1 writes AI responses as text nodes. Only those text nodes are converted;
      // user messages are outside this selector and are never interpreted as markup.
      if (body.children && body.children.length) return;
      const raw = body.textContent || '';
      if (!raw.trim()) return;
      body.innerHTML = '<div class="rw82-rich">' + renderMarkdown(raw) + '</div>';
    });
  }
  function applyPresentation() {
    decorateVisibleText(document);
    refreshAdvisorPicker();
    formatMessageBodies(query('#rw7-guide-messages'));
  }
  function handleClick(event) {
    const target = event.target && event.target.closest ? event.target : null;
    if (!target) return;
    const openQuestion = target.closest('[data-rw7-guide-question]');
    if (openQuestion) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setMenuOpen(false);
      const runtime = window.REALWORLD_LAYER8 || window.REALWORLD_LAYER7;
      // Opening the desk should not insert dashboard suggestion text into the input.
      if (runtime && typeof runtime.openGuide === 'function') runtime.openGuide();
      return;
    }
    if (target.closest('#rw82-advisor-trigger')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setMenuOpen(!menuOpen);
      return;
    }
    const option = target.closest('[data-rw82-advisor]');
    if (option) {
      event.preventDefault();
      event.stopImmediatePropagation();
      chooseAdvisor(option.getAttribute('data-rw82-advisor'));
      return;
    }
    if (menuOpen && !target.closest('#rw82-advisor-picker')) setMenuOpen(false);
  }
  function handleKeydown(event) {
    const trigger = event.target && event.target.closest ? event.target.closest('#rw82-advisor-trigger') : null;
    const option = event.target && event.target.closest ? event.target.closest('[data-rw82-advisor]') : null;
    if (event.key === 'Escape' && menuOpen) {
      event.preventDefault(); event.stopImmediatePropagation(); setMenuOpen(false);
      if (trigger) trigger.focus(); else { const button = query('#rw82-advisor-trigger'); if (button) button.focus(); }
      return;
    }
    if (trigger && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault(); event.stopImmediatePropagation(); setMenuOpen(true);
      const first = query('#rw82-advisor-menu [data-rw82-advisor]'); if (first) first.focus();
      return;
    }
    if (option && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault(); event.stopImmediatePropagation();
      const items = Array.from(query('#rw82-advisor-menu').querySelectorAll('[data-rw82-advisor]'));
      const current = items.indexOf(option);
      const next = items[(current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
      if (next) next.focus();
    }
  }
  function init() {
    if (initialized) return;
    const runtime = window.REALWORLD_LAYER8 || window.REALWORLD_LAYER7;
    if (!runtime || !query('#rw7-guide-panel')) return;
    initialized = true;
    ensureStyles();
    const meta = query('meta[name="application-version"]');
    if (meta) meta.setAttribute('content', BUILD_LABEL);
    const description = query('meta[name="description"]');
    if (description) description.setAttribute('content', 'A business simulation with a built-in Business Desk, named advisor profiles, clean formatted answers, and privacy-controlled company context.');
    const build = query('.brand-build');
    if (build) build.textContent = 'Build ID: ' + BUILD_LABEL;
    ensureAdvisorPicker();
    applyPresentation();
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeydown, true);
    const panel = query('#rw7-guide-panel');
    if (typeof MutationObserver !== 'undefined' && panel) {
      observer = new MutationObserver(() => applyPresentation());
      observer.observe(panel, { subtree: true, childList: true, characterData: true });
    }
  }
  window.REALWORLD_LAYER82 = {
    build: BUILD_LABEL,
    profiles: PROFILES.map(({id,name,role,style}) => ({id,name,role,style})),
    renderMarkdown,
    renderInlineMarkdown: renderInline,
    styleMessagesForAdvisor,
    friendlyStatus,
    friendlyTitle,
    chooseAdvisor,
    applyPresentation,
    getMenuState: () => menuOpen
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
