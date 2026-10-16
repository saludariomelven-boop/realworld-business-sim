/*
 * REALWORLD Layer 11.7 — Expansion & Competitive Strategy
 * Adds a read-only competitive-strategy comparison and staged expansion decisions to Layer 11.6.
 * New controls only prefill existing, explicitly submitted core forms; they never commit decisions.
 */
(function realworldLayer11() {
  'use strict';

  const BUILD = 'RW-LAYER-11.7.0 · Expansion & Competitive Strategy · 2026-10-16';
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
  const PRICE_ADJUSTMENTS = [-10, -5, 0, 5, 10];
  const MARKETING_FACTORS = [0.75, 1, 1.25, 1.5];
  const COMPETITIVE_PROFILES = [
    { id: 'value', title: 'Value fighter', strategy: 'value', priceAdjustment: -5, marketingFactor: 1.25, summary: 'Lower prices and stronger promotion; watch unit margin and cash use.' },
    { id: 'balanced', title: 'Balanced growth', strategy: 'balanced', priceAdjustment: 0, marketingFactor: 1, summary: 'Keep current prices and marketing; protect flexibility while reading results.' },
    { id: 'premium', title: 'Premium positioning', strategy: 'premium', priceAdjustment: 5, marketingFactor: 1, summary: 'Test a higher price with unchanged marketing; demand may soften.' }
  ];
  let selectedPriceAdjustment = 0;
  let selectedMarketingFactor = 1;
  let lastScenarioCompany = null;

  function roundScenarioMoney(value) {
    try { if (typeof roundMoneyValue === 'function') return roundMoneyValue(value); } catch (_) {}
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
  function modelAmount(value, fallback = value) {
    try {
      if (typeof localModelAmount === 'function') {
        const amount = finite(localModelAmount(value));
        if (amount !== null && amount > 0) return amount;
      }
    } catch (_) {}
    return fallback;
  }
  function activeBusiness(g) {
    if (!ownObject(g)) return false;
    const extension = getExtension(g);
    const closed = ownObject(extension.closed) && finite(extension.closed.atWeek) !== null;
    const status = String(g.companyStatus || '').toLowerCase();
    return !closed && status !== 'bankrupt' && status !== 'closed';
  }
  function marketingBudgetStep(g = currentGame()) {
    return Math.max(0.01, modelAmount(100, 100));
  }
  function stageableMarketingTarget(target, g = currentGame()) {
    const step = marketingBudgetStep(g);
    const max = Math.max(0, modelAmount(1000000, 1000000));
    const largestValid = Math.floor((max + 1e-8) / step) * step;
    const rounded = Math.round(Math.max(0, finite(target, 0) || 0) / step) * step;
    return roundScenarioMoney(Math.min(largestValid, Math.max(0, rounded)));
  }
  function scenarioUnitCost(product) {
    const stock = Math.max(0, finite(product && product.stock, 0) || 0);
    const stockValue = finite(product && product.stockValue);
    if (product && product.kind === 'goods' && stock > 0 && stockValue !== null) return Math.max(0, stockValue / stock);
    return Math.max(0, finite(product && product.unitCost, finite(product && product.cost, 0)) || 0);
  }
  function marketingDemandMultiplier(budget, baseline) {
    return 1 + Math.min(0.78, Math.sqrt(Math.max(0, finite(budget, 0) || 0) / Math.max(1, finite(baseline, 1) || 1)) * 0.13);
  }
  function calculateMarketScenario(g = currentGame(), priceAdjustment = selectedPriceAdjustment, marketingFactor = selectedMarketingFactor, estimatorOverride = null) {
    if (!ownObject(g)) return { available: false, reason: 'Open a company to compare price and marketing scenarios.' };
    const estimator = typeof estimatorOverride === 'function'
      ? estimatorOverride
      : (typeof estimateWeeklyProductDemand === 'function' ? estimateWeeklyProductDemand : null);
    if (!estimator) return { available: false, reason: 'The core weekly-demand estimator is not available. No substitute forecast was fabricated.' };
    const adjustment = Number(priceAdjustment);
    const factor = Number(marketingFactor);
    if (!PRICE_ADJUSTMENTS.includes(adjustment) || !MARKETING_FACTORS.includes(factor)) {
      return { available: false, reason: 'Choose one of the supported scenario options and try again.' };
    }
    const products = list(g.products).filter((product) => ownObject(product)
      && product.kind === 'goods' && finite(product.price) !== null && finite(product.price) > 0);
    if (!products.length) return { available: false, reason: 'No priced physical-goods offers are available for this scenario.' };

    const currentMarketing = Math.max(0, finite(g.marketingBudget, 0) || 0);
    const baseMarketing = Math.max(1, finite(g.baselineMarketing, 1) || 1);
    let marketingLimit = 1000000;
    try { if (typeof localModelAmount === 'function') marketingLimit = Math.max(0, localModelAmount(1000000)); } catch (_) {}
    const targetMarketing = Math.min(marketingLimit, roundScenarioMoney(currentMarketing * factor));
    const currentMarketingMultiplier = marketingDemandMultiplier(currentMarketing, baseMarketing);
    const targetMarketingMultiplier = marketingDemandMultiplier(targetMarketing, baseMarketing);
    const demandScale = currentMarketingMultiplier > 0 ? targetMarketingMultiplier / currentMarketingMultiplier : 1;
    const rows = [];
    let currentDemandTotal = 0;
    let scenarioDemandTotal = 0;
    let currentContribution = 0;
    let scenarioContribution = 0;
    for (const product of products) {
      const price = roundScenarioMoney(Number(product.price));
      const proposedPrice = roundScenarioMoney(price * (1 + adjustment / 100));
      if (!(proposedPrice > 0)) continue;
      let currentDemand;
      let priceDemand;
      try {
        currentDemand = Math.max(0, finite(estimator(product), 0) || 0);
        // A shallow scenario copy is passed to the engine's existing estimator. The live
        // product object and every saved ledger remain untouched.
        priceDemand = Math.max(0, finite(estimator(Object.assign({}, product, { price: proposedPrice })), 0) || 0);
      } catch (_) {
        return { available: false, reason: 'The core demand estimator could not evaluate this scenario. Company state was not changed.' };
      }
      const scenarioDemand = priceDemand * demandScale;
      const unitCost = scenarioUnitCost(product);
      const unitContribution = price - unitCost;
      const scenarioUnitContribution = proposedPrice - unitCost;
      const currentPotential = currentDemand * unitContribution;
      const scenarioPotential = scenarioDemand * scenarioUnitContribution;
      currentDemandTotal += currentDemand;
      scenarioDemandTotal += scenarioDemand;
      currentContribution += currentPotential;
      scenarioContribution += scenarioPotential;
      rows.push({
        id: String(product.id || ''), name: String(product.name || product.id || 'Unnamed offer'),
        currentPrice: price, proposedPrice, unitCost, unitContribution, scenarioUnitContribution,
        currentDemand, scenarioDemand, demandDelta: scenarioDemand - currentDemand,
        currentPotential, scenarioPotential, margin: price > 0 ? unitContribution / price : 0,
        scenarioMargin: proposedPrice > 0 ? scenarioUnitContribution / proposedPrice : 0
      });
    }
    const currentAfterMarketing = currentContribution - currentMarketing;
    const scenarioAfterMarketing = scenarioContribution - targetMarketing;
    return {
      available: true, adjustmentPct: adjustment, marketingFactor: factor,
      currentMarketing, targetMarketing, currentDemandTotal, scenarioDemandTotal,
      currentContribution, scenarioContribution, currentAfterMarketing, scenarioAfterMarketing,
      changeAfterMarketing: scenarioAfterMarketing - currentAfterMarketing,
      rows, note: 'Demand is estimated by the core model. Contribution after marketing is a planning proxy before stock availability, fulfilment capacity, payroll, rent, utilities, tax, financing, and other costs.'
    };
  }
  function formatUnits(value) {
    const amount = finite(value, 0) || 0;
    try { return new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 }).format(amount); }
    catch (_) { return amount.toFixed(1); }
  }
  function buildMarketLab(g = currentGame()) {
    if (g !== lastScenarioCompany) {
      lastScenarioCompany = g;
      selectedPriceAdjustment = 0;
      selectedMarketingFactor = 1;
    }
    const scenario = calculateMarketScenario(g, selectedPriceAdjustment, selectedMarketingFactor);
    const stagedMarketing = scenario.available ? stageableMarketingTarget(scenario.targetMarketing, g) : null;
    const priceOptions = PRICE_ADJUSTMENTS.map((value) => `<option value="${value}" ${value === selectedPriceAdjustment ? 'selected' : ''}>${value > 0 ? '+' : ''}${value}% from current price</option>`).join('');
    const marketingOptions = MARKETING_FACTORS.map((value) => `<option value="${value}" ${value === selectedMarketingFactor ? 'selected' : ''}>${value === 1 ? 'Keep current budget' : `${Math.round((value - 1) * 100) > 0 ? '+' : ''}${Math.round((value - 1) * 100)}% weekly spend`}</option>`).join('');
    const table = scenario.available ? `<div class="rw11-market-summary">
      <div><span>Current potential after marketing</span><strong>${escapeHTML(money(scenario.currentAfterMarketing, g))}</strong></div>
      <div><span>Scenario potential after marketing</span><strong>${escapeHTML(money(scenario.scenarioAfterMarketing, g))}</strong></div>
      <div><span>Estimated change</span><strong class="${scenario.changeAfterMarketing >= 0 ? 'rw11-positive' : 'rw11-negative'}">${scenario.changeAfterMarketing > 0 ? '+' : ''}${escapeHTML(money(scenario.changeAfterMarketing, g))}</strong></div>
    </div>
    <div class="rw11-market-table-wrap"><table class="rw11-market-table"><thead><tr><th>Offer</th><th>Current → scenario price</th><th>Demand / week</th><th>Unit contribution</th><th>Potential contribution</th><th>Action</th></tr></thead><tbody>${scenario.rows.map((row) => `<tr>
      <td><strong>${escapeHTML(row.name)}</strong><div class="rw11-muted">Unit cost ${escapeHTML(money(row.unitCost, g))}</div></td>
      <td>${escapeHTML(money(row.currentPrice, g))} → <strong>${escapeHTML(money(row.proposedPrice, g))}</strong></td>
      <td>${formatUnits(row.currentDemand)} → <strong>${formatUnits(row.scenarioDemand)}</strong><div class="rw11-muted">${row.demandDelta > 0 ? '+' : ''}${formatUnits(row.demandDelta)} units</div></td>
      <td>${escapeHTML(money(row.unitContribution, g))} → <strong class="${row.scenarioUnitContribution >= 0 ? 'rw11-positive' : 'rw11-negative'}">${escapeHTML(money(row.scenarioUnitContribution, g))}</strong><div class="rw11-muted">${Math.round(row.scenarioMargin * 100)}% margin</div></td>
      <td>${escapeHTML(money(row.currentPotential, g))} → <strong>${escapeHTML(money(row.scenarioPotential, g))}</strong></td>
      <td><button type="button" class="secondary-btn small-btn" data-rw11-stage-price="${escapeHTML(row.id)}" ${scenario.adjustmentPct === 0 ? 'disabled' : ''}>Stage price</button></td>
    </tr>`).join('')}</tbody></table></div>
    <p class="rw11-market-note">${escapeHTML(scenario.note)} This panel is a scenario preview, not recorded revenue or profit. “Stage price” only fills the existing Operations price field; you must still review and press “Save selling price” to apply it.</p>` : `<p class="rw11-market-note">${escapeHTML(scenario.reason || 'Scenario preview is unavailable.')}</p>`;
    return `<section class="rw11-market-lab" data-testid="rw11-market-strategy-lab" aria-label="Pricing and demand scenario lab">
      <div class="rw11-market-head"><div><p class="rw11-kicker">STRATEGY · PRICE · DEMAND</p><h3>Pricing &amp; Demand Lab</h3><p class="rw11-market-note">Compare one-week scenarios for physical-goods offers using the core demand estimator before committing to a price or marketing budget. Service offers are not included in this lab. Marketing staging rounds to the nearest valid amount accepted by the existing budget form when necessary.</p></div><span class="rw11-market-tag">Preview only</span></div>
      <div class="rw11-market-controls"><div><label for="rw11-price-adjustment">Selling-price scenario</label><select id="rw11-price-adjustment" data-rw11-price-adjustment>${priceOptions}</select></div><div><label for="rw11-marketing-factor">Marketing budget scenario</label><select id="rw11-marketing-factor" data-rw11-marketing-factor>${marketingOptions}</select></div></div>
      ${scenario.available ? `<div class="rw11-market-stage-row"><span>Weekly marketing budget: <strong>${escapeHTML(money(scenario.currentMarketing, g))}</strong> → <strong>${escapeHTML(money(scenario.targetMarketing, g))}</strong>${stagedMarketing !== scenario.targetMarketing ? `<small class="rw11-muted">Existing form step: ${escapeHTML(money(marketingBudgetStep(g), g))}; staged value will be ${escapeHTML(money(stagedMarketing, g))}.</small>` : ''}</span><button type="button" class="secondary-btn small-btn" data-rw11-stage-marketing ${scenario.marketingFactor === 1 || stagedMarketing === scenario.currentMarketing ? 'disabled' : ''}>${stagedMarketing !== scenario.targetMarketing ? `Stage nearest valid ${escapeHTML(money(stagedMarketing, g))}` : 'Stage marketing budget'}</button></div>` : ''}
      ${table}
    </section>`;
  }
  function insertMarketLab(html) {
    if (typeof html !== 'string' || html.includes('data-testid="rw11-market-strategy-lab"')) return html;
    const panel = buildMarketLab();
    const anchor = '<div class="grid four-col stats-grid">';
    const position = html.indexOf(anchor);
    return position >= 0 ? html.slice(0, position) + panel + html.slice(position) : html + panel;
  }
  function stageScenarioPrice(productId) {
    const g = currentGame();
    const isClosed = ownObject(getExtension(g).closed) && finite(getExtension(g).closed.atWeek) !== null;
    if (!ownObject(g) || isClosed || String(g.companyStatus || '').toLowerCase() === 'bankrupt' || String(g.companyStatus || '').toLowerCase() === 'closed') {
      return { ok: false, reason: 'Open an active company before staging a price.' };
    }
    const product = list(g.products).find((item) => item && String(item.id) === String(productId) && item.kind === 'goods');
    if (!product) return { ok: false, reason: 'That product is no longer available. Reopen the planner and try again.' };
    const scenario = calculateMarketScenario(g, selectedPriceAdjustment, selectedMarketingFactor);
    const row = scenario.available && scenario.rows.find((item) => item.id === String(productId));
    if (!row || selectedPriceAdjustment === 0 || row.proposedPrice === row.currentPrice) return { ok: false, reason: 'Choose a price scenario that changes the current selling price before staging it.' };
    try { if (typeof navSet === 'function') navSet('operations'); }
    catch (_) { return { ok: false, reason: 'Operations could not be opened. No price was changed.' }; }
    let inputs = [];
    try { inputs = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-price-input]')) : []; } catch (_) {}
    const input = inputs.find((candidate) => candidate && candidate.getAttribute && candidate.getAttribute('data-price-input') === String(productId));
    if (!input) return { ok: false, reason: 'Operations opened, but its price field could not be found. No price was changed.' };
    input.value = row.proposedPrice.toFixed(2);
    try { if (typeof Event === 'function' && input.dispatchEvent) input.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { if (input.scrollIntoView) input.scrollIntoView({ behavior: 'auto', block: 'center' }); if (input.focus) input.focus(); } catch (_) {}
    try { if (typeof notify === 'function') notify(`Scenario price ${money(row.proposedPrice, g)} loaded into Operations for ${product.name}. It is not saved yet; review it and choose “Save selling price” to apply it.`); } catch (_) {}
    return { ok: true, productId: String(productId), proposedPrice: row.proposedPrice, saved: false };
  }
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
      <div class="rw11-head"><div><p class="rw11-kicker">REALWORLD · MANAGEMENT REVIEW</p><h3>Weekly Command Center</h3><p class="rw11-subtitle">${escapeHTML(g.company || 'Unnamed company')} · Week ${week}${g.date ? ` · ${escapeHTML(g.date)}` : ''}</p></div><span class="rw11-build">Layer 11.7</span></div>
      <p class="rw11-disclosure">A read-only review of available company records. Suggestions are not transactions, compliance advice, or a guarantee that every risk has been detected.</p>
      <div class="rw11-metrics"><div><strong>${escapeHTML(money(g.cash, g))}</strong><span>Recorded cash</span></div><div><strong>${last ? escapeHTML(money(last.net, g)) : '—'}</strong><span>${last ? `Latest recorded net · Week ${escapeHTML(last.week == null ? '—' : last.week)}` : 'No recorded weekly net yet'}</span></div><div><strong>${items.length}</strong><span>Priority review items</span></div><div><strong>${activeEventCount} / ${queuedJobsCount}</strong><span>Active events / queued jobs</span></div></div>
      <div class="rw11-section-head"><h4>Priority review queue</h4><span>${reviewedCount}/${items.length} reviewed this week</span></div>
      <div class="rw11-list">${itemRows}</div>
      <details class="rw11-diagnostics"><summary>Integrated module status</summary><ul>${moduleRows.map((row) => `<li>${escapeHTML(row)}</li>`).join('')}</ul><p>Loader target: pinned Layer 6.0 engine. The public loader does not import the former Layer 8.3 downloaded-model module.</p></details>
      <p class="rw11-status" data-testid="rw11-command-center-status" role="status" aria-live="polite">${escapeHTML(lastStatusMessage || 'Review markings are scoped to this company and this simulation week.')}</p><p class="rw11-foot">Marking an item reviewed records only the review label, date, and week in this company’s saved simulation state. It does not increase a score, move money, change inventory, or mark legal compliance.</p>
    </section>`;
  }

  const CSS = `
    .rw11-market-lab{margin:16px 0;padding:16px;border:1px solid var(--line,#344039);border-radius:14px;background:var(--panel,#19211e);color:var(--text,#edf2eb);min-width:0}
    .rw11-market-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.rw11-market-head h3{margin:0 0 5px;font-size:16px}.rw11-market-note{font-size:11px;line-height:1.55;color:var(--muted,#aab5aa);margin:6px 0 12px}.rw11-market-tag{font-size:10px;font-weight:800;border:1px solid var(--line,#344039);border-radius:99px;padding:4px 8px;white-space:nowrap}
    .rw11-market-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.rw11-market-controls label{display:block;font-size:11px;font-weight:800;margin-bottom:5px}.rw11-market-controls select{width:100%;min-width:0;min-height:40px;padding:8px;background:var(--panel2,#202a25);color:var(--text,#edf2eb);border:1px solid var(--line,#344039);border-radius:8px;font:inherit;font-size:12px}
    .rw11-market-stage-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0;padding:10px;border:1px solid var(--line,#344039);border-radius:10px;font-size:11px}.rw11-market-stage-row span{color:var(--muted,#aab5aa)}.rw11-market-stage-row strong{color:var(--text,#edf2eb)}.rw11-market-stage-row button:disabled{opacity:.48;cursor:not-allowed}.rw11-market-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}.rw11-market-summary>div{min-width:0;padding:11px;border:1px solid var(--line,#344039);border-radius:10px;background:var(--panel2,#202a25)}.rw11-market-summary span{display:block;font-size:10px;color:var(--muted,#aab5aa);line-height:1.45}.rw11-market-summary strong{display:block;margin-top:5px;font-size:13px;overflow-wrap:anywhere}.rw11-positive{color:var(--success,#bad5a6)}.rw11-negative{color:var(--danger,#e8a19b)}.rw11-muted{font-size:10px;color:var(--muted,#aab5aa);margin-top:4px}.rw11-market-table-wrap{overflow-x:auto;border:1px solid var(--line,#344039);border-radius:10px}.rw11-market-table{width:100%;border-collapse:collapse;min-width:760px;font-size:11px}.rw11-market-table th,.rw11-market-table td{padding:10px;text-align:left;border-bottom:1px solid var(--line,#344039);vertical-align:top}.rw11-market-table th{font-size:10px;color:var(--muted,#aab5aa);background:var(--panel2,#202a25)}.rw11-market-table tr:last-child td{border-bottom:0}.rw11-market-table button:disabled{opacity:.48;cursor:not-allowed}.rw11-market-lab button:focus-visible,.rw11-market-lab select:focus-visible{outline:3px solid var(--blue,#78aebe);outline-offset:2px}
    @media(max-width:600px){.rw11-market-lab{padding:12px}.rw11-market-controls,.rw11-market-summary{grid-template-columns:1fr}.rw11-market-head{gap:8px}.rw11-market-summary strong{font-size:12px}.rw11-market-stage-row{align-items:stretch;flex-direction:column}}
    .rw11-panel{margin:16px 0;padding:16px;border:1px solid var(--line,#344039);border-radius:14px;background:var(--panel,#19211e);color:var(--text,#edf2eb);min-width:0}
    .rw11-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}.rw11-head h3{font-size:16px;margin:0 0 4px}.rw11-kicker{font-size:10px;font-weight:800;letter-spacing:.08em;color:var(--muted,#aab5aa);margin:0 0 5px}.rw11-subtitle,.rw11-disclosure,.rw11-foot{color:var(--muted,#aab5aa);font-size:11px;line-height:1.5;margin:4px 0 11px}.rw11-build{white-space:nowrap;font-size:10px;font-weight:800;border:1px solid var(--line,#344039);border-radius:99px;padding:4px 8px}
    .rw11-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.rw11-metrics>div{min-width:0;background:var(--panel2,#202a25);border:1px solid var(--line,#344039);border-radius:10px;padding:10px}.rw11-metrics strong{display:block;font-size:13px;line-height:1.35;overflow-wrap:anywhere}.rw11-metrics span{display:block;color:var(--muted,#aab5aa);font-size:10px;margin-top:4px;line-height:1.45}
    .rw11-section-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-top:16px}.rw11-section-head h4{font-size:13px;margin:0 0 8px}.rw11-section-head span{font-size:10px;color:var(--muted,#aab5aa)}.rw11-list{display:grid;gap:8px}.rw11-item{border:1px solid var(--line,#344039);border-radius:10px;padding:11px;min-width:0}.rw11-item-head{display:flex;align-items:flex-start;gap:8px}.rw11-item-head strong{font-size:12px;line-height:1.45}.rw11-severity{flex-shrink:0;font-size:9px;letter-spacing:.03em;font-weight:900;border-radius:99px;border:1px solid var(--line,#344039);padding:3px 6px}.rw11-high .rw11-severity{border-color:var(--danger,#bd7373)}.rw11-medium .rw11-severity{border-color:var(--accent,#bad5a6)}.rw11-item p{font-size:11px;line-height:1.5;color:var(--muted,#aab5aa);margin:6px 0 0;overflow-wrap:anywhere}.rw11-item p b{color:var(--text,#edf2eb)}.rw11-item-actions{display:flex;justify-content:flex-end;margin-top:9px}.rw11-item-actions button{min-height:36px}.rw11-reviewed{font-size:10px;font-weight:800;color:var(--muted,#aab5aa);padding:7px 0}.rw11-diagnostics{margin-top:12px;border-top:1px solid var(--line,#344039);padding-top:10px;font-size:11px}.rw11-diagnostics summary{cursor:pointer;font-weight:800}.rw11-diagnostics li,.rw11-diagnostics p{color:var(--muted,#aab5aa);margin-top:5px;overflow-wrap:anywhere}.rw11-foot{margin:12px 0 0}
    .rw11-panel button:focus-visible,.rw11-panel summary:focus-visible{outline:3px solid var(--blue,#78aebe);outline-offset:2px}
    .rw11-strategy-panel{margin-top:18px}.rw11-strategy-baseline{display:grid;gap:4px;margin:12px 0;padding:12px;border:1px solid var(--line,#344039);border-radius:10px;background:var(--panel2,#202a25)}.rw11-strategy-baseline>span{font-size:10px;color:var(--muted,#aab5aa)}.rw11-strategy-baseline>strong{font-size:16px}.rw11-strategy-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:12px 0}.rw11-strategy-card{display:flex;flex-direction:column;gap:7px;min-width:0;padding:12px;border:1px solid var(--line,#344039);border-radius:11px;background:var(--panel2,#202a25)}.rw11-strategy-card h4{font-size:12px;margin:0}.rw11-strategy-card p{font-size:10px;line-height:1.45;color:var(--muted,#aab5aa);margin:0}.rw11-strategy-card-head{display:flex;justify-content:space-between;gap:6px;align-items:center}.rw11-current-tag{font-size:9px;font-weight:800;border:1px solid var(--accent,#bad5a6);border-radius:99px;padding:2px 5px}.rw11-strategy-meta{display:flex;flex-direction:column;gap:2px}.rw11-strategy-meta span{font-size:9px;color:var(--muted,#aab5aa)}.rw11-strategy-meta strong{font-size:11px;overflow-wrap:anywhere}.rw11-strategy-result{display:flex;flex-direction:column;gap:3px;margin-top:auto;padding:8px 0;border-top:1px solid var(--line,#344039)}.rw11-strategy-result span{font-size:9px;color:var(--muted,#aab5aa)}.rw11-strategy-result strong{font-size:12px;overflow-wrap:anywhere}.rw11-strategy-card button{margin-top:4px}.rw11-growth-current{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0}.rw11-growth-current>div{min-width:0;padding:10px;border:1px solid var(--line,#344039);border-radius:9px;background:var(--panel2,#202a25)}.rw11-growth-current span{display:block;color:var(--muted,#aab5aa);font-size:9px;line-height:1.4}.rw11-growth-current strong{display:block;margin-top:4px;font-size:11px;overflow-wrap:anywhere}.rw11-expansion-table{min-width:660px}.rw11-competitor-table{min-width:560px}.rw11-expansion-table td:last-child{min-width:135px}.rw11-strategy-card button:disabled,.rw11-strategy-panel button:disabled{opacity:.48;cursor:not-allowed}
    @media(max-width:600px){.rw11-strategy-grid{grid-template-columns:1fr}.rw11-growth-current{grid-template-columns:1fr}.rw11-strategy-card{gap:8px}}
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
  function stageScenarioMarketingBudget() {
    const g = currentGame();
    if (!activeBusiness(g)) return { ok: false, reason: 'Open an active company before staging a marketing budget.' };
    const scenario = calculateMarketScenario(g, selectedPriceAdjustment, selectedMarketingFactor);
    if (!scenario.available || selectedMarketingFactor === 1 || scenario.targetMarketing === scenario.currentMarketing) return { ok: false, reason: 'Choose a marketing scenario that changes the current weekly budget before staging it.' };
    const stagedMarketing = stageableMarketingTarget(scenario.targetMarketing, g);
    if (stagedMarketing === scenario.currentMarketing) return { ok: false, reason: 'The nearest valid budget amount equals the current budget. Use the existing budget field to choose another accepted amount.' };
    try { if (typeof navSet === 'function') navSet('market'); }
    catch (_) { return { ok: false, reason: 'Market & Sales could not be opened. No budget was changed.' }; }
    let input = null;
    try { input = document.querySelector ? document.querySelector('#marketing-budget') : null; } catch (_) {}
    if (!input) return { ok: false, reason: 'Market & Sales opened, but its weekly marketing field could not be found. No budget was changed.' };
    input.value = stagedMarketing.toFixed(2);
    try { if (typeof Event === 'function' && input.dispatchEvent) input.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { if (input.scrollIntoView) input.scrollIntoView({ behavior: 'auto', block: 'center' }); if (input.focus) input.focus(); } catch (_) {}
    const rounded = stagedMarketing !== scenario.targetMarketing;
    const message = rounded
      ? `Scenario target ${money(scenario.targetMarketing, g)} was rounded to the nearest accepted budget step, ${money(stagedMarketing, g)}, in Market & Sales. It is not saved yet; review and explicitly update the weekly budget to apply the staged value.`
      : `Scenario marketing budget ${money(stagedMarketing, g)} loaded into Market & Sales. It is not saved yet; review it and explicitly update the weekly budget to apply the change.`;
    try { if (typeof notify === 'function') notify(message); } catch (_) {}
    return { ok: true, targetMarketing: scenario.targetMarketing, stagedMarketing, rounded, saved: false };
  }

  function calculateCompetitiveStrategies(g = currentGame()) {
    if (!ownObject(g)) return { available: false, reason: 'Open a company before comparing market strategies.', profiles: [] };
    const baseline = calculateMarketScenario(g, 0, 1);
    if (!baseline.available) return { available: false, reason: baseline.reason, profiles: [] };
    const originalHasStrategy = Object.prototype.hasOwnProperty.call(g, 'marketStrategy');
    const originalStrategy = g.marketStrategy;
    const baselinePotential = baseline.scenarioAfterMarketing;
    const profiles = [];
    for (const profile of COMPETITIVE_PROFILES) {
      let scenario = null;
      let error = null;
      try {
        // The engine's existing estimator reads the active game's marketStrategy. Temporarily
        // evaluate the profile synchronously, then restore the exact saved value in finally.
        g.marketStrategy = profile.strategy;
        scenario = calculateMarketScenario(g, profile.priceAdjustment, profile.marketingFactor);
      } catch (caught) {
        error = caught;
      } finally {
        try {
          if (originalHasStrategy) g.marketStrategy = originalStrategy;
          else delete g.marketStrategy;
        } catch (_) {}
      }
      if (error || !scenario || !scenario.available) {
        return { available: false, reason: (scenario && scenario.reason) || 'The core demand estimator could not compare every market strategy.', profiles: [] };
      }
      profiles.push({
        id: profile.id, title: profile.title, strategy: profile.strategy,
        priceAdjustment: profile.priceAdjustment, marketingFactor: profile.marketingFactor,
        summary: profile.summary, current: String(originalStrategy || 'balanced') === profile.strategy,
        targetMarketing: scenario.targetMarketing,
        projectedAfterMarketing: scenario.scenarioAfterMarketing,
        baselinePotential,
        changeVsCurrent: scenario.scenarioAfterMarketing - baselinePotential,
        rows: scenario.rows
      });
    }
    // Defensive restoration even if a future estimator or profile addition exits early.
    try {
      if (originalHasStrategy) g.marketStrategy = originalStrategy;
      else delete g.marketStrategy;
    } catch (_) {}
    return {
      available: true, actualStrategy: String(originalStrategy || 'balanced'), baselinePotential,
      profiles, bestModeled: profiles.reduce((best, row) => !best || row.projectedAfterMarketing > best.projectedAfterMarketing ? row : best, null),
      note: 'This is a one-week contribution proxy from the core demand estimator, not profit. Inventory availability, capacity, customer loyalty over time, fulfilment limits, payroll, rent, utilities, taxes, financing and future competitor moves are not fully projected.'
    };
  }

  function growthPlanningState(g = currentGame()) {
    const extension = getExtension(g);
    const growth = ownObject(extension.growth) ? extension.growth : {};
    const units = Math.max(0, Math.floor(finite(growth.units, 0) || 0));
    const lastWeek = Math.max(0, Math.floor(finite(growth.lastWeek, 0) || 0));
    const cooldown = lastWeek ? Math.max(0, 4 - (weekNumber(g) - lastWeek)) : 0;
    const minimum = modelAmount(5000, 5000);
    const maximum = modelAmount(5000000, 5000000);
    const cash = Math.max(0, finite(g && g.cash, 0) || 0);
    const canAdd = activeBusiness(g) && units < 5 && cooldown === 0;
    return {
      units, lastWeek, cooldown, minimum, maximum, cash,
      invested: Math.max(0, finite(growth.invested, 0) || 0),
      monthlyUtilityIncrease: Math.max(0, finite(growth.monthlyUtilityIncrease, 0) || 0),
      canAdd,
      reason: !activeBusiness(g) ? 'Closed or bankrupt companies cannot invest.' : units >= 5 ? 'The five-unit expansion limit has been reached.' : cooldown > 0 ? `Wait ${cooldown} more week(s) between capacity investments.` : ''
    };
  }

  function buildExpansionStrategyLab(g = currentGame()) {
    if (!ownObject(g)) return `<section class="rw11-panel" data-testid="rw11-expansion-strategy-lab"><h3>Expansion &amp; Competitive Strategy</h3><p>Open a company to compare modeled market positions and stage a capacity-investment decision.</p></section>`;
    const comparison = calculateCompetitiveStrategies(g);
    const strategyState = growthPlanningState(g);
    const goods = list(g.products).filter((product) => ownObject(product) && product.kind === 'goods' && finite(product.price) !== null && finite(product.price) > 0);
    const competitorRows = goods.map((product) => {
      const rival = finite(product.competitorPrice);
      const price = Math.max(0, finite(product.price, 0) || 0);
      const cost = scenarioUnitCost(product);
      const gap = rival !== null && rival > 0 ? (price / rival - 1) * 100 : null;
      const label = gap === null ? 'No rival reference recorded' : gap < -1 ? 'Below rival reference' : gap > 1 ? 'Above rival reference' : 'Near rival reference';
      return `<tr><td><strong>${escapeHTML(product.name || product.id || 'Unnamed offer')}</strong></td><td>${escapeHTML(money(price, g))}</td><td>${rival !== null && rival > 0 ? escapeHTML(money(rival, g)) : '—'}</td><td>${gap === null ? '—' : `${gap > 0 ? '+' : ''}${gap.toFixed(1)}%`}<div class="rw11-muted">${escapeHTML(label)}</div></td><td>${price > 0 ? `${Math.round((price - cost) / price * 100)}%` : '—'}</td></tr>`;
    }).join('');
    const profileCards = comparison.available ? comparison.profiles.map((profile) => {
      const delta = profile.changeVsCurrent;
      const stagedMarketing = stageableMarketingTarget(profile.targetMarketing, g);
      const currentLabel = profile.current ? '<span class="rw11-current-tag">Current</span>' : '';
      return `<article class="rw11-strategy-card"><div class="rw11-strategy-card-head"><h4>${escapeHTML(profile.title)}</h4>${currentLabel}</div><p>${escapeHTML(profile.summary)}</p><div class="rw11-strategy-meta"><span>Core positioning</span><strong>${escapeHTML(profile.strategy.charAt(0).toUpperCase() + profile.strategy.slice(1))}</strong></div><div class="rw11-strategy-meta"><span>Price scenario</span><strong>${profile.priceAdjustment > 0 ? '+' : ''}${profile.priceAdjustment}%</strong></div><div class="rw11-strategy-meta"><span>Weekly marketing</span><strong>${escapeHTML(money(profile.targetMarketing, g))}${stagedMarketing !== profile.targetMarketing ? ` <span class="rw11-muted">(stages to ${escapeHTML(money(stagedMarketing, g))})</span>` : ''}</strong></div><div class="rw11-strategy-result"><span>Modeled contribution after marketing</span><strong>${escapeHTML(money(profile.projectedAfterMarketing, g))}</strong><span class="${delta >= 0 ? 'rw11-positive' : 'rw11-negative'}">${delta > 0 ? '+' : ''}${escapeHTML(money(delta, g))} vs current setup</span></div><button type="button" class="secondary-btn small-btn" data-rw11-stage-profile="${escapeHTML(profile.id)}" ${activeBusiness(g) ? '' : 'disabled'}>Stage this strategy</button></article>`;
    }).join('') : `<p class="rw11-market-note">${escapeHTML(comparison.reason || 'This comparison needs priced physical-goods offers and the core demand estimator. The existing native Market positioning form remains available for supported companies.')}</p>`;
    const tiers = [25000, 50000, 100000].map((nominal) => modelAmount(nominal, nominal));
    const expansionRows = tiers.map((amount) => {
      const monthlyUtilities = roundScenarioMoney(amount * 0.008);
      const after = strategyState.cash - amount;
      const canStage = strategyState.canAdd && amount >= strategyState.minimum && amount <= strategyState.maximum && amount <= strategyState.cash;
      const reason = !strategyState.canAdd ? strategyState.reason : amount < strategyState.minimum ? `Minimum is ${money(strategyState.minimum, g)}.` : amount > strategyState.cash ? 'Not affordable from recorded cash.' : amount > strategyState.maximum ? 'Above the fixed-asset investment limit.' : '';
      return `<tr><td><strong>${escapeHTML(money(amount, g))}</strong><div class="rw11-muted">One expansion unit</div></td><td>+5 base capacity per close</td><td>${escapeHTML(money(monthlyUtilities, g))}/month</td><td class="${after < 0 ? 'rw11-negative' : ''}">${escapeHTML(money(after, g))}</td><td><button type="button" class="secondary-btn small-btn" data-rw11-stage-growth="${amount.toFixed(2)}" ${canStage ? '' : 'disabled'}>${canStage ? 'Stage amount' : 'Unavailable'}</button>${reason ? `<div class="rw11-muted">${escapeHTML(reason)}</div>` : ''}</td></tr>`;
    }).join('');
    const status = !activeBusiness(g) ? 'Business is closed or bankrupt; all strategy controls are review-only.'
      : strategyState.units >= 5 ? 'The maximum of five expansion units is already installed.'
      : strategyState.cooldown > 0 ? `Next capacity investment is available after ${strategyState.cooldown} more week(s).`
      : 'Staging only fills the existing Layer 9 investment input. The core investment form and its confirmation remain required.';
    return `<section class="rw11-panel rw11-strategy-panel" data-testid="rw11-expansion-strategy-lab" aria-label="Expansion and competitive strategy planner">
      <div class="rw11-head"><div><p class="rw11-kicker">COMPETITION · CAPACITY · CAPITAL ALLOCATION</p><h3>Expansion &amp; Competitive Strategy</h3><p class="rw11-subtitle">Compare three practical market positions against this company’s simulated demand data, review rival reference prices, and prepare a capacity investment without committing it here.</p></div><span class="rw11-build">Preview only</span></div>
      ${comparison.available ? `<div class="rw11-strategy-baseline"><span>Current modeled contribution after marketing</span><strong>${escapeHTML(money(comparison.baselinePotential, g))}</strong><span>Highest one-week scenario: <b>${escapeHTML(comparison.bestModeled.title)}</b> at ${escapeHTML(money(comparison.bestModeled.projectedAfterMarketing, g))}. This is a modeled comparison, not a guaranteed winner.</span></div><div class="rw11-strategy-grid">${profileCards}</div><p class="rw11-foot">${escapeHTML(comparison.note)}</p>` : profileCards}
      <div class="rw11-section-head"><h4>Competitive price reference</h4><span>From the saved simulation market</span></div>
      ${competitorRows ? `<div class="rw11-market-table-wrap"><table class="rw11-market-table rw11-competitor-table"><thead><tr><th>Offer</th><th>Your price</th><th>Rival reference</th><th>Price gap</th><th>Unit margin</th></tr></thead><tbody>${competitorRows}</tbody></table></div>` : '<p class="rw11-market-note">No priced physical-goods offers are available for a competitor-price comparison. The native market-positioning control remains part of Market &amp; Sales.</p>'}
      <div class="rw11-section-head"><h4>Capacity expansion planner</h4><span>${strategyState.units}/5 units installed · +${strategyState.units * 5} capacity per close</span></div>
      <div class="rw11-growth-current"><div><span>Capitalized investment</span><strong>${escapeHTML(money(strategyState.invested, g))}</strong></div><div><span>Additional monthly utilities</span><strong>${escapeHTML(money(strategyState.monthlyUtilityIncrease, g))}</strong></div><div><span>Recorded cash</span><strong>${escapeHTML(money(strategyState.cash, g))}</strong></div></div>
      <div class="rw11-market-table-wrap"><table class="rw11-market-table rw11-expansion-table"><thead><tr><th>Investment option</th><th>Added modeled capacity</th><th>Additional utilities</th><th>Cash after outlay*</th><th>Action</th></tr></thead><tbody>${expansionRows}</tbody></table></div>
      <p class="rw11-status" data-testid="rw11-expansion-strategy-status" role="status" aria-live="polite">${escapeHTML(status)}</p><p class="rw11-foot">*Cash after outlay subtracts only the proposed capital purchase; it does not forecast future receipts, payables or reserve coverage. Growth investment is capitalized through the existing fixed-asset flow and adds modeled monthly utilities equal to 0.8% of the amount. New controls never change prices, spend marketing, purchase assets, or post journals automatically.</p>
    </section>`;
  }

  function stageCompetitiveProfile(profileId) {
    const g = currentGame();
    if (!activeBusiness(g)) return { ok: false, reason: 'Open an active company before staging a strategy.' };
    const profile = COMPETITIVE_PROFILES.find((row) => row.id === String(profileId));
    if (!profile) return { ok: false, reason: 'That strategy profile is unavailable. Refresh the planner and try again.' };
    const previousPrice = selectedPriceAdjustment;
    const previousMarketing = selectedMarketingFactor;
    selectedPriceAdjustment = profile.priceAdjustment;
    selectedMarketingFactor = profile.marketingFactor;
    try { if (typeof navSet === 'function') navSet('market'); }
    catch (_) { selectedPriceAdjustment = previousPrice; selectedMarketingFactor = previousMarketing; return { ok: false, reason: 'Market & Sales could not be opened. No strategy was changed.' }; }
    let input = null;
    try { input = document.querySelector ? document.querySelector('#market-strategy') : null; } catch (_) {}
    if (!input) {
      selectedPriceAdjustment = previousPrice; selectedMarketingFactor = previousMarketing;
      try { if (typeof renderView === 'function') renderView(); } catch (_) {}
      return { ok: false, reason: 'Market & Sales opened, but the existing positioning control could not be found. No strategy was saved.' };
    }
    input.value = profile.strategy;
    try { if (input.scrollIntoView) input.scrollIntoView({ behavior: 'auto', block: 'center' }); if (input.focus) input.focus(); } catch (_) {}
    const message = `${profile.title} staged in Market & Sales only: ${profile.priceAdjustment > 0 ? '+' : ''}${profile.priceAdjustment}% price scenario and ${Math.round((profile.marketingFactor - 1) * 100) > 0 ? '+' : ''}${Math.round((profile.marketingFactor - 1) * 100)}% marketing scenario selected. The market-positioning form, each price, and the budget must still be explicitly submitted.`;
    try { if (typeof notify === 'function') notify(message); } catch (_) {}
    return { ok: true, profile: profile.id, strategy: profile.strategy, priceAdjustment: profile.priceAdjustment, marketingFactor: profile.marketingFactor, saved: false };
  }

  function stageGrowthInvestment(amountValue) {
    const g = currentGame();
    if (!activeBusiness(g)) return { ok: false, reason: 'Open an active company before staging a capacity investment.' };
    const state = growthPlanningState(g);
    const amount = roundScenarioMoney(Number(amountValue));
    if (!Number.isFinite(amount) || amount < state.minimum || amount > state.maximum || amount > state.cash) return { ok: false, reason: `Choose an investment from ${money(state.minimum, g)} through the available cash limit of ${money(Math.min(state.maximum, state.cash), g)}.` };
    if (!state.canAdd) return { ok: false, reason: state.reason || 'Capacity investment is not currently available.' };
    try { if (typeof navSet === 'function') navSet('dashboard'); }
    catch (_) { return { ok: false, reason: 'Dashboard could not be opened. No investment was changed.' }; }
    let input = null;
    try { input = document.querySelector ? document.querySelector('#rw9-growth-amount') : null; } catch (_) {}
    if (!input || input.disabled) return { ok: false, reason: 'The existing growth investment field is unavailable or disabled. No investment was changed.' };
    input.value = amount.toFixed(2);
    try { if (typeof Event === 'function' && input.dispatchEvent) input.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { if (input.scrollIntoView) input.scrollIntoView({ behavior: 'auto', block: 'center' }); if (input.focus) input.focus(); } catch (_) {}
    const message = `Capacity investment of ${money(amount, g)} staged in the existing growth form. It is not saved or purchased yet; review the cash preview, submit “Review & invest in capacity”, and confirm the existing investment dialog to apply it.`;
    try { if (typeof notify === 'function') notify(message); } catch (_) {}
    return { ok: true, amount, saved: false };
  }

  function wrapRenderers() {
    if (typeof renderDashboard === 'function' && !renderDashboard.__rw11Wrapped) {
      const old = renderDashboard;
      const wrapped = function () { const html = old.apply(this, arguments); return insertBeforeAnchor(html, panelHTML() + buildExpansionStrategyLab()); };
      wrapped.__rw11Wrapped = true; baseRenderDashboard = old; renderDashboard = wrapped;
    }
    if (typeof renderReports === 'function' && !renderReports.__rw11Wrapped) {
      const old = renderReports;
      const wrapped = function () { const html = old.apply(this, arguments); return insertBeforeAnchor(html, panelHTML()); };
      wrapped.__rw11Wrapped = true; baseRenderReports = old; renderReports = wrapped;
    }
    if (typeof renderMarket === 'function' && !renderMarket.__rw11Wrapped) {
      const old = renderMarket;
      const wrapped = function () { const html = old.apply(this, arguments); return insertMarketLab(html); };
      wrapped.__rw11Wrapped = true; renderMarket = wrapped;
    }
    if (typeof renderView === 'function' && !renderView.__rw11Wrapped) {
      const old = renderView;
      const wrapped = function () { const result = old.apply(this, arguments); return result; };
      wrapped.__rw11Wrapped = true; baseRenderView = old; renderView = wrapped;
    }
  }
  function handleClick(event) {
    const origin = event.target && event.target.closest ? event.target : null;
    if (!origin) return;
    const marketingStageTarget = origin.closest('[data-rw11-stage-marketing]');
    if (marketingStageTarget) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const result = stageScenarioMarketingBudget();
      if (!result.ok) {
        lastStatusMessage = result.reason;
        try { if (typeof notify === 'function') notify(result.reason, 'warn'); } catch (_) {}
      } else {
        lastStatusMessage = 'Scenario marketing budget staged in Market & Sales but not saved. Review the value and explicitly update the weekly budget to apply the change.';
      }
      return;
    }
    const profileTarget = origin.closest('[data-rw11-stage-profile]');
    if (profileTarget) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const result = stageCompetitiveProfile(profileTarget.getAttribute('data-rw11-stage-profile'));
      if (!result.ok) {
        lastStatusMessage = result.reason;
        try { if (typeof notify === 'function') notify(result.reason, 'warn'); } catch (_) {}
      } else {
        lastStatusMessage = 'Competitive strategy staged only. Review and explicitly submit the existing market-positioning, price and marketing forms.';
      }
      return;
    }
    const growthTarget = origin.closest('[data-rw11-stage-growth]');
    if (growthTarget) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const result = stageGrowthInvestment(growthTarget.getAttribute('data-rw11-stage-growth'));
      if (!result.ok) {
        lastStatusMessage = result.reason;
        try { if (typeof notify === 'function') notify(result.reason, 'warn'); } catch (_) {}
      } else {
        lastStatusMessage = 'Expansion amount staged in the existing growth form. No investment has been purchased.';
      }
      return;
    }
    const stageTarget = origin.closest('[data-rw11-stage-price]');
    if (stageTarget) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const result = stageScenarioPrice(stageTarget.getAttribute('data-rw11-stage-price'));
      if (!result.ok) {
        lastStatusMessage = result.reason;
        try { if (typeof notify === 'function') notify(result.reason, 'warn'); } catch (_) {}
      } else {
        lastStatusMessage = 'Scenario price staged in Operations but not saved. Review the value and explicitly save it to apply the change.';
      }
      return;
    }
    const target = origin.closest('[data-rw11-action="review"]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const result = markReviewed(target.getAttribute('data-rw11-key'));
    lastStatusMessage = result.ok
      ? (result.saveRequested ? 'Review logged for this company and save requested.' : 'Review logged for this company in the current session.')
      : result.reason;
    try { if (typeof renderView === 'function') renderView(); } catch (error) { console.warn('Layer 11 review refresh warning', error); }
  }
  function handleScenarioChange(event) {
    const target = event.target;
    if (!target || !target.getAttribute) return;
    if (target.getAttribute('data-rw11-price-adjustment') !== null) {
      const value = Number(target.value);
      if (!PRICE_ADJUSTMENTS.includes(value)) return;
      selectedPriceAdjustment = value;
    } else if (target.getAttribute('data-rw11-marketing-factor') !== null) {
      const value = Number(target.value);
      if (!MARKETING_FACTORS.includes(value)) return;
      selectedMarketingFactor = value;
    } else return;
    try { if (typeof renderView === 'function') renderView(); } catch (error) { console.warn('Layer 11 pricing scenario refresh warning', error); }
  }
  function init() {
    if (initialized) return;
    initialized = true;
    try {
      const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    } catch (_) {}
    wrapRenderers();
    document.addEventListener('click', handleClick, true);
    document.addEventListener('change', handleScenarioChange, true);
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
    buildMarketLab,
    buildExpansionStrategyLab,
    calculateMarketScenario,
    calculateCompetitiveStrategies,
    stageScenarioMarketingBudget,
    stageCompetitiveProfile,
    stageGrowthInvestment,
    hasReviewed,
    markReviewed,
    moduleStatus,
    getState: () => ({ initialized, build: BUILD, wrappedDashboard: !!(typeof renderDashboard === 'function' && renderDashboard.__rw11Wrapped), wrappedReports: !!(typeof renderReports === 'function' && renderReports.__rw11Wrapped), wrappedMarket: !!(typeof renderMarket === 'function' && renderMarket.__rw11Wrapped) }),
    init
  };
  window.REALWORLD_LAYER11 = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
