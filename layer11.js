/*
 * REALWORLD Layer 11.0 — Weekly Command Center & Runtime Diagnostics
 * Additive, advisory-only dashboard and saved weekly review log.
 * Does not post transactions, change game economics, or trigger artificial events.
 */
(function realworldLayer11() {
  'use strict';

  const BUILD = 'RW-LAYER-11.2.0 · Reliability & Continuity Release · 2026-10-15';
  const MAX_REVIEWS = 120;
  let initialized = false;
  let baseRenderDashboard = null;
  let baseRenderReports = null;
  let baseRenderView = null;
  let lastStatusMessage = '';
  let lastStatusGame = null;

  function currentGame() {
    try { if (typeof game !== 'undefined' && game) return game; } catch (_) {}
    try { return window.game || null; } catch (_) { return null; }
  }
  function ownObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function list(value) { return Array.isArray(value) ? value : []; }
  function finite(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }
  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }
  function money(value, g) {
    const amount = finite(value);
    if (amount === null) return 'Not recorded';
    const currency = String((g && g.currencyCode) || 'PHP').toUpperCase();
    try { return new Intl.NumberFormat('en-PH', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
    catch (_) { return `${currency} ${amount.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`; }
  }
  function getExtension(g) {
    return g && ownObject(g.realworldLayer9) ? g.realworldLayer9 : {};
  }
  function weekNumber(g) { return Math.max(1, Math.floor(finite(g && g.week, 1) || 1)); }
  function makeItem(key, severity, title, explanation, nextStep) {
    return { key, severity, title, explanation, nextStep };
  }

  // Pure read of the current save. This function intentionally does not initialize or mutate extensions.
  function buildActionItems(g = currentGame()) {
    if (!ownObject(g)) return [];
    const week = weekNumber(g);
    const extension = getExtension(g);
    const items = [];
    const closed = ownObject(extension.closed) && finite(extension.closed.atWeek) !== null;
    const bankrupt = String(g.companyStatus || '').toLowerCase() === 'bankrupt';

    if (closed || bankrupt || String(g.companyStatus || '').toLowerCase() === 'closed') {
      items.push(makeItem('business-closed', 'info', 'Business operations are stopped',
        closed ? `The saved record shows voluntary closure after Week ${Math.max(0, Math.floor(finite(extension.closed.atWeek, 0)))}.` : 'The company status is recorded as closed or bankrupt.',
        'Use Reports & Journal to review historical records. Reopening is not performed by this panel.'));
      return items;
    }

    const cash = finite(g.cash);
    const rent = finite(g.monthlyRent, 0) || 0;
    const utilities = finite(g.monthlyUtilities, 0) || 0;
    if (cash !== null && rent + utilities > 0 && cash < rent + utilities) {
      items.push(makeItem('cash-below-fixed-costs', 'high', 'Cash is below one month of rent and utilities',
        `Recorded cash is ${money(cash, g)} against ${money(rent + utilities, g)} in monthly rent and utilities.`,
        'Review collections, near-term payables, and optional spending before making new commitments.'));
    }
    const overdraft = finite(g.overdraft, 0) || 0;
    if (overdraft > 0) {
      items.push(makeItem('overdraft-in-use', 'high', 'An overdraft is recorded',
        `Current recorded overdraft: ${money(overdraft, g)}.`,
        'Review the cash forecast and expected inflows before taking on discretionary costs.'));
    }
    const arrears = finite(g.loanArrears, 0) || 0;
    if (arrears > 0) {
      items.push(makeItem('loan-arrears', 'high', 'Loan arrears need review',
        `Recorded loan arrears: ${money(arrears, g)}.`,
        'Open Finance and check the recorded loan schedule, due dates, and cash availability.'));
    }
    const taxPayable = finite(g.taxPayable, 0) || 0;
    const accountsPayable = finite(g.ap, 0) || 0;
    const payrollPayable = finite(g.payrollPayable, 0) || 0;
    if (taxPayable > 0 || accountsPayable > 0 || payrollPayable > 0) {
      const parts = [];
      if (taxPayable > 0) parts.push(`tax ${money(taxPayable, g)}`);
      if (accountsPayable > 0) parts.push(`accounts payable ${money(accountsPayable, g)}`);
      if (payrollPayable > 0) parts.push(`payroll payable ${money(payrollPayable, g)}`);
      items.push(makeItem('recorded-obligations', 'medium', 'Recorded obligations are outstanding',
        parts.join(' · ') + '.',
        'Check the due dates in the relevant Finance records; this reminder does not initiate payment.'));
    }

    const openOrders = list(g.purchaseOrders).filter((order) => order && order.status === 'open');
    const overdueOrders = openOrders.filter((order) => finite(order.etaWeek) !== null && finite(order.etaWeek) < week);
    const dueOrders = openOrders.filter((order) => finite(order.etaWeek) !== null && finite(order.etaWeek) === week);
    if (overdueOrders.length) {
      items.push(makeItem('supplier-orders-overdue', 'high', 'Supplier orders are past their recorded ETA',
        `${overdueOrders.length} open purchase order(s) have an ETA earlier than Week ${week}.`,
        'Review each order’s supplier, delay history, payable amount, and current stock before reordering.'));
    } else if (dueOrders.length) {
      items.push(makeItem('supplier-orders-due', 'medium', 'Supplier orders are due this week',
        `${dueOrders.length} open purchase order(s) have a recorded ETA of Week ${week}.`,
        'Check receipts and quantities in Operations; ETA is a simulation estimate, not a guarantee.'));
    }

    const outOfStock = list(g.products).filter((product) => product && product.kind === 'goods'
      && finite(product.stock) !== null && finite(product.stock) <= 0
      && (finite(product.baseDemand, 0) || 0) > 0);
    if (outOfStock.length) {
      items.push(makeItem('goods-out-of-stock', 'high', 'Goods with demand are out of stock',
        `${outOfStock.length} goods item(s) have zero or negative recorded stock and positive base demand.`,
        'Review expected demand, inbound orders, supplier lead times, and working-capital limits.'));
    }

    const activeEvents = list(extension.activeEvents);
    if (activeEvents.length) {
      const event = activeEvents[0];
      items.push(makeItem('economic-event-active', 'medium', 'A temporary economic condition is active',
        `${String(event.title || event.id || 'Modeled event')} · ${Math.max(0, Math.floor(finite(event.remainingWeeks, 0) || 0))} close(s) remaining.`,
        'Review the demand and operating-cost explanations before interpreting this week’s results.'));
    }
    const queuedJobs = list(extension.jobs).filter((job) => job && job.status === 'queued');
    const overdueJobs = queuedJobs.filter((job) => finite(job.dueWeek) !== null && finite(job.dueWeek) < week);
    if (overdueJobs.length) {
      items.push(makeItem('delivery-jobs-overdue', 'high', 'Specialist delivery jobs are overdue',
        `${overdueJobs.length} queued job(s) have a due week earlier than Week ${week}.`,
        'Review remaining units and available delivery capacity in Operations. These jobs are not automatically cleared here.'));
    }

    if (!list(g.history).length) {
      items.push(makeItem('first-week-review', 'info', 'Establish a baseline for the first operating close',
        'No completed weekly history is recorded yet.',
        'Review starting cash, stock, staffing, and planned commitments before the first week is closed.'));
    }
    if (!items.length) {
      items.push(makeItem('weekly-review', 'info', 'Review this week’s results and choose one improvement',
        `No priority signal was detected from the supported fields in Week ${week}. This is not a guarantee that the company has no risks.`,
        'Compare the latest recorded result with the previous week and choose one measurable goal.'));
    }
    return items.slice(0, 10);
  }

  function reviewState(g) {
    if (!g || !ownObject(g.realworldLayer11)) return { schemaVersion: 1, reviews: [] };
    const state = g.realworldLayer11;
    return { schemaVersion: 1, reviews: list(state.reviews).filter((row) => ownObject(row)
      && typeof row.key === 'string' && row.key.length <= 120
      && Number.isInteger(Number(row.week)) && Number(row.week) >= 1
      && typeof row.label === 'string').slice(-MAX_REVIEWS) };
  }
  function hasReviewed(itemKey, g = currentGame()) {
    if (!ownObject(g)) return false;
    const week = weekNumber(g);
    return reviewState(g).reviews.some((row) => row.key === itemKey && Number(row.week) === week);
  }
  function markReviewed(itemKey, g = currentGame()) {
    if (!ownObject(g) || typeof itemKey !== 'string') return { ok: false, reason: 'No company is open.' };
    const validItem = buildActionItems(g).find((item) => item.key === itemKey);
    if (!validItem) return { ok: false, reason: 'This priority is no longer present. Refresh the view and review the current list.' };
    const week = weekNumber(g);
    const current = reviewState(g);
    if (current.reviews.some((row) => row.key === itemKey && Number(row.week) === week)) {
      return { ok: false, reason: 'This item has already been reviewed for the current week.' };
    }
    current.reviews.push({ key: itemKey, week, date: String(g.date || new Date().toISOString().slice(0, 10)).slice(0, 40), label: validItem.title });
    current.reviews = current.reviews.slice(-MAX_REVIEWS);
    g.realworldLayer11 = current;
    let saveRequested = false;
    try {
      if (typeof saveGame === 'function') { saveGame(true); saveRequested = true; }
    } catch (error) {
      try { console.warn('Layer 11 review log save warning', error); } catch (_) {}
    }
    return { ok: true, saveRequested, week, item: validItem.key };
  }

  function moduleStatus() {
    let l9 = false;
    let l10 = false;
    try {
      const api = window.REALWORLD_LAYER9;
      const runtime = api && typeof api.getRuntimeState === 'function' ? api.getRuntimeState() : null;
      l9 = !!(runtime && runtime.initialized === true && runtime.wrapperInstalled === true);
    } catch (_) {}
    try {
      const api = window.REALWORLD_LAYER10;
      const runtime = api && typeof api.getState === 'function' ? api.getState() : null;
      l10 = !!(runtime && runtime.initialized === true && typeof api.buildCompanySnapshot === 'function');
    } catch (_) {}
    return { layer9: l9, layer10: l10, layer11: BUILD };
  }
  function panelHTML(g = currentGame()) {
    if (g !== lastStatusGame) { lastStatusGame = g; lastStatusMessage = ''; }
    if (!ownObject(g)) return `<section class="rw11-panel" data-testid="rw11-command-center"><h3>Weekly Command Center</h3><p>No company is open. Open or create a company to build a company-specific operating review.</p></section>`;
    const week = weekNumber(g);
    const items = buildActionItems(g);
    const state = moduleStatus();
    const reviewedCount = items.filter((item) => hasReviewed(item.key, g)).length;
    const extension = getExtension(g);
    const activeEventCount = list(extension.activeEvents).length;
    const queuedJobsCount = list(extension.jobs).filter((job) => job && job.status === 'queued').length;
    const history = list(g.history);
    const last = history[history.length - 1] || null;
    const itemRows = items.map((item) => {
      const reviewed = hasReviewed(item.key, g);
      return `<article class="rw11-item rw11-${escapeHTML(item.severity)}"><div class="rw11-item-head"><span class="rw11-severity">${escapeHTML(item.severity.toUpperCase())}</span><strong>${escapeHTML(item.title)}</strong></div><p>${escapeHTML(item.explanation)}</p><p class="rw11-next"><b>Suggested review:</b> ${escapeHTML(item.nextStep)}</p><div class="rw11-item-actions">${reviewed ? '<span class="rw11-reviewed" aria-label="Reviewed this week">Reviewed this week</span>' : `<button type="button" class="secondary-btn small-btn" data-rw11-action="review" data-rw11-key="${escapeHTML(item.key)}">Mark reviewed</button>`}</div></article>`;
    }).join('');
    const moduleRows = [
      `Layer 9 business systems: ${state.layer9 ? 'available' : 'not detected'}`,
      `Layer 10 company assistant: ${state.layer10 ? 'available' : 'not detected'}`,
      `Layer 11 command center: available`
    ];
    return `<section class="rw11-panel" data-testid="rw11-command-center" aria-label="Weekly Command Center">
      <div class="rw11-head"><div><p class="rw11-kicker">REALWORLD · MANAGEMENT REVIEW</p><h3>Weekly Command Center</h3><p class="rw11-subtitle">${escapeHTML(g.company || 'Unnamed company')} · Week ${week}${g.date ? ` · ${escapeHTML(g.date)}` : ''}</p></div><span class="rw11-build">Layer 11.0</span></div>
      <p class="rw11-disclosure">A read-only review of available company records. Suggestions are not transactions, compliance advice, or a guarantee that every risk has been detected.</p>
      <div class="rw11-metrics"><div><strong>${escapeHTML(money(g.cash, g))}</strong><span>Recorded cash</span></div><div><strong>${last ? escapeHTML(money(last.net, g)) : '—'}</strong><span>${last ? `Latest recorded net · Week ${escapeHTML(last.week == null ? '—' : last.week)}` : 'No recorded weekly net yet'}</span></div><div><strong>${items.length}</strong><span>Priority review items</span></div><div><strong>${activeEventCount} / ${queuedJobsCount}</strong><span>Active events / queued jobs</span></div></div>
      <div class="rw11-section-head"><h4>Priority review queue</h4><span>${reviewedCount}/${items.length} reviewed this week</span></div>
      <div class="rw11-list">${itemRows}</div>
      <details class="rw11-diagnostics"><summary>Integrated module status</summary><ul>${moduleRows.map((row) => `<li>${escapeHTML(row)}</li>`).join('')}</ul><p>Loader target: pinned Layer 6.0 engine. The public loader does not import the former Layer 8.3 downloaded-model module.</p></details>
      <p class="rw11-status" data-testid="rw11-command-center-status" role="status" aria-live="polite">${escapeHTML(lastStatusMessage || 'Review markings are scoped to this company and this simulation week.')}</p><p class="rw11-foot">Marking an item reviewed records only the review label, date, and week in this company’s saved simulation state. It does not increase a score, move money, change inventory, or mark legal compliance.</p>
    </section>`;
  }

  const CSS = `
    .rw11-panel{margin:16px 0;padding:16px;border:1px solid var(--line,#344039);border-radius:14px;background:var(--panel,#19211e);color:var(--text,#edf2eb);min-width:0}
    .rw11-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}.rw11-head h3{font-size:16px;margin:0 0 4px}.rw11-kicker{font-size:10px;font-weight:800;letter-spacing:.08em;color:var(--muted,#aab5aa);margin:0 0 5px}.rw11-subtitle,.rw11-disclosure,.rw11-foot{color:var(--muted,#aab5aa);font-size:11px;line-height:1.5;margin:4px 0 11px}.rw11-build{white-space:nowrap;font-size:10px;font-weight:800;border:1px solid var(--line,#344039);border-radius:99px;padding:4px 8px}
    .rw11-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.rw11-metrics>div{min-width:0;background:var(--panel2,#202a25);border:1px solid var(--line,#344039);border-radius:10px;padding:10px}.rw11-metrics strong{display:block;font-size:13px;line-height:1.35;overflow-wrap:anywhere}.rw11-metrics span{display:block;color:var(--muted,#aab5aa);font-size:10px;margin-top:4px;line-height:1.45}
    .rw11-section-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-top:16px}.rw11-section-head h4{font-size:13px;margin:0 0 8px}.rw11-section-head span{font-size:10px;color:var(--muted,#aab5aa)}.rw11-list{display:grid;gap:8px}.rw11-item{border:1px solid var(--line,#344039);border-radius:10px;padding:11px;min-width:0}.rw11-item-head{display:flex;align-items:flex-start;gap:8px}.rw11-item-head strong{font-size:12px;line-height:1.45}.rw11-severity{flex-shrink:0;font-size:9px;letter-spacing:.03em;font-weight:900;border-radius:99px;border:1px solid var(--line,#344039);padding:3px 6px}.rw11-high .rw11-severity{border-color:var(--danger,#bd7373)}.rw11-medium .rw11-severity{border-color:var(--accent,#bad5a6)}.rw11-item p{font-size:11px;line-height:1.5;color:var(--muted,#aab5aa);margin:6px 0 0;overflow-wrap:anywhere}.rw11-item p b{color:var(--text,#edf2eb)}.rw11-item-actions{display:flex;justify-content:flex-end;margin-top:9px}.rw11-item-actions button{min-height:36px}.rw11-reviewed{font-size:10px;font-weight:800;color:var(--muted,#aab5aa);padding:7px 0}.rw11-diagnostics{margin-top:12px;border-top:1px solid var(--line,#344039);padding-top:10px;font-size:11px}.rw11-diagnostics summary{cursor:pointer;font-weight:800}.rw11-diagnostics li,.rw11-diagnostics p{color:var(--muted,#aab5aa);margin-top:5px;overflow-wrap:anywhere}.rw11-foot{margin:12px 0 0}
    .rw11-panel button:focus-visible,.rw11-panel summary:focus-visible{outline:3px solid var(--blue,#78aebe);outline-offset:2px}
    @media(max-width:720px){.rw11-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.rw11-panel{padding:12px}.rw11-head{gap:8px}}
    @media(max-width:360px){.rw11-head{display:block}.rw11-build{display:inline-block;margin-top:6px}.rw11-section-head{display:block}.rw11-metrics strong{font-size:12px}}
    @media(prefers-reduced-motion:reduce){.rw11-panel *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
  `;

  function insertBeforeAnchor(html, panel) {
    if (typeof html !== 'string') return html;
    if (html.includes('data-testid="rw11-command-center"')) return html;
    const anchors = ['data-testid="rw9-voluntary-closure"', 'class="grid stats-grid"'];
    for (const anchor of anchors) {
      const position = html.indexOf(anchor);
      if (position >= 0) {
        const start = html.lastIndexOf('<section', position) >= 0 && anchor.startsWith('data-testid')
          ? html.lastIndexOf('<section', position)
          : (html.lastIndexOf('<div', position) >= 0 ? html.lastIndexOf('<div', position) : position);
        return html.slice(0, start) + panel + html.slice(start);
      }
    }
    return html + panel;
  }
  function wrapRenderers() {
    if (typeof renderDashboard === 'function' && !renderDashboard.__rw11Wrapped) {
      const old = renderDashboard;
      const wrapped = function () { const html = old.apply(this, arguments); return insertBeforeAnchor(html, panelHTML()); };
      wrapped.__rw11Wrapped = true; baseRenderDashboard = old; renderDashboard = wrapped;
    }
    if (typeof renderReports === 'function' && !renderReports.__rw11Wrapped) {
      const old = renderReports;
      const wrapped = function () { const html = old.apply(this, arguments); return insertBeforeAnchor(html, panelHTML()); };
      wrapped.__rw11Wrapped = true; baseRenderReports = old; renderReports = wrapped;
    }
    if (typeof renderView === 'function' && !renderView.__rw11Wrapped) {
      const old = renderView;
      const wrapped = function () { const result = old.apply(this, arguments); return result; };
      wrapped.__rw11Wrapped = true; baseRenderView = old; renderView = wrapped;
    }
  }
  function handleClick(event) {
    const target = event.target && event.target.closest ? event.target.closest('[data-rw11-action="review"]') : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const result = markReviewed(target.getAttribute('data-rw11-key'));
    lastStatusMessage = result.ok
      ? (result.saveRequested ? 'Review logged for this company and save requested.' : 'Review logged for this company in the current session.')
      : result.reason;
    try { if (typeof renderView === 'function') renderView(); } catch (error) { console.warn('Layer 11 review refresh warning', error); }
  }
  function init() {
    if (initialized) return;
    initialized = true;
    try {
      const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    } catch (_) {}
    wrapRenderers();
    document.addEventListener('click', handleClick, true);
    const meta = document.querySelector('meta[name="application-version"]');
    if (meta) meta.setAttribute('content', BUILD);
    const brandBuild = document.querySelector('.brand-build');
    if (brandBuild) brandBuild.textContent = `Build ID: ${BUILD}`;
    // Force one safe re-render so the dashboard review appears immediately after startup.
    try { if (currentGame() && typeof renderView === 'function') renderView(); } catch (error) { console.warn('Layer 11 initial render warning', error); }
  }

  const api = {
    build: BUILD,
    buildActionItems,
    buildPanel: panelHTML,
    hasReviewed,
    markReviewed,
    moduleStatus,
    getState: () => ({ initialized, build: BUILD, wrappedDashboard: !!(typeof renderDashboard === 'function' && renderDashboard.__rw11Wrapped), wrappedReports: !!(typeof renderReports === 'function' && renderReports.__rw11Wrapped) }),
    init
  };
  window.REALWORLD_LAYER11 = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
