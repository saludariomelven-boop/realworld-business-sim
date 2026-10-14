/*
 * REALWORLD Layer 9.0 — Integrated Business Systems & Continuity
 * Additive enhancement for the pinned Layer 6 core + accepted Layers 7/8.
 * Company-specific state is saved inside the existing v8 game save envelope.
 * Forecast/explanation panels are read-only; booked specialist jobs use core journal helpers.
 */
(function realworldLayer9() {
  'use strict';

  const BUILD_LABEL = 'RW-LAYER-9.0 · Integrated Business Systems & Continuity · 2026-10-14';
  const LOGISTICS_TEMPLATE = 'logistics-delivery';
  const MAX_JOBS = 500;
  const MAX_EVENT_HISTORY = 40;
  const MAX_COUNTRY_REVIEWS = 6;
  const MAX_GROWTH_UNITS = 5;
  const COUNTRY_REVIEW_ITEMS = [
    { id: 'business-name', title: 'Business name and registration route', body: 'Check the business-name or entity route that applies to this legal form.', source: 'DTI Business Name Registration System', url: 'https://bnrs.dti.gov.ph/' },
    { id: 'tax-registration', title: 'Tax registration and bookkeeping', body: 'Check current registration, invoicing, recordkeeping, and filing guidance for this business.', source: 'Bureau of Internal Revenue', url: 'https://www.bir.gov.ph/' },
    { id: 'employer-obligations', title: 'Employer and payroll obligations', body: 'Review employer registration and current contribution guidance if staff are employed.', source: 'Social Security System — Employer', url: 'https://www.sss.gov.ph/employer-er/' },
    { id: 'local-permits', title: 'Local permits and location requirements', body: 'Confirm the requirements published by the relevant city or municipality and the business location.', source: 'Philippine Business Hub', url: 'https://business.gov.ph/home' }
  ];
  const EVENT_CATALOG = {
    'demand-downturn': { id: 'demand-downturn', title: 'Demand downturn', category: 'Demand', duration: 3, demandFactor: 0.80, capacityFactor: 1, serviceCostFactor: 1, description: 'Modeled customer demand is about 20% below the usual baseline for three operating closes.' },
    'demand-surge': { id: 'demand-surge', title: 'Demand surge', category: 'Demand', duration: 2, demandFactor: 1.15, capacityFactor: 1, serviceCostFactor: 1, description: 'Modeled customer demand is about 15% above the usual baseline for two operating closes.' },
    'service-cost-pressure': { id: 'service-cost-pressure', title: 'Service input-cost pressure', category: 'Costs', duration: 2, demandFactor: 1, capacityFactor: 1, serviceCostFactor: 1.12, description: 'Modeled service-delivery variable costs are 12% higher for two operating closes.' },
    'capacity-shortage': { id: 'capacity-shortage', title: 'Temporary capacity shortage', category: 'Capacity', duration: 2, demandFactor: 1, capacityFactor: 0.80, serviceCostFactor: 1, description: 'Effective operating capacity is 20% lower for two operating closes.' },
    'supplier-disruption': { id: 'supplier-disruption', title: 'Supplier disruption', category: 'Supply', duration: 1, demandFactor: 1, capacityFactor: 1, serviceCostFactor: 1, description: 'Some eligible open purchase orders have had their modeled ETA extended by one week.' }
  };
  const EVENT_IDS = Object.keys(EVENT_CATALOG);
  const CSS = `
  .rw9-panel{margin:16px 0;padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--panel);color:var(--text);min-width:0}
  .rw9-panel h3{font-size:14px;margin:0 0 5px}.rw9-subtitle{font-size:11px;color:var(--muted);line-height:1.5;margin:0 0 12px}.rw9-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.rw9-stat{padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);min-width:0}.rw9-stat strong{display:block;font-size:15px;overflow-wrap:anywhere}.rw9-stat span{display:block;color:var(--muted);font-size:10px;margin-top:3px}.rw9-table-wrap{overflow-x:auto}.rw9-table{width:100%;border-collapse:collapse;font-size:11px;min-width:440px}.rw9-table th,.rw9-table td{padding:8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}.rw9-table th{color:var(--muted);font-weight:750}.rw9-table td.num,.rw9-table th.num{text-align:right;font-variant-numeric:tabular-nums}.rw9-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.rw9-form-grid .field{margin:0;min-width:0}.rw9-form-grid input,.rw9-form-grid select{width:100%;min-width:0}.rw9-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}.rw9-note{font-size:10px;line-height:1.5;color:var(--muted);margin:10px 0 0}.rw9-event{padding:10px;border:1px solid var(--line);border-radius:10px;margin-top:8px;background:var(--panel2)}.rw9-event strong{font-size:12px}.rw9-event p{font-size:11px;margin:4px 0 0;color:var(--muted)}.rw9-tag{display:inline-block;border:1px solid var(--line);border-radius:99px;padding:3px 7px;font-size:9px;font-weight:800;color:var(--muted)}.rw9-closed{border-color:var(--danger,#b76565)}.rw9-closed h3{color:var(--danger,#b76565)}.rw9-panel button:focus-visible,.rw9-panel input:focus-visible,.rw9-panel select:focus-visible,.rw9-panel a:focus-visible{outline:3px solid var(--blue,#78aebe);outline-offset:2px}.rw9-inline-check{display:flex;gap:8px;align-items:flex-start}.rw9-inline-check input{margin-top:4px;flex-shrink:0}.rw9-panel [disabled]{opacity:.55;cursor:not-allowed}
  @media(max-width:650px){.rw9-grid,.rw9-form-grid{grid-template-columns:1fr}.rw9-panel{padding:12px}.rw9-actions button{flex:1 1 auto}.rw9-table{min-width:500px}}
  @media(prefers-reduced-motion:reduce){.rw9-panel *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
  `;
  let initialized = false;
  let wrappedRunWeek = null;
  let baseRunWeek = null;
  let baseGetIndustry = null;
  let baseRenderers = {};
  let baseRenderAll = null;
  let runtimeReservedCapacity = 0;
  let activeRuntimeModifiers = null;
  let baseSaveGame = null;

  function currentGame() {
    try { return typeof game === 'undefined' ? null : game; } catch (_) { return null; }
  }
  function ownObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function finite(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function money2(value) { return Math.round((finite(value) + Number.EPSILON) * 100) / 100; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function isLogistics(g = currentGame()) { return !!g && g.businessTemplateId === LOGISTICS_TEMPLATE; }
  function defaultState() {
    return {
      schemaVersion: 1, closed: null, jobs: [], nextJobId: 1,
      activeEvents: [], eventHistory: [], countryReviews: [],
      growth: { units: 0, lastWeek: 0, monthlyUtilityIncrease: 0, invested: 0, assetIds: [] },
      lastJobSummary: null
    };
  }
  function ensureState(g = currentGame()) {
    if (!g) return null;
    if (!ownObject(g.realworldLayer9)) g.realworldLayer9 = defaultState();
    const s = g.realworldLayer9;
    s.schemaVersion = 1;
    if (!ownObject(s.closed) || !Number.isFinite(Number(s.closed.atWeek)) || Number(s.closed.atWeek) < 0) s.closed = null;
    else s.closed = {
      atWeek: Math.min(Math.max(0, Math.floor(Number(s.closed.atWeek))), Math.max(0, Math.floor(finite(g.week, 1)) - 1)),
      date: String(s.closed.date || '').slice(0, 20),
      cashAtClosure: clamp(money2(s.closed.cashAtClosure), -1000000000, 1000000000),
      reason: 'Voluntary player decision'
    };
    if (!Array.isArray(s.jobs)) s.jobs = [];
    s.jobs = s.jobs
      .filter((j) => ownObject(j) && typeof j.id === 'string' && /^JOB-\d{5,}$/.test(j.id) && j.id.length <= 24
        && Number.isInteger(Number(j.units)) && Number(j.units) >= 1 && Number(j.units) <= 200
        && Number.isInteger(Number(j.remainingUnits)) && Number(j.remainingUnits) >= 0 && Number(j.remainingUnits) <= Number(j.units)
        && Number.isInteger(Number(j.createdWeek)) && Number(j.createdWeek) >= 1 && Number(j.createdWeek) <= Math.max(1, Math.floor(finite(g.week, 1)))
        && Number.isInteger(Number(j.dueWeek)) && Number(j.dueWeek) >= 1 && Number(j.dueWeek) <= Number(j.createdWeek) + 4
        && Number.isFinite(Number(j.feePerUnit)) && Number(j.feePerUnit) > 0 && Number(j.feePerUnit) <= 100000000
        && Number.isFinite(Number(j.variableCostPerUnit)) && Number(j.variableCostPerUnit) >= 0 && Number(j.variableCostPerUnit) <= 100000000
        && ['queued', 'completed'].includes(j.status))
      .map((j) => ({
        id: j.id,
        createdWeek: Math.min(Math.floor(Number(j.createdWeek)), Math.max(1, Math.floor(finite(g.week, 1)))),
        dueWeek: Math.max(1, Math.floor(Number(j.dueWeek))),
        units: Math.floor(Number(j.units)),
        remainingUnits: Math.floor(Number(j.remainingUnits)),
        feePerUnit: money2(j.feePerUnit),
        variableCostPerUnit: money2(j.variableCostPerUnit),
        status: j.status,
        completedUnits: clamp(Math.floor(finite(j.completedUnits)), 0, Math.floor(Number(j.units))),
        completedWeek: Number.isInteger(Number(j.completedWeek)) && Number(j.completedWeek) >= 1 ? Math.min(Math.floor(Number(j.completedWeek)), Math.max(1, Math.floor(finite(g.week, 1)))) : null,
        lateWeeks: clamp(Math.floor(finite(j.lateWeeks)), 0, 10000),
        lastLatePenaltyWeek: Number.isInteger(Number(j.lastLatePenaltyWeek)) && Number(j.lastLatePenaltyWeek) >= 0 ? Math.min(Math.floor(Number(j.lastLatePenaltyWeek)), Math.max(0, Math.floor(finite(g.week, 1)))) : null
      }))
      .filter((job, index, all) => all.findIndex((candidate) => candidate.id === job.id) === index)
      .slice(-MAX_JOBS);
    const highestJobId = s.jobs.reduce((max, job) => Math.max(max, Number(String(job.id).slice(4)) || 0), 0);
    if (!Number.isInteger(s.nextJobId) || s.nextJobId < 1) s.nextJobId = 1;
    s.nextJobId = Math.max(s.nextJobId, highestJobId + 1);
    if (!Array.isArray(s.activeEvents)) s.activeEvents = [];
    const priorEvent = s.activeEvents.find((e) => ownObject(e) && Object.prototype.hasOwnProperty.call(EVENT_CATALOG, e.id));
    if (priorEvent && Math.floor(finite(priorEvent.remainingWeeks)) > 0) {
      const template = EVENT_CATALOG[priorEvent.id];
      s.activeEvents = [{
        id: priorEvent.id,
        title: template.title,
        category: template.category,
        startWeek: clamp(Math.floor(finite(priorEvent.startWeek, g.week)), 1, Math.max(1, Math.floor(finite(g.week, 1)))),
        remainingWeeks: clamp(Math.floor(finite(priorEvent.remainingWeeks)), 1, template.duration),
        durationWeeks: template.duration,
        demandFactor: template.demandFactor,
        capacityFactor: template.capacityFactor,
        serviceCostFactor: template.serviceCostFactor,
        description: priorEvent.id === 'supplier-disruption' ? `${template.description} ${clamp(Math.floor(finite(priorEvent.affectedOrders)), 0, 300)} open order(s) affected.` : template.description,
        affectedOrders: clamp(Math.floor(finite(priorEvent.affectedOrders)), 0, 300)
      }];
    } else s.activeEvents = [];
    if (!Array.isArray(s.eventHistory)) s.eventHistory = [];
    s.eventHistory = s.eventHistory
      .filter((e) => ownObject(e) && Object.prototype.hasOwnProperty.call(EVENT_CATALOG, e.id))
      .map((e) => {
        const template = EVENT_CATALOG[e.id];
        const affectedOrders = clamp(Math.floor(finite(e.affectedOrders)), 0, 300);
        const startWeek = clamp(Math.floor(finite(e.startWeek, g.week)), 1, Math.max(1, Math.floor(finite(g.week, 1))));
        const status = e.status === 'ended' ? 'ended' : 'active';
        return { id: e.id, title: template.title, category: template.category, startWeek, durationWeeks: template.duration, remainingWeeks: clamp(Math.floor(finite(e.remainingWeeks)), 0, template.duration), status, endedWeek: status === 'ended' ? clamp(Math.floor(finite(e.endedWeek, startWeek + template.duration - 1)), startWeek, Math.max(startWeek, Math.floor(finite(g.week, 1)))) : null, description: e.id === 'supplier-disruption' ? `${template.description} ${affectedOrders} open order(s) affected.` : template.description, affectedOrders };
      })
      .slice(-MAX_EVENT_HISTORY);
    if (!Array.isArray(s.countryReviews) || g.countryCode !== 'PH') s.countryReviews = [];
    const reviewIds = new Set();
    s.countryReviews = s.countryReviews
      .filter((r) => ownObject(r) && COUNTRY_REVIEW_ITEMS.some((x) => x.id === r.id) && !reviewIds.has(r.id) && (reviewIds.add(r.id), true))
      .map((r) => ({ id: r.id, reviewedWeek: clamp(Math.floor(finite(r.reviewedWeek)), 0, Math.max(0, Math.floor(finite(g.week, 1)) - 1)), reviewedDate: String(r.reviewedDate || '').slice(0, 20) }))
      .slice(0, MAX_COUNTRY_REVIEWS);
    if (!ownObject(s.growth)) s.growth = defaultState().growth;
    s.growth.units = clamp(Math.floor(finite(s.growth.units)), 0, MAX_GROWTH_UNITS);
    s.growth.lastWeek = clamp(Math.floor(finite(s.growth.lastWeek)), 0, Math.max(0, Math.floor(finite(g.week, 1))));
    s.growth.monthlyUtilityIncrease = clamp(money2(s.growth.monthlyUtilityIncrease), 0, 100000000);
    s.growth.invested = clamp(money2(s.growth.invested), 0, 500000000);
    if (!Array.isArray(s.growth.assetIds)) s.growth.assetIds = [];
    s.growth.assetIds = s.growth.assetIds.filter((id) => typeof id === 'string').slice(-MAX_GROWTH_UNITS);
    if (s.lastJobSummary !== null && !ownObject(s.lastJobSummary)) s.lastJobSummary = null;
    return s;
  }
  function extensionClosed(g = currentGame()) { const s = ensureState(g); return !!(s && s.closed && s.closed.atWeek >= 0); }
  function currency(g = currentGame()) { return g && g.currencyCode ? String(g.currencyCode) : 'currency units'; }
  function displayMoney(value, g = currentGame()) {
    try { if (typeof money === 'function') return money(value, true); } catch (_) {}
    return `${currency(g)} ${money2(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  function demandInputs(product, g = currentGame()) {
    if (!g || !product) return null;
    const marketing = Math.max(0, finite(g.marketingBudget));
    const baseline = Math.max(1, finite(g.baselineMarketing, 1));
    const marketingMultiplier = 1 + Math.min(0.78, Math.sqrt(marketing / baseline) * 0.13);
    const reputationMultiplier = 0.65 + finite(g.reputation, 62) / 180;
    const ownPriceRatio = Math.pow(Math.max(0.01, finite(product.refPrice, product.price)) / Math.max(1, finite(product.price, 1)), finite(product.elasticity, 1) || 1);
    const rivalRatio = clamp((finite(product.competitorPrice) || finite(product.price, 1)) / Math.max(1, finite(product.price, 1)), 0.58, 1.45);
    const competitorEffect = Math.pow(rivalRatio, 0.34);
    let customerMultiplier = 1;
    try { if (typeof customerDemandMultiplier === 'function') customerMultiplier = finite(customerDemandMultiplier(product), 1); } catch (_) {}
    let seasonFactor = 1;
    let seasonName = 'Normal seasonal baseline';
    try {
      if (typeof seasonalDemandMultiplier === 'function') seasonFactor = finite(seasonalDemandMultiplier(g.industry, g.date), 1);
      if (typeof seasonalOutlook === 'function') { const outlook = seasonalOutlook(); if (outlook && Number.isFinite(Number(outlook.factor))) { seasonFactor = Number(outlook.factor); seasonName = String(outlook.name || outlook.monthName || seasonName); } }
    } catch (_) {}
    let strategyFactor = 1;
    try { if (typeof marketStrategyMultiplier === 'function') strategyFactor = finite(marketStrategyMultiplier(), 1); } catch (_) {}
    const competitors = Array.isArray(g.competitors) ? g.competitors : [];
    const avgStock = competitors.length ? competitors.reduce((sum, c) => sum + clamp(finite(c.stockIndex) || 0.8, 0, 1), 0) / competitors.length : 0.8;
    const rivalAvailability = competitors.length ? clamp(1 + ((1 - avgStock) * 0.18), 0.94, 1.12) : 1;
    const s = ensureState(g);
    const activeEvent = s && s.activeEvents[0];
    const eventDemandFactor = activeEvent ? finite(EVENT_CATALOG[activeEvent.id].demandFactor, 1) : 1;
    const raw = Math.max(0, finite(product.baseDemand)) * finite(g.economy, 1) * reputationMultiplier * marketingMultiplier * ownPriceRatio * competitorEffect * customerMultiplier * seasonFactor * strategyFactor * rivalAvailability * eventDemandFactor;
    return { expected: raw, lower: Math.max(0, Math.floor(raw * 0.88)), upper: Math.ceil(raw * 1.12), baseDemand: finite(product.baseDemand), economy: finite(g.economy, 1), reputationMultiplier, marketingMultiplier, ownPriceRatio, competitorEffect, customerMultiplier, seasonFactor, seasonName, strategyFactor, rivalAvailability, eventDemandFactor };
  }
  function estimateDemand(product, g = currentGame()) { return demandInputs(product, g); }
  function getDueJobs(g = currentGame(), week = finite(g && g.week, 1)) {
    const s = ensureState(g); if (!s) return [];
    return s.jobs.filter((j) => j.status === 'queued' && finite(j.remainingUnits) > 0 && finite(j.dueWeek) <= week).sort((a, b) => finite(a.dueWeek) - finite(b.dueWeek) || finite(a.createdWeek) - finite(b.createdWeek) || String(a.id).localeCompare(String(b.id)));
  }
  function reserveForJobs(g = currentGame()) {
    if (!isLogistics(g)) return 0;
    const due = getDueJobs(g).reduce((sum, j) => sum + Math.max(0, Math.floor(finite(j.remainingUnits))), 0);
    if (!due) return 0;
    let base = Math.max(0, finite(g.baseCapacity, 6));
    try { if (typeof baseGetIndustry === 'function') base = Math.max(0, finite(baseGetIndustry().baseCapacity, base)); } catch (_) {}
    const s = ensureState(g);
    const eventFactor = s && s.activeEvents[0] ? finite(s.activeEvents[0].capacityFactor, 1) : 1;
    base = (base + (s && s.growth ? s.growth.units * 5 : 0)) * eventFactor;
    return Math.min(due, 25, Math.max(1, Math.floor(base * 0.35)));
  }
  function computeSupplySnapshot(g = currentGame()) {
    if (!g) return null;
    const goods = (Array.isArray(g.products) ? g.products : []).filter((p) => p && p.kind === 'goods');
    const orders = (Array.isArray(g.purchaseOrders) ? g.purchaseOrders : []).filter((p) => p && p.status === 'open');
    const supplierAdvances = Math.max(0, finite(g.supplierAdvances));
    const inventory = goods.reduce((sum, p) => sum + Math.max(0, finite(p.stockValue)), 0);
    const openPayables = orders.reduce((sum, p) => sum + Math.max(0, finite(p.payableAmount)), 0);
    const currentSupplierPayables = Math.max(0, finite(g.ap));
    const rows = goods.map((p) => {
      let demand = Math.max(0, finite(p.baseDemand));
      try { if (typeof estimateWeeklyProductDemand === 'function') demand = Math.max(0, finite(estimateWeeklyProductDemand(p), demand)); }
      catch (_) {}
      const productOrders = orders.filter((po) => po.productId === p.id);
      const inbound = productOrders.reduce((sum, po) => sum + Math.max(0, finite(po.quantity)), 0);
      const nearest = productOrders.length ? Math.min(...productOrders.map((po) => finite(po.etaWeek, g.week + 100))) : null;
      let supplierPlan = null;
      try { if (typeof getProductReorderPlan === 'function') supplierPlan = getProductReorderPlan(p); } catch (_) {}
      const recommendations = supplierPlan && Array.isArray(supplierPlan.suppliers)
        ? supplierPlan.suppliers.map((sp) => ({
            id: String(sp.id || ''), name: String(sp.name || sp.id || 'Supplier'), leadWeeks: Math.max(0, finite(sp.leadWeeks)),
            reliability: clamp(finite(sp.reliability, 0.5), 0, 1), priceFactor: Math.max(0, finite(sp.priceFactor, 1)),
            inboundByArrival: Math.max(0, finite(sp.inboundByArrival)), suggestedQuantity: clamp(Math.floor(finite(sp.suggestedQuantity)), 0, 2000), quantityCapped: !!sp.quantityCapped
          })).filter((sp) => sp.id && sp.suggestedQuantity > 0)
        : [];
      return { id: String(p.id), name: String(p.name || p.id), stock: Math.max(0, finite(p.stock)), stockValue: Math.max(0, finite(p.stockValue)), weeklyDemand: demand, coverWeeks: demand > 0 ? (Math.max(0, finite(p.stock)) + inbound) / demand : null, inbound, nearestEta: nearest, openOrders: productOrders.length, recommendations };
    });
    const supplierCatalog = typeof SUPPLIER_CATALOG !== 'undefined' && Array.isArray(SUPPLIER_CATALOG) ? SUPPLIER_CATALOG : [];
    const receivedOrders = (Array.isArray(g.purchaseOrders) ? g.purchaseOrders : []).filter((po) => po && po.status === 'received' && Number.isInteger(Number(po.placedWeek)) && Number.isInteger(Number(po.receivedWeek)));
    const supplierPerformance = supplierCatalog.map((supplier) => {
      const records = receivedOrders.filter((po) => po.supplierId === supplier.id);
      const onTime = records.filter((po) => Number(po.receivedWeek) <= Number(po.placedWeek) + Math.max(0, Math.floor(finite(supplier.leadWeeks)))).length;
      const lateWeeks = records.reduce((sum, po) => sum + Math.max(0, Number(po.receivedWeek) - (Number(po.placedWeek) + Math.max(0, Math.floor(finite(supplier.leadWeeks))))), 0);
      return { id: String(supplier.id), name: String(supplier.name || supplier.id), leadWeeks: Math.max(0, finite(supplier.leadWeeks)), reliability: clamp(finite(supplier.reliability, 0.5), 0, 1), priceFactor: Math.max(0, finite(supplier.priceFactor, 1)), receivedCount: records.length, onTimeCount: onTime, observedOnTimeRate: records.length ? onTime / records.length : null, modeledDelayWeeksPerReceivedOrder: records.length ? lateWeeks / records.length : null };
    });
    let plan = null;
    try { if (typeof computeWorkingCapitalForecast === 'function' && typeof getWorkingCapitalPlanSettings === 'function') plan = computeWorkingCapitalForecast(getWorkingCapitalPlanSettings()); } catch (_) {}
    return { rows, supplierPerformance, openOrderCount: orders.length, supplierAdvances, openPayables, currentSupplierPayables, inventory, workingCapital: plan && Number.isFinite(Number(plan.workingCapital)) ? Number(plan.workingCapital) : null, selectedCurrentLiabilities: plan && Number.isFinite(Number(plan.operatingCurrentLiabilities)) ? Number(plan.operatingCurrentLiabilities) : null };
  }
  function queueJob(input, g = currentGame()) {
    const s = ensureState(g);
    if (!g || !s) throw new Error('Open a company first.');
    if (!isLogistics(g)) throw new Error('The specialist job queue is only available to the Logistics & Delivery business template.');
    if (extensionClosed(g) || g.companyStatus === 'bankrupt') throw new Error('A closed business cannot accept new delivery jobs.');
    if (s.jobs.filter((j) => j.status === 'queued').length >= 100 || s.jobs.length >= MAX_JOBS) throw new Error('The job register is full. Finish existing work or export your records.');
    const units = Number(input && input.units);
    const fee = money2(input && input.feePerUnit);
    const cost = money2(input && input.variableCostPerUnit);
    const dueOffset = Number(input && input.dueOffset);
    if (!Number.isInteger(units) || units < 1 || units > 200 || fee <= 0 || fee > 100000000 || cost < 0 || cost > 100000000 || !Number.isInteger(dueOffset) || dueOffset < 0 || dueOffset > 4) throw new Error('Enter 1–200 jobs, a positive delivery fee, a non-negative variable cost, and a due offset from 0–4 weeks.');
    const id = `JOB-${String(s.nextJobId++).padStart(5, '0')}`;
    const job = { id, createdWeek: Math.max(1, Math.floor(finite(g.week, 1))), dueWeek: Math.max(1, Math.floor(finite(g.week, 1))) + dueOffset, units, remainingUnits: units, feePerUnit: fee, variableCostPerUnit: cost, status: 'queued', completedUnits: 0, completedWeek: null, lateWeeks: 0, lastLatePenaltyWeek: null };
    s.jobs.push(job);
    try { if (typeof saveGame === 'function') saveGame(true); if (typeof renderAll === 'function') renderAll(); } catch (_) {}
    return job;
  }
  function beginEconomicEvent(id, g = currentGame()) {
    const s = ensureState(g); const template = EVENT_CATALOG[id];
    if (!s || !g || !template) throw new Error('Unknown economic event.');
    if (s.activeEvents.length) throw new Error('An economic event is already active; events do not stack in this layer.');
    const event = { id: template.id, title: template.title, category: template.category, startWeek: Math.max(1, Math.floor(finite(g.week, 1))), remainingWeeks: template.duration, durationWeeks: template.duration, demandFactor: template.demandFactor, capacityFactor: template.capacityFactor, serviceCostFactor: template.serviceCostFactor, description: template.description, affectedOrders: 0 };
    if (id === 'supplier-disruption') {
      for (const po of (Array.isArray(g.purchaseOrders) ? g.purchaseOrders : [])) {
        if (po && po.status === 'open' && finite(po.delayCount) < 2 && finite(po.etaWeek) < finite(g.week) + 100) {
          po.etaWeek = Math.floor(finite(po.etaWeek)) + 1;
          po.delayCount = Math.floor(finite(po.delayCount)) + 1;
          event.affectedOrders++;
        }
      }
      event.description = `${template.description} ${event.affectedOrders} open order(s) affected.`;
    }
    s.activeEvents = [event];
    s.eventHistory.push({ id: event.id, title: event.title, category: event.category, startWeek: event.startWeek, durationWeeks: event.durationWeeks, remainingWeeks: event.remainingWeeks, description: event.description, status: 'active', affectedOrders: event.affectedOrders });
    s.eventHistory = s.eventHistory.slice(-MAX_EVENT_HISTORY);
    return event;
  }
  function maybeBeginEvent(g = currentGame()) {
    const s = ensureState(g); if (!s || s.activeEvents.length) return null;
    if (Math.random() >= 0.12) return null;
    const id = EVENT_IDS[Math.floor(Math.random() * EVENT_IDS.length)];
    try { return beginEconomicEvent(id, g); } catch (_) { return null; }
  }
  function ageEconomicEvent(g = currentGame()) {
    const s = ensureState(g); if (!s || !s.activeEvents.length) return;
    const event = s.activeEvents[0];
    event.remainingWeeks = Math.max(0, Math.floor(finite(event.remainingWeeks)) - 1);
    const record = [...s.eventHistory].reverse().find((e) => e.id === event.id && e.startWeek === event.startWeek && e.status === 'active');
    if (record) record.remainingWeeks = event.remainingWeeks;
    if (event.remainingWeeks <= 0) {
      if (record) { record.status = 'ended'; record.endedWeek = Math.max(1, Math.floor(finite(g.week, 2)) - 1); }
      s.activeEvents = [];
    }
  }
  function applyLateJobConsequences(g = currentGame(), closingWeek = Math.max(0, finite(g && g.week, 1) - 1)) {
    const s = ensureState(g); if (!s || !isLogistics(g)) return 0;
    const overdue = s.jobs.filter((j) => j.status === 'queued' && finite(j.remainingUnits) > 0 && finite(j.dueWeek) < closingWeek && finite(j.lastLatePenaltyWeek, -1) !== closingWeek);
    if (!overdue.length) return 0;
    const penalty = Math.min(2.5, overdue.length * 0.35);
    if (Number.isFinite(Number(g.reputation))) g.reputation = clamp(Number(g.reputation) - penalty, 0, 100);
    for (const job of overdue) { job.lastLatePenaltyWeek = closingWeek; job.lateWeeks = Math.max(0, Math.floor(finite(job.lateWeeks)) + 1); }
    if (Array.isArray(g.events)) {
      g.events.unshift({ week: Math.max(0, closingWeek - 1), date: (g.lastWeek && g.lastWeek.date) || g.date, title: 'Delivery backlog needs attention', icon: '◷', description: `${overdue.length} specialist job(s) remain overdue. Customer reputation fell by ${penalty.toFixed(2)} points; backlog remains visible in Operations.`, impact: 'Service reliability' });
      g.events = g.events.slice(0, 100);
    }
    return penalty;
  }
  function processDueJobsBeforeClose(g = currentGame()) {
    const s = ensureState(g);
    const summary = { revenue: 0, variableCost: 0, tax: 0, units: 0, jobsTouched: 0, jobsCompleted: 0, reservedCapacity: reserveForJobs(g) };
    if (!s || !isLogistics(g) || !summary.reservedCapacity) { if (s) s.lastJobSummary = summary; return summary; }
    let available = summary.reservedCapacity;
    const due = getDueJobs(g);
    for (const job of due) {
      if (available <= 0) break;
      const units = Math.min(available, Math.max(0, Math.floor(finite(job.remainingUnits))));
      if (!units) continue;
      const fee = money2(job.feePerUnit);
      const event = s.activeEvents[0];
      const costFactor = event ? finite(event.serviceCostFactor, 1) : 1;
      const variableCost = money2(job.variableCostPerUnit * costFactor);
      const revenue = money2(units * fee);
      const cost = money2(units * variableCost);
      if (revenue > 0 && typeof receiptJournal === 'function') receiptJournal(`Specialist delivery jobs — ${job.id}`, revenue, 'Sales revenue', 0);
      if (cost > 0 && typeof payJournal === 'function') payJournal(`Specialist delivery variable cost — ${job.id}`, cost, 'Service delivery cost');
      summary.revenue = money2(summary.revenue + revenue);
      summary.variableCost = money2(summary.variableCost + cost);
      summary.units += units; summary.jobsTouched++;
      job.remainingUnits -= units; job.completedUnits = Math.max(0, Math.floor(finite(job.completedUnits))) + units;
      if (job.remainingUnits <= 0) { job.remainingUnits = 0; job.status = 'completed'; job.completedWeek = Math.max(1, Math.floor(finite(g.week, 1))); summary.jobsCompleted++; }
      available -= units;
    }
    const contribution = money2(summary.revenue - summary.variableCost);
    // This layer reserves tax only on positive specialist-job contribution. It does not
    // rewrite the core's already documented illustrative tax model or lower existing reserves.
    summary.tax = contribution > 0 ? money2(contribution * clamp(finite(g.taxRate, 0.2), 0, 1)) : 0;
    if (summary.tax > 0) {
      g.taxPayable = money2(finite(g.taxPayable) + summary.tax);
      if (typeof makeEntry === 'function') makeEntry('Accrue estimated tax on specialist delivery contribution', [{ account: 'Income tax expense', debit: summary.tax }, { account: 'Tax payable', credit: summary.tax }]);
    }
    if (summary.revenue) g.totals.revenue = money2(finite(g.totals && g.totals.revenue) + summary.revenue);
    if (summary.variableCost) g.totals.cogs = money2(finite(g.totals && g.totals.cogs) + summary.variableCost);
    if (summary.tax) g.totals.tax = money2(finite(g.totals && g.totals.tax) + summary.tax);
    g.retainedEarnings = money2(finite(g.retainedEarnings) + contribution - summary.tax);
    g.totals.net = money2(finite(g.totals && g.totals.net) + contribution - summary.tax);
    if (summary.jobsTouched) {
      const title = `${summary.units} specialist delivery unit(s) processed`;
      if (Array.isArray(g.events)) { g.events.unshift({ week: g.week, date: g.date, title, icon: '🚚', description: `${summary.jobsCompleted} job(s) completed; ${summary.units} unit(s) fulfilled. Revenue ${displayMoney(summary.revenue, g)}, variable cost ${displayMoney(summary.variableCost, g)}. Any remaining work stays queued.`, impact: 'Delivery operations' }); g.events = g.events.slice(0, 100); }
    }
    s.lastJobSummary = { ...summary, contribution, closedAtWeek: Math.max(1, Math.floor(finite(g.week, 1))) };
    return summary;
  }
  function buildJobsPanel(g = currentGame()) {
    const s = ensureState(g); if (!g || !s || !isLogistics(g)) return '';
    const queued = s.jobs.filter((j) => j.status === 'queued');
    const completed = s.jobs.filter((j) => j.status === 'completed');
    const rows = s.jobs.slice(-10).reverse().map((j) => `<tr><td><strong>${escapeHTML(j.id)}</strong><div class="rw9-note">Created W${j.createdWeek} · due W${j.dueWeek}</div></td><td class="num">${j.completedUnits}/${j.units}</td><td class="num">${displayMoney(j.feePerUnit, g)}</td><td>${j.status === 'completed' ? `<span class="rw9-tag">Completed W${j.completedWeek}</span>` : `<span class="rw9-tag">${j.dueWeek < g.week ? `Overdue ${j.lateWeeks || 0} wk` : 'Queued'}</span>`}</td></tr>`).join('');
    const disabled = extensionClosed(g) || g.companyStatus === 'bankrupt' || queued.length >= 100 || s.jobs.length >= MAX_JOBS;
    const jobSummary = s.lastJobSummary;
    return `<section class="rw9-panel" data-testid="rw9-logistics-jobs"><h3>Specialist operations · Logistics &amp; Delivery</h3><p class="rw9-subtitle">A bounded job queue for this business template. Due jobs reserve up to 35% of modeled base capacity (capped at 25 units per close); unfinished jobs remain queued and overdue work affects reputation. Revenue and variable cost use the core journal helpers.</p><div class="rw9-grid"><div class="rw9-stat"><strong>${queued.length}</strong><span>Queued jobs</span></div><div class="rw9-stat"><strong>${completed.length}</strong><span>Completed jobs</span></div><div class="rw9-stat"><strong>${queued.reduce((sum, j) => sum + Math.max(0, finite(j.remainingUnits)), 0)}</strong><span>Outstanding units</span></div><div class="rw9-stat"><strong>${jobSummary ? displayMoney(jobSummary.contribution, g) : '—'}</strong><span>Last job contribution after this layer’s incremental tax reserve</span></div></div><form data-rw9-form="queue-job" style="margin-top:13px"><div class="rw9-form-grid"><div class="field"><label for="rw9-job-units">Delivery units (1–200)</label><input id="rw9-job-units" name="units" type="number" min="1" max="200" step="1" value="8" required ${disabled ? 'disabled' : ''}></div><div class="field"><label for="rw9-job-fee">Fee per delivery (${escapeHTML(currency(g))})</label><input id="rw9-job-fee" name="feePerUnit" type="number" min="0.01" step="0.01" value="180" required ${disabled ? 'disabled' : ''}></div><div class="field"><label for="rw9-job-cost">Variable cost per delivery (${escapeHTML(currency(g))})</label><input id="rw9-job-cost" name="variableCostPerUnit" type="number" min="0" step="0.01" value="72" required ${disabled ? 'disabled' : ''}></div><div class="field"><label for="rw9-job-due">Due window</label><select id="rw9-job-due" name="dueOffset" ${disabled ? 'disabled' : ''}><option value="0">Next close (current week)</option><option value="1">One week from now</option><option value="2">Two weeks from now</option><option value="3">Three weeks from now</option><option value="4">Four weeks from now</option></select></div></div><div class="rw9-actions"><button type="submit" class="primary-btn" ${disabled ? 'disabled' : ''}>Accept delivery job</button></div></form><p class="rw9-note">This is a simulated operating pilot, not a real dispatch, GPS route planner, or customer booking service. ${queued.length >= 100 || s.jobs.length >= MAX_JOBS ? 'The job register is at its current safety limit.' : ''}</p>${rows ? `<div class="rw9-table-wrap" style="margin-top:12px"><table class="rw9-table"><thead><tr><th>Job / due</th><th class="num">Progress</th><th class="num">Fee / unit</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="rw9-note">No specialist jobs have been queued yet.</p>'}</section>`;
  }
  function buildSupplyPanel(g = currentGame(), allowPrefill = false) {
    const snap = computeSupplySnapshot(g); if (!snap) return '';
    const coverRows = snap.rows.map((r) => `<tr><td>${escapeHTML(r.name)}</td><td class="num">${r.stock.toLocaleString()}</td><td class="num">${r.inbound.toLocaleString()}</td><td class="num">${r.coverWeeks === null ? '—' : `${r.coverWeeks.toFixed(1)} wk`}</td><td>${r.nearestEta === null ? '—' : `W${r.nearestEta}`}</td></tr>`).join('');
    const supplierRecommendations = snap.rows.flatMap((r) => r.recommendations.map((sp) => ({ product: r, supplier: sp }))).slice(0, 12);
    const recommendationRows = supplierRecommendations.map(({ product, supplier }) => `<tr><td>${escapeHTML(product.name)}</td><td>${escapeHTML(supplier.name)}<div class="rw9-note">${supplier.leadWeeks} wk lead · ${(supplier.reliability * 100).toFixed(0)}% modeled reliability</div></td><td class="num">${supplier.suggestedQuantity.toLocaleString()}${supplier.quantityCapped ? '+' : ''}</td><td class="num">${supplier.priceFactor.toFixed(2)}×</td><td>${allowPrefill ? `<button type="button" class="secondary-btn small-btn" data-action="prefill-reorder" data-id="${escapeHTML(product.id)}" data-supplier-id="${escapeHTML(supplier.id)}" data-quantity="${supplier.suggestedQuantity}">Prefill order</button>` : 'Review in Operations'}</td></tr>`).join('');
    const performanceRows = snap.supplierPerformance.map((sp) => `<tr><td>${escapeHTML(sp.name)}</td><td class="num">${sp.receivedCount}</td><td class="num">${sp.observedOnTimeRate === null ? 'No receipts yet' : `${(sp.observedOnTimeRate * 100).toFixed(0)}% (${sp.onTimeCount}/${sp.receivedCount})`}</td><td class="num">${sp.modeledDelayWeeksPerReceivedOrder === null ? '—' : `${sp.modeledDelayWeeksPerReceivedOrder.toFixed(1)} wk`}</td></tr>`).join('');
    const wcText = snap.workingCapital === null ? 'Open Finance for the core planner' : displayMoney(snap.workingCapital, g);
    return `<section class="rw9-panel" data-testid="rw9-supply-working-capital"><h3>Supplier commitments &amp; working capital</h3><p class="rw9-subtitle">Read-only reconciliation snapshot. It reads existing stock, inbound orders, supplier advances, unpaid order balances, and the Layer 6 working-capital model. Recommendations only prefill the existing Operations form; they never place orders or move cash.</p><div class="rw9-grid"><div class="rw9-stat"><strong>${snap.openOrderCount}</strong><span>Open supplier orders</span></div><div class="rw9-stat"><strong>${displayMoney(snap.supplierAdvances, g)}</strong><span>Supplier advances still tied to open orders</span></div><div class="rw9-stat"><strong>${displayMoney(snap.openPayables, g)}</strong><span>Future balances on open supplier orders</span></div><div class="rw9-stat"><strong>${displayMoney(snap.currentSupplierPayables, g)}</strong><span>Current supplier accounts payable</span></div><div class="rw9-stat"><strong>${displayMoney(snap.inventory, g)}</strong><span>Stocked inventory at carrying cost</span></div><div class="rw9-stat"><strong>${escapeHTML(wcText)}</strong><span>Core working-capital estimate</span></div></div>${coverRows ? `<div class="rw9-table-wrap" style="margin-top:12px"><table class="rw9-table"><thead><tr><th>Stocked product</th><th class="num">On hand</th><th class="num">Inbound</th><th class="num">Total cover</th><th>Nearest ETA</th></tr></thead><tbody>${coverRows}</tbody></table></div>` : '<p class="rw9-note">This business has no stocked-goods offers, so the physical inventory reorder model does not apply. Service capacity and receivables are still relevant to cash planning.</p>'}${recommendationRows ? `<h3 style="margin-top:16px">Supplier reorder suggestions</h3><p class="rw9-note">Quantities account for projected demand during supplier lead time and known inbound orders. Choose a suggestion to prefill the existing order inputs, then review total cost and cash commitments before placing the order.</p><div class="rw9-table-wrap"><table class="rw9-table"><thead><tr><th>Product</th><th>Supplier / lead</th><th class="num">Suggested units</th><th class="num">Cost factor</th><th>Action</th></tr></thead><tbody>${recommendationRows}</tbody></table></div>` : ''}${performanceRows ? `<h3 style="margin-top:16px">Delivery performance recorded in this company</h3><div class="rw9-table-wrap"><table class="rw9-table"><thead><tr><th>Modeled supplier</th><th class="num">Received orders</th><th class="num">Received by original lead time</th><th class="num">Average late weeks</th></tr></thead><tbody>${performanceRows}</tbody></table></div><p class="rw9-note">Observed results use this company's received purchase orders against the supplier's original modeled lead time. With no receipts, no measured performance rate is claimed. Supplier data is simulation-only and is not a statement about real vendors.</p>` : ''}<p class="rw9-note">Stock cover includes open-order units. Supplier prices, reliability, and dates are modeled gameplay assumptions. Forecasts remain advisory and never post purchases or journal entries.</p></section>`;
  }
  function buildDemandPanel(g = currentGame()) {
    if (!g || !Array.isArray(g.products)) return '';
    const rows = g.products.map((p) => {
      const d = estimateDemand(p, g); if (!d) return '';
      return `<tr><td><strong>${escapeHTML(p.name)}</strong><div class="rw9-note">${p.kind === 'goods' ? 'Stock-limited goods' : 'Capacity-limited service'}</div></td><td class="num">${d.expected.toFixed(1)}</td><td class="num">${d.lower}–${d.upper}</td><td class="num">${d.ownPriceRatio.toFixed(2)}×</td><td class="num">${d.customerMultiplier.toFixed(2)}×</td><td class="num">${d.seasonFactor.toFixed(2)}×</td></tr>`;
    }).join('');
    const active = ensureState(g).activeEvents[0];
    const eventSummary = active ? ` Active event: ${escapeHTML(active.title)} (${active.remainingWeeks} close(s) remain), demand multiplier ${finite(active.demandFactor, 1).toFixed(2)}×.` : '';
    return `<section class="rw9-panel" data-testid="rw9-demand-explainer"><h3>Why demand is moving</h3><p class="rw9-subtitle">A transparent estimate based on the same main factors used by the weekly sales loop. This is not a sales guarantee: the core engine applies random weekly noise, physical stock, staff capacity, stockouts, and actual fulfilment.</p><div class="rw9-grid"><div class="rw9-stat"><strong>${finite(g.economy, 1).toFixed(2)}×</strong><span>Economic demand index</span></div><div class="rw9-stat"><strong>${(0.65 + finite(g.reputation, 62) / 180).toFixed(2)}×</strong><span>Reputation multiplier</span></div><div class="rw9-stat"><strong>${(1 + Math.min(0.78, Math.sqrt(Math.max(0, finite(g.marketingBudget)) / Math.max(1, finite(g.baselineMarketing, 1))) * 0.13)).toFixed(2)}×</strong><span>Marketing multiplier</span></div><div class="rw9-stat"><strong>${active ? `${finite(active.demandFactor, 1).toFixed(2)}×` : '1.00×'}</strong><span>Persistent event demand factor</span></div></div><div class="rw9-table-wrap" style="margin-top:12px"><table class="rw9-table"><thead><tr><th>Offer</th><th class="num">Expected units</th><th class="num">Noise range</th><th class="num">Price factor</th><th class="num">Customer factor</th><th class="num">Season factor</th></tr></thead><tbody>${rows}</tbody></table></div><p class="rw9-note">Estimate combines base demand, economy, reputation, marketing, own price versus reference price, rival-price effect, customer-segment fit/loyalty, seasonality, market strategy, rival availability, and any persistent demand event. The shown range is the core loop’s approximate ±12% random-noise band before stock/capacity limits.${escapeHTML(eventSummary)} All values are simulated assumptions, not market data from real competitors.</p></section>`;
  }
  function buildEventsPanel(g = currentGame()) {
    const s = ensureState(g); if (!g || !s) return '';
    const active = s.activeEvents[0];
    const recent = s.eventHistory.filter((e) => !active || e.id !== active.id || e.startWeek !== active.startWeek).slice(-5).reverse();
    return `<section class="rw9-panel" data-testid="rw9-economic-events"><h3>Persistent economic conditions</h3><p class="rw9-subtitle">Bounded, time-limited gameplay events now retain their remaining duration and history in the company save. Events do not stack, and they are not claims about real-world market conditions.</p>${active ? `<article class="rw9-event"><span class="rw9-tag">${escapeHTML(active.category)} · ${active.remainingWeeks} close(s) left</span><strong style="display:block;margin-top:6px">${escapeHTML(active.title)}</strong><p>${escapeHTML(active.description)}</p></article>` : '<p class="rw9-note">No persistent economic event is active. A modeled event may start at a weekly close.</p>'}${recent.length ? recent.map((e) => `<article class="rw9-event"><strong>${escapeHTML(e.title || e.id)}</strong><p>${escapeHTML(e.status === 'ended' ? `Ended after Week ${e.endedWeek}. ` : `Started Week ${e.startWeek}. `)}${escapeHTML(e.description || '')}</p></article>`).join('') : ''}<p class="rw9-note">Possible event types: demand downturn, demand surge, service input-cost pressure, capacity shortage, and supplier disruption. Supplier disruption may extend eligible open purchase-order ETAs once when it starts.</p></section>`;
  }
  function buildGrowthPanel(g = currentGame()) {
    const s = ensureState(g); if (!g || !s) return '';
    const growth = s.growth;
    const minimum = typeof localModelAmount === 'function' ? localModelAmount(5000) : 5000;
    const maximum = typeof localModelAmount === 'function' ? localModelAmount(5000000) : 5000000;
    const maxAllowed = Math.min(maximum, Math.max(0, finite(g.cash)));
    const ready = !extensionClosed(g) && g.companyStatus !== 'bankrupt' && growth.units < MAX_GROWTH_UNITS && (!growth.lastWeek || finite(g.week) - growth.lastWeek >= 4) && maxAllowed >= minimum;
    const reason = extensionClosed(g) ? 'Business is closed.' : g.companyStatus === 'bankrupt' ? 'Bankruptcy suspends investment.' : growth.units >= MAX_GROWTH_UNITS ? 'The five-unit expansion limit has been reached.' : growth.lastWeek && finite(g.week) - growth.lastWeek < 4 ? `Wait ${4 - (finite(g.week) - growth.lastWeek)} more week(s) between growth commitments.` : maxAllowed < minimum ? `Available cash must cover at least ${displayMoney(minimum, g)}.` : 'Ready when the amount and cash are validated.';
    const suggestedAmount = Math.max(minimum, Math.min(maxAllowed, Math.max(minimum, 25000)));
    const cashAfter = finite(g.cash) - suggestedAmount;
    const wcSettings = typeof getWorkingCapitalPlanSettings === 'function' ? (() => { try { return getWorkingCapitalPlanSettings(); } catch (_) { return null; } })() : null;
    const reserve = wcSettings && Number.isFinite(Number(wcSettings.reserve)) ? Math.max(0, Number(wcSettings.reserve)) : 0;
    const reserveHeadroom = cashAfter - reserve;
    return `<section class="rw9-panel" data-testid="rw9-growth"><h3>Business growth &amp; capital allocation</h3><p class="rw9-subtitle">A deliberate, bounded expansion decision—not an automatic upgrade. Each investment uses the core fixed-asset purchase/journal flow and adds capacity; the model adds recurring monthly utilities of 0.8% of the investment. Up to five units, at least four weeks apart.</p><div class="rw9-grid"><div class="rw9-stat"><strong>${growth.units}/${MAX_GROWTH_UNITS}</strong><span>Expansion units installed</span></div><div class="rw9-stat"><strong>+${growth.units * 5}</strong><span>Added modeled base capacity per close</span></div><div class="rw9-stat"><strong>${displayMoney(growth.invested, g)}</strong><span>Capitalized growth investment recorded here</span></div><div class="rw9-stat"><strong>${displayMoney(growth.monthlyUtilityIncrease, g)}</strong><span>Additional modeled monthly utilities</span></div></div><form data-rw9-form="growth-investment" style="margin-top:13px"><div class="field"><label for="rw9-growth-amount">Investment amount (${escapeHTML(currency(g))})</label><input id="rw9-growth-amount" name="amount" type="number" min="${minimum}" max="${Math.max(minimum, maxAllowed)}" step="0.01" value="${suggestedAmount.toFixed(2)}" ${ready ? '' : 'disabled'} required></div><div class="rw9-grid" style="margin-top:10px"><div class="rw9-stat"><strong id="rw9-growth-cash-preview">${displayMoney(cashAfter, g)}</strong><span>Cash after this outlay, before future cash flow</span></div><div class="rw9-stat"><strong id="rw9-growth-reserve-preview">${displayMoney(reserveHeadroom, g)}</strong><span>Headroom above the current planner reserve</span></div></div><div class="rw9-actions"><button type="submit" class="primary-btn" ${ready ? '' : 'disabled'}>Review &amp; invest in capacity</button></div></form><p class="rw9-note">${escapeHTML(reason)} Preview subtracts only the proposed investment from today's cash; it does not forecast sales, payables, or future obligations. Check Finance's cash-runway forecast before confirming. This game-only choice capitalizes equipment through the existing asset register. Its capacity and upkeep are simplified simulation assumptions, not a real return or payback guarantee.</p></section>`;
  }
  function buildCountryPanel(g = currentGame()) {
    const s = ensureState(g); if (!g || !s) return '';
    if (g.countryCode !== 'PH') return `<section class="rw9-panel" data-testid="rw9-country-rules"><h3>Country rules expansion</h3><p class="rw9-subtitle">This integrated release includes only a bounded Philippines review checklist. The existing country rulebook remains available for this selected country; a complete multi-jurisdiction legal calculator is not claimed.</p><p class="rw9-note">Your current profile is ${escapeHTML(g.countryCode || 'unspecified')}. No legal rules were silently transferred between countries. The Philippines source checklist is available when you create/select a Philippines company; switching a saved company’s jurisdiction is not offered here.</p></section>`;
    const reviewed = new Map(s.countryReviews.map((r) => [r.id, r]));
    return `<section class="rw9-panel" data-testid="rw9-country-rules"><h3>Philippines · bounded rules-source review</h3><p class="rw9-subtitle">Official starting points to review. These links are references, not legal advice or a complete list of permits, taxes, labour rules, or obligations. Marking an item records only that you reviewed the link in this simulation.</p>${COUNTRY_REVIEW_ITEMS.map((item) => { const r = reviewed.get(item.id); return `<article class="rw9-event"><div class="rw9-inline-check"><div style="flex:1;min-width:0"><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.body)}</p><p><a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.source)} ↗</a></p><p>${r ? `Review logged in Week ${r.reviewedWeek}; this is not a compliance certification.` : 'Not yet marked reviewed.'}</p></div><button type="button" class="secondary-btn small-btn" data-rw9-action="country-review" data-id="${escapeHTML(item.id)}" ${r || extensionClosed(g) || g.companyStatus === 'bankrupt' ? 'disabled' : ''}>${r ? 'Review logged' : 'Mark reviewed'}</button></div></article>`; }).join('')}<p class="rw9-note">This bounded scope records source links only. REALWORLD does not register your company, file tax, calculate official contribution amounts, validate permits, or certify legal compliance. Verify current requirements with the relevant official agency or a qualified professional.</p></section>`;
  }
  function buildClosurePanel(g = currentGame()) {
    const s = ensureState(g); if (!g || !s) return '';
    if (s.closed) return `<section class="rw9-panel rw9-closed" data-testid="rw9-voluntary-closure"><h3>Business voluntarily closed</h3><p class="rw9-subtitle">Operations stopped in Week ${s.closed.atWeek}. No further operating weeks can be closed. Existing company records, financial statements, journals, and save exports remain available for review.</p><div class="rw9-grid"><div class="rw9-stat"><strong>Week ${s.closed.atWeek}</strong><span>Closure recorded</span></div><div class="rw9-stat"><strong>${displayMoney(s.closed.cashAtClosure, g)}</strong><span>Cash at closure</span></div></div><p class="rw9-note">This is a simulation state, not an actual legal dissolution or filing. Export reports and a save backup before starting another company.</p></section>`;
    if (g.companyStatus === 'bankrupt') return `<section class="rw9-panel rw9-closed"><h3>Operations closed after insolvency</h3><p class="rw9-subtitle">The core bankruptcy control already suspends normal operation. Reports and export remain available.</p></section>`;
    return `<section class="rw9-panel" data-testid="rw9-voluntary-closure"><h3>Close this business</h3><p class="rw9-subtitle">Voluntary closure permanently stops future simulated trading for this saved company while preserving its existing cash, obligations, assets, journals, history, and reports. This does not delete your save or perform legal dissolution.</p><div class="rw9-actions"><button type="button" class="secondary-btn" data-rw9-action="close-business">Close business voluntarily</button></div><p class="rw9-note">The close action requires confirmation. To continue trading later, import a backup created before closure or start a new company.</p></section>`;
  }
  function closeBusiness(g = currentGame()) {
    const s = ensureState(g); if (!g || !s || s.closed || g.companyStatus === 'bankrupt') return false;
    s.closed = { atWeek: Math.max(0, Math.floor(finite(g.week, 1)) - 1), date: String(g.date || ''), cashAtClosure: money2(g.cash), reason: 'Voluntary player decision' };
    try { if (typeof saveGame === 'function') saveGame(true); if (typeof renderAll === 'function') renderAll(); if (typeof notify === 'function') notify('Business voluntarily closed. Records and reports remain available.', 'warn'); } catch (_) {}
    return true;
  }
  function applyReview(id, g = currentGame()) {
    const s = ensureState(g); const item = COUNTRY_REVIEW_ITEMS.find((x) => x.id === id);
    if (!s || !g || !item || g.countryCode !== 'PH') return false;
    if (extensionClosed(g) || g.companyStatus === 'bankrupt' || s.countryReviews.some((r) => r.id === id)) return false;
    s.countryReviews.push({ id, reviewedWeek: Math.max(0, Math.floor(finite(g.week, 1)) - 1), reviewedDate: String(g.date || '') });
    s.countryReviews = s.countryReviews.slice(-MAX_COUNTRY_REVIEWS);
    try { if (typeof saveGame === 'function') saveGame(true); if (typeof renderAll === 'function') renderAll(); } catch (_) {}
    return true;
  }
  function investGrowth(amountValue, g = currentGame()) {
    const s = ensureState(g); if (!g || !s) throw new Error('Open a company first.');
    if (extensionClosed(g) || g.companyStatus === 'bankrupt') throw new Error('A closed business cannot invest in growth.');
    const growth = s.growth;
    if (growth.units >= MAX_GROWTH_UNITS) throw new Error('The maximum of five capacity-expansion units has been reached.');
    if (growth.lastWeek && finite(g.week) - growth.lastWeek < 4) throw new Error(`Wait ${4 - (finite(g.week) - growth.lastWeek)} more week(s) between growth investments.`);
    const amount = money2(amountValue);
    const minimum = typeof localModelAmount === 'function' ? localModelAmount(5000) : 5000;
    const maximum = typeof localModelAmount === 'function' ? localModelAmount(5000000) : 5000000;
    if (!Number.isFinite(amount) || amount < minimum || amount > maximum) throw new Error('Investment amount is outside the existing fixed-asset purchase limits.');
    if (amount > finite(g.cash)) throw new Error(`Investment exceeds available cash (${displayMoney(g.cash, g)}).`);
    if (typeof purchaseFixedAsset !== 'function') throw new Error('The core fixed-asset purchasing function is unavailable.');
    const assetName = `Growth capacity unit ${growth.units + 1}`;
    const purchased = purchaseFixedAsset(amount, { name: assetName, category: 'equipment' });
    if (!purchased) throw new Error('The core fixed-asset purchase was rejected. No growth unit was added.');
    const utilityIncrease = money2(amount * 0.008);
    g.monthlyUtilities = money2(finite(g.monthlyUtilities) + utilityIncrease);
    growth.units++;
    growth.lastWeek = Math.max(1, Math.floor(finite(g.week, 1)));
    growth.monthlyUtilityIncrease = money2(growth.monthlyUtilityIncrease + utilityIncrease);
    growth.invested = money2(growth.invested + amount);
    const asset = Array.isArray(g.assets) ? g.assets.find((a) => a && a.name === assetName && a.purchaseWeek === g.week) : null;
    if (asset) growth.assetIds.push(String(asset.id));
    growth.assetIds = growth.assetIds.slice(-MAX_GROWTH_UNITS);
    try { if (typeof saveGame === 'function') saveGame(true); if (typeof renderAll === 'function') renderAll(); } catch (_) {}
    return { amount, units: growth.units, addedBaseCapacity: growth.units * 5, utilityIncrease, assetId: asset ? asset.id : null };
  }
  function installRuntimeModifiers(g) {
    const s = ensureState(g); const event = s && s.activeEvents[0];
    const runtime = { baseDemand: [], serviceCosts: [], employeeCapacity: [], baseCapacityFactor: event ? finite(event.capacityFactor, 1) : 1, serviceCostFactor: event ? finite(event.serviceCostFactor, 1) : 1, demandFactor: event ? finite(event.demandFactor, 1) : 1 };
    for (const product of (Array.isArray(g.products) ? g.products : [])) {
      if (!product) continue;
      runtime.baseDemand.push([product, product.baseDemand]);
      product.baseDemand = Math.max(0, finite(product.baseDemand) * runtime.demandFactor);
      if (product.kind === 'service' && runtime.serviceCostFactor !== 1) {
        runtime.serviceCosts.push([product, product.unitCost]);
        product.unitCost = money2(finite(product.unitCost) * runtime.serviceCostFactor);
      }
    }
    if (runtime.baseCapacityFactor !== 1) {
      for (const employee of (Array.isArray(g.employees) ? g.employees : [])) {
        if (!employee) continue;
        runtime.employeeCapacity.push([employee, employee.capacity]);
        employee.capacity = Math.max(0, finite(employee.capacity) * runtime.baseCapacityFactor);
      }
    }
    return runtime;
  }
  function restoreRuntimeModifiers(runtime) {
    if (!runtime) return;
    for (const [product, value] of runtime.baseDemand) product.baseDemand = value;
    // Undo only the temporary event multiplier, preserving the core's ordinary weekly cost drift.
    for (const [product, value] of runtime.serviceCosts) {
      const eventFactor = runtime.serviceCostFactor || 1;
      const normalCost = money2(finite(product.unitCost) / eventFactor);
      const floorCost = finite(product.cost, 0) > 0 ? finite(product.cost) * 0.9 : 0;
      const ceilingCost = finite(product.cost, 0) > 0 ? finite(product.cost) * 1.35 : Number.MAX_SAFE_INTEGER;
      product.unitCost = clamp(normalCost, floorCost, ceilingCost);
      if (!Number.isFinite(Number(product.unitCost))) product.unitCost = value;
    }
    for (const [employee, value] of runtime.employeeCapacity) employee.capacity = value;
  }
  function decorateOutput(html, content) {
    if (typeof html !== 'string' || !content) return html;
    return html + content;
  }
  function lockClosedControls() {
    const g = currentGame(); const closed = extensionClosed(g);
    if (!closed || !document.querySelectorAll) return;
    const actionAllow = new Set(['export-save', 'export-csv', 'restart', 'import-save', 'toggle-cashflow-history']);
    document.querySelectorAll('[data-action]').forEach((el) => {
      const a = el.getAttribute('data-action');
      if (a && !actionAllow.has(a)) { el.disabled = true; el.setAttribute('aria-disabled', 'true'); }
    });
    document.querySelectorAll('[data-form]').forEach((form) => {
      if (form.dataset && ['working-capital-plan'].includes(form.dataset.form)) return;
      form.querySelectorAll('input,select,button,textarea').forEach((el) => { el.disabled = true; el.setAttribute('aria-disabled', 'true'); });
    });
    document.querySelectorAll('[data-rw9-form]').forEach((form) => form.querySelectorAll('input,select,button,textarea').forEach((el) => { el.disabled = true; el.setAttribute('aria-disabled', 'true'); }));
    document.querySelectorAll('[data-rw9-action="country-review"]').forEach((el) => { el.disabled = true; el.setAttribute('aria-disabled', 'true'); });
  }
  function wrapRenderers() {
    if (typeof renderDashboard === 'function' && !renderDashboard.__rw9Wrapped) {
      const old = renderDashboard;
      const wrapped = function () { return decorateOutput(old.apply(this, arguments), buildClosurePanel() + buildEventsPanel()); };
      wrapped.__rw9Wrapped = true; baseRenderers.dashboard = old; renderDashboard = wrapped;
    }
    if (typeof renderOperations === 'function' && !renderOperations.__rw9Wrapped) {
      const old = renderOperations;
      const wrapped = function () { return decorateOutput(old.apply(this, arguments), buildSupplyPanel(currentGame(), true) + buildJobsPanel()); };
      wrapped.__rw9Wrapped = true; baseRenderers.operations = old; renderOperations = wrapped;
    }
    if (typeof renderMarket === 'function' && !renderMarket.__rw9Wrapped) {
      const old = renderMarket;
      const wrapped = function () { return decorateOutput(old.apply(this, arguments), buildDemandPanel() + buildEventsPanel()); };
      wrapped.__rw9Wrapped = true; baseRenderers.market = old; renderMarket = wrapped;
    }
    if (typeof renderFinance === 'function' && !renderFinance.__rw9Wrapped) {
      const old = renderFinance;
      const wrapped = function () { return decorateOutput(old.apply(this, arguments), buildGrowthPanel() + buildSupplyPanel(currentGame(), false)); };
      wrapped.__rw9Wrapped = true; baseRenderers.finance = old; renderFinance = wrapped;
    }
    if (typeof renderRisk === 'function' && !renderRisk.__rw9Wrapped) {
      const old = renderRisk;
      const wrapped = function () { return decorateOutput(old.apply(this, arguments), buildCountryPanel()); };
      wrapped.__rw9Wrapped = true; baseRenderers.risk = old; renderRisk = wrapped;
    }
    if (typeof renderReports === 'function' && !renderReports.__rw9Wrapped) {
      const old = renderReports;
      const wrapped = function () { const s = ensureState(); const jobs = s ? s.jobs : []; const totalCompleted = jobs.filter((j) => j.status === 'completed').length; const totalOpenUnits = jobs.filter((j) => j.status === 'queued').reduce((sum, j) => sum + Math.max(0, finite(j.remainingUnits)), 0); const panel = `<section class="rw9-panel"><h3>Layer 9 operational history</h3><p class="rw9-subtitle">Additional records for specialist delivery jobs, persistent modeled events, country-source review history, and voluntary closure are saved with this company.</p><div class="rw9-grid"><div class="rw9-stat"><strong>${totalCompleted}</strong><span>Completed specialist jobs</span></div><div class="rw9-stat"><strong>${totalOpenUnits}</strong><span>Open delivery units</span></div><div class="rw9-stat"><strong>${s ? s.eventHistory.length : 0}</strong><span>Recorded economic events</span></div><div class="rw9-stat"><strong>${s ? s.countryReviews.length : 0}</strong><span>Country source reviews logged</span></div></div><p class="rw9-note">A review log is not proof of compliance. The core financial journal remains authoritative for recorded monetary activity.</p></section>`; return decorateOutput(old.apply(this, arguments), panel); };
      wrapped.__rw9Wrapped = true; baseRenderers.reports = old; renderReports = wrapped;
    }
    if (typeof renderView === 'function' && !renderView.__rw9Wrapped) {
      const old = renderView;
      const wrapped = function () { const result = old.apply(this, arguments); lockClosedControls(); return result; };
      wrapped.__rw9Wrapped = true; renderView = wrapped;
    }
    if (typeof renderAll === 'function' && !renderAll.__rw9Wrapped) {
      const old = renderAll;
      const wrapped = function () { const result = old.apply(this, arguments); lockClosedControls(); return result; };
      wrapped.__rw9Wrapped = true; baseRenderAll = old; renderAll = wrapped;
    }
  }
  function handleCustomClick(event) {
    const target = event.target && event.target.closest ? event.target.closest('[data-rw9-action]') : null;
    if (!target) return;
    const action = target.getAttribute('data-rw9-action');
    if (action === 'close-business') {
      event.preventDefault(); event.stopImmediatePropagation();
      if (extensionClosed() || (currentGame() && currentGame().companyStatus === 'bankrupt')) return;
      const message = 'Close this business permanently in the current save? Future operating weeks will stop. Existing cash, obligations, assets, journal, history, and reports will be preserved. This does not perform a real-world legal dissolution.';
      if (typeof requestConfirm === 'function') requestConfirm(message, () => closeBusiness(), { title: 'Close business voluntarily?', confirmLabel: 'Close business', danger: true });
      else if (typeof window.confirm === 'function' && window.confirm(message)) closeBusiness();
    } else if (action === 'country-review') {
      event.preventDefault(); event.stopImmediatePropagation();
      const ok = applyReview(target.getAttribute('data-id'));
      if (!ok && typeof notify === 'function') notify('This review item could not be changed. The company may be closed or the item may already be logged.', 'warn');
    }
  }
  function handleCustomSubmit(event) {
    const form = event.target;
    if (!form || !form.getAttribute) return;
    const formType = form.getAttribute('data-rw9-form');
    if (!formType) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (extensionClosed() || (currentGame() && currentGame().companyStatus === 'bankrupt')) { if (typeof notify === 'function') notify('A closed business cannot accept new work or invest.', 'warn'); return; }
    const values = new FormData(form);
    try {
      if (formType === 'queue-job') {
        const job = queueJob({ units: values.get('units'), feePerUnit: values.get('feePerUnit'), variableCostPerUnit: values.get('variableCostPerUnit'), dueOffset: values.get('dueOffset') });
        if (typeof notify === 'function') notify(`${job.id} accepted. It will use reserved capacity when due.`);
      } else if (formType === 'growth-investment') {
        const amount = money2(values.get('amount'));
        const message = `Invest ${displayMoney(amount)} in one capitalized capacity unit? The core fixed-asset purchase will reduce cash and record an investing outflow. Monthly modeled utilities will rise by ${displayMoney(amount * 0.008)}. This is a game assumption, not a guaranteed return.`;
        const commit = () => { try { const result = investGrowth(amount); if (typeof notify === 'function') notify(`Growth unit ${result.units} recorded; monthly utilities increase by ${displayMoney(result.utilityIncrease)}.`, ''); } catch (error) { if (typeof notify === 'function') notify(error.message || 'Growth investment rejected.', 'error'); } };
        if (typeof requestConfirm === 'function') requestConfirm(message, commit, { title: 'Review growth investment', confirmLabel: 'Invest & capitalize asset', danger: true });
        else if (typeof window.confirm === 'function' && window.confirm(message)) commit();
      }
    } catch (error) { if (typeof notify === 'function') notify(error.message || 'The requested action was rejected.', 'error'); }
  }
  function handleGrowthPreviewInput(event) {
    const target = event && event.target;
    if (!target || target.id !== 'rw9-growth-amount') return;
    const g = currentGame(); if (!g) return;
    const amount = Number(target.value);
    const cashAfter = finite(g.cash) - (Number.isFinite(amount) ? amount : 0);
    let reserve = 0;
    try { const settings = typeof getWorkingCapitalPlanSettings === 'function' ? getWorkingCapitalPlanSettings() : null; reserve = settings && Number.isFinite(Number(settings.reserve)) ? Math.max(0, Number(settings.reserve)) : 0; } catch (_) {}
    const cashNode = document.querySelector('#rw9-growth-cash-preview');
    const reserveNode = document.querySelector('#rw9-growth-reserve-preview');
    if (cashNode) { cashNode.textContent = displayMoney(cashAfter, g); cashNode.setAttribute('data-state', cashAfter < 0 ? 'warning' : ''); }
    if (reserveNode) { reserveNode.textContent = displayMoney(cashAfter - reserve, g); reserveNode.setAttribute('data-state', cashAfter < reserve ? 'warning' : ''); }
  }
  function guardClosedMutations(event) {
    if (!extensionClosed()) return;
    const target = event.target;
    if (!target || !target.closest) return;
    const nav = target.closest('[data-view], [data-rw7-nav], [data-rw7-open-guide], [data-rw7-close-guide]');
    if (nav) return;
    const custom = target.closest('[data-rw9-action="close-business"], [data-rw9-action="country-review"]');
    if (custom) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    const actionElement = target.closest('[data-action]');
    if (actionElement) {
      const allowed = new Set(['export-save', 'export-csv', 'restart', 'import-save', 'toggle-cashflow-history']);
      if (!allowed.has(actionElement.getAttribute('data-action'))) { event.preventDefault(); event.stopImmediatePropagation(); }
      return;
    }
    const form = target.closest('form');
    if (form && form.getAttribute('data-rw9-form')) { event.preventDefault(); event.stopImmediatePropagation(); }
    else if (form && form.getAttribute('data-form') && form.getAttribute('data-form') !== 'working-capital-plan') { event.preventDefault(); event.stopImmediatePropagation(); }
  }
  function runWeekWithFeatures() {
    const g = currentGame(); const s = ensureState(g);
    if (!g || !s) return baseRunWeek.apply(this, arguments);
    if (s.closed) { if (typeof notify === 'function') notify('This business is voluntarily closed. Reports and exports remain available.', 'warn'); return; }
    if (g.companyStatus === 'bankrupt') return baseRunWeek.apply(this, arguments);
    maybeBeginEvent(g);
    runtimeReservedCapacity = reserveForJobs(g);
    const jobSummary = processDueJobsBeforeClose(g);
    const modifiers = installRuntimeModifiers(g);
    activeRuntimeModifiers = modifiers;
    let outcome;
    try { outcome = baseRunWeek.apply(this, arguments); }
    finally { restoreRuntimeModifiers(modifiers); activeRuntimeModifiers = null; runtimeReservedCapacity = 0; }
    if (g.lastWeek && jobSummary.jobsTouched) {
      const report = g.lastWeek;
      report.revenue = money2(finite(report.revenue) + jobSummary.revenue);
      report.cogs = money2(finite(report.cogs) + jobSummary.variableCost);
      report.tax = money2(finite(report.tax) + jobSummary.tax);
      report.net = money2(finite(report.net) + jobSummary.revenue - jobSummary.variableCost - jobSummary.tax);
      report.units = Math.max(0, Math.floor(finite(report.units))) + jobSummary.units;
      const historyRow = Array.isArray(g.history) ? g.history.find((row) => row && row.week === report.week) : null;
      if (historyRow && historyRow !== report) Object.assign(historyRow, report);
      if (Array.isArray(g.notes) && g.notes[0] && g.notes[0].week === report.week) g.notes[0].summary = `Revenue ${displayMoney(report.revenue, g)}, net result ${report.net >= 0 ? '+' : '−'}${displayMoney(Math.abs(report.net), g)}, ${report.units} units served including specialist delivery jobs.`;
    }
    applyLateJobConsequences(g, Math.max(1, Math.floor(finite(g.week, 1))));
    ageEconomicEvent(g);
    try { if (typeof saveGame === 'function') saveGame(true); if (typeof renderAll === 'function') renderAll(); } catch (_) {}
    return outcome;
  }
  function installWrappers() {
    if (typeof getIndustry === 'function' && !getIndustry.__rw9Wrapped) {
      baseGetIndustry = getIndustry;
      const wrapped = function () {
        const original = baseGetIndustry.apply(this, arguments);
        const g = currentGame(); const s = ensureState(g);
        if (!original || !g || !s) return original;
        const cfg = { ...original };
        const event = s.activeEvents[0];
        const eventCapacity = event ? finite(event.capacityFactor, 1) : 1;
        const growth = s.growth ? s.growth.units * 5 : 0;
        const reserved = isLogistics(g) ? Math.min(25, Math.max(0, Math.floor(finite(runtimeReservedCapacity)))) : 0;
        cfg.baseCapacity = Math.max(0, (finite(original.baseCapacity) + growth) * eventCapacity - reserved);
        return cfg;
      };
      wrapped.__rw9Wrapped = true; getIndustry = wrapped;
    }
    if (typeof runWeek === 'function' && !runWeek.__rw9Wrapped) {
      baseRunWeek = runWeek;
      wrappedRunWeek = function () { return runWeekWithFeatures.apply(this, arguments); };
      wrappedRunWeek.__rw9Wrapped = true; runWeek = wrappedRunWeek;
    }
    // Core runWeek saves while temporary event multipliers are active. Serialize the
    // underlying values during that save, then restore the live in-memory modifiers.
    if (typeof saveGame === 'function' && !saveGame.__rw9Wrapped) {
      baseSaveGame = saveGame;
      const wrappedSaveGame = function () {
        if (!activeRuntimeModifiers) return baseSaveGame.apply(this, arguments);
        const transient = [];
        for (const [product] of activeRuntimeModifiers.baseDemand) {
          transient.push([product, 'baseDemand', product.baseDemand]);
          const item = activeRuntimeModifiers.baseDemand.find((row) => row[0] === product);
          product.baseDemand = item ? item[1] : product.baseDemand;
        }
        for (const [product] of activeRuntimeModifiers.serviceCosts) {
          transient.push([product, 'unitCost', product.unitCost]);
          const factor = activeRuntimeModifiers.serviceCostFactor || 1;
          const originalCost = finite(product.unitCost) / factor;
          const floorCost = finite(product.cost, 0) > 0 ? finite(product.cost) * 0.9 : 0;
          const ceilingCost = finite(product.cost, 0) > 0 ? finite(product.cost) * 1.35 : Number.MAX_SAFE_INTEGER;
          product.unitCost = clamp(money2(originalCost), floorCost, ceilingCost);
        }
        try { return baseSaveGame.apply(this, arguments); }
        finally { for (const [product, key, value] of transient) product[key] = value; }
      };
      wrappedSaveGame.__rw9Wrapped = true; saveGame = wrappedSaveGame;
    }
    wrapRenderers();
  }
  function injectStyles() {
    if (document.querySelector && document.querySelector('#rw9-layer-styles')) return;
    const style = document.createElement('style'); style.id = 'rw9-layer-styles'; style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }
  function init() {
    if (initialized) return;
    initialized = true;
    injectStyles();
    installWrappers();
    document.addEventListener('input', handleGrowthPreviewInput);
    document.addEventListener('click', guardClosedMutations, true);
    document.addEventListener('click', handleCustomClick, true);
    document.addEventListener('submit', guardClosedMutations, true);
    document.addEventListener('submit', handleCustomSubmit, true);
    const meta = document.querySelector && document.querySelector('meta[name="application-version"]');
    if (meta) meta.setAttribute('content', BUILD_LABEL);
    const build = document.querySelector && document.querySelector('.brand-build');
    if (build) build.textContent = `Build ID: ${BUILD_LABEL}`;
    const g = currentGame();
    if (g) {
      ensureState(g);
      try { if (typeof renderAll === 'function') renderAll(); else if (typeof renderView === 'function') renderView(); } catch (_) {}
    }
  }
  const api = {
    build: BUILD_LABEL,
    eventCatalog: EVENT_CATALOG,
    countryReviewItems: COUNTRY_REVIEW_ITEMS,
    ensureState,
    isLogistics,
    estimateDemand,
    computeSupplySnapshot,
    handleGrowthPreviewInput,
    queueJob,
    beginEconomicEvent,
    maybeBeginEvent,
    ageEconomicEvent,
    reserveForJobs,
    processDueJobsBeforeClose,
    applyLateJobConsequences,
    investGrowth,
    applyReview,
    closeBusiness,
    isClosed: extensionClosed,
    getState: () => ensureState(),
    init,
    installWrappers,
    getRuntimeState: () => ({ initialized, currentBuild: BUILD_LABEL, wrapperInstalled: !!wrappedRunWeek, baseRunWeekAvailable: typeof baseRunWeek === 'function' })
  };
  window.REALWORLD_LAYER9 = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
