/*
 * REALWORLD Layer 7.0 — Visual Business World & In-Game Guide
 * Additive browser-only enhancement for the existing single-file application.
 * Load this classic script after the original inline application script.
 * No remote APIs, external assets, or financial mutations are used here.
 */
(function realworldLayer7() {
  'use strict';

  const THEME_KEY = 'realworld-theme-preference-v1';
  const BUILD_LABEL = 'RW-LAYER-7.0 · Visual Business World & In-Game Guide · 2026-10-13';
  const css = `
  :root{--rw7-ink:#edf2eb;--rw7-muted:#aab5aa;--rw7-card:#17211f;--rw7-line:#34423c;--rw7-leaf:#bad5a6;--rw7-blue:#9bcbd5;--rw7-warm:#e6c59a}
  body[data-theme="soft-dark"]{--bg:#111714;--panel:#19211e;--panel2:#202a25;--line:#344039;--text:#edf2eb;--muted:#aab5aa;--soft:#829087;--accent:#bad5a6;--blue:#9bcbd5;--danger:#eaa0a0;--warn:#e8ca8e;--good:#9ed7b6;background:var(--bg);color:var(--text)}
  body[data-theme="warm-light"]{--bg:#f3f1e9;--panel:#fffdf7;--panel2:#f0eee5;--line:#ddd9cc;--text:#28352e;--muted:#616f65;--soft:#78857b;--accent:#537a51;--blue:#2e6f88;--danger:#a33d43;--warn:#86621f;--good:#2f7550;--radius:16px;background:var(--bg);color:var(--text)}
  body[data-theme="warm-light"] .sidebar,body[data-theme="warm-light"] .topbar,body[data-theme="warm-light"] .mobile-nav{background:#f7f5ef;border-color:var(--line)}
  body[data-theme="warm-light"] .brand-mark{color:#fff;background:#537a51;box-shadow:none}
  body[data-theme="warm-light"] .rw-confirm-card{background:#fffdf7;color:#28352e;border-color:#d6d9ce}body[data-theme="warm-light"] .rw-confirm-field{color:#4f5f53}
  body[data-theme="warm-light"] .tag.good{background:#e6f1e6;color:#28623d;border-color:#c3d9c2}body[data-theme="warm-light"] .tag.warning{background:#f6edda;color:#74551d;border-color:#e2d0a8}body[data-theme="warm-light"] .tag.bad{background:#f7e5e4;color:#90383d;border-color:#e3bbbb}
  body[data-theme="soft-dark"] .chart-bar{background:var(--accent)}body[data-theme="warm-light"] .chart-bar{background:#537a51}
  body[data-theme="warm-light"] .nav button{color:#526156}body[data-theme="warm-light"] .nav button:hover{background:#eaece2;color:#24352b}body[data-theme="warm-light"] .nav button.active,body[data-theme="warm-light"] .mobile-nav button.active{background:#e4eadc;color:#3f6d43}
  body[data-theme="warm-light"] .panel,body[data-theme="warm-light"] .product-card{background:#fffdf7;border-color:var(--line);box-shadow:0 5px 20px #313e2b08}
  body[data-theme="warm-light"] .product-meta div,body[data-theme="warm-light"] .mini-kpi,body[data-theme="warm-light"] .feed-icon{background:#f2f0e7;border-color:#dedbce}
  body[data-theme="warm-light"] .field input,body[data-theme="warm-light"] .field select,body[data-theme="warm-light"] .field textarea,body[data-theme="warm-light"] .inline-input,body[data-theme="warm-light"] .rw-confirm-field input{background:#fffdf8;color:#28352e;border-color:#cccfc2}
  body[data-theme="warm-light"] .primary-btn{background:#537a51;color:#fff}body[data-theme="warm-light"] .secondary-btn{background:#ecefe5;color:#29392d;border-color:#d1d8ca}body[data-theme="warm-light"] .sidebar-action{color:#58665c;border-color:#d6d9ce}
  body[data-theme="warm-light"] .bar{background:#e1e4d9}body[data-theme="warm-light"] .callout{background:#f2f5ee;color:#3d4e43;border-color:#d7dfd3}body[data-theme="warm-light"] .event-banner{background:#f7f0e0;border-color:#e5d4b4}body[data-theme="warm-light"] .event-banner .small{color:#6b5738!important}
  body[data-theme="warm-light"] .chart-bar.secondary{background:#9eb5ba}body[data-theme="warm-light"] .chart-legend{color:#59685f}body[data-theme="warm-light"] .data-table th{border-color:#d4d8ce}body[data-theme="warm-light"] .data-table td,body[data-theme="warm-light"] .list-row,body[data-theme="warm-light"] .feed-item{border-color:#e3e3d9}
  .rw7-theme-toggle{width:100%;border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:9px;padding:9px;margin:0 0 7px;text-align:left;font-size:12px;font-weight:700}
  .rw7-theme-toggle:hover{border-color:var(--accent);color:var(--text)}
  .rw7-world-hero{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(220px,.9fr);gap:20px;align-items:center;margin:0 0 20px;padding:20px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(120deg,var(--panel),var(--panel2));overflow:hidden}
  .rw7-world-copy{min-width:0}.rw7-world-label{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-bottom:10px}.rw7-world-hero h2{font-size:clamp(21px,2.2vw,28px);margin:0 0 8px;line-height:1.15;letter-spacing:-.035em}.rw7-world-hero p{font-size:13px;line-height:1.65;max-width:650px;margin:0 0 15px}.rw7-world-actions{display:flex;flex-wrap:wrap;gap:8px}.rw7-world-actions button{border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--text);padding:9px 12px;font-weight:750;font-size:12px}.rw7-world-actions button:first-child{background:var(--accent);border-color:var(--accent);color:#203023}.rw7-scene{width:100%;max-height:220px;display:block}.rw7-world-metrics{display:flex;flex-wrap:wrap;gap:7px;margin-top:13px}.rw7-world-metrics span{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:5px 8px}
  .rw7-milestones{margin-top:16px}.rw7-milestone-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.rw7-milestone{padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--panel2);min-width:0}.rw7-milestone-icon{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:#34473a;color:#d9ebc9;font-size:15px;margin-bottom:8px}.rw7-milestone.is-earned .rw7-milestone-icon{background:#31513a;color:#d8f0cf}.rw7-milestone-title{font-size:11px;font-weight:850;margin-bottom:4px}.rw7-milestone-copy{font-size:10px;line-height:1.45;color:var(--muted)}.rw7-milestone-status{font-size:9px;text-transform:uppercase;letter-spacing:.08em;font-weight:850;margin-top:8px;color:var(--soft)}.rw7-milestone.is-earned .rw7-milestone-status{color:var(--good)}
  .rw7-guide-fab{position:fixed;right:19px;bottom:18px;z-index:190;border:1px solid #78966d;border-radius:999px;background:#bad5a6;color:#1f3022;padding:12px 16px;display:flex;align-items:center;gap:9px;font-weight:850;font-size:12px;box-shadow:0 8px 28px #0004}.rw7-guide-fab:hover{filter:brightness(1.04);transform:translateY(-1px)}.rw7-guide-fab span{font-size:17px;line-height:1}
  .rw7-guide-backdrop{position:fixed;inset:0;z-index:210;background:#050a09a3;backdrop-filter:blur(2px)}.rw7-guide-panel{position:fixed;right:17px;bottom:76px;z-index:220;width:min(430px,calc(100vw - 26px));max-height:min(760px,calc(100dvh - 105px));display:flex;flex-direction:column;border:1px solid var(--line);border-radius:19px;background:var(--panel);color:var(--text);box-shadow:0 22px 80px #0006;overflow:hidden}.rw7-guide-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:17px 17px 13px;border-bottom:1px solid var(--line);background:var(--panel2)}.rw7-guide-head h2{font-size:17px;margin:0 0 3px}.rw7-guide-head p{font-size:11px;line-height:1.5;margin:0;max-width:290px}.rw7-guide-tools{display:flex;gap:6px;flex-shrink:0}.rw7-guide-tools button{border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--muted);padding:7px 9px;font-size:11px;font-weight:800}.rw7-guide-messages{padding:14px 14px 4px;overflow-y:auto;min-height:130px;max-height:34vh;display:grid;align-content:start;gap:10px}.rw7-msg{max-width:96%;font-size:12px;line-height:1.58;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel2);white-space:pre-wrap;overflow-wrap:anywhere}.rw7-msg.user{justify-self:end;background:#29382c;border-color:#3e5841;color:#edf6e8}.rw7-msg.assistant{justify-self:start}.rw7-msg-title{font-weight:850;margin-bottom:4px}.rw7-guide-next{margin-top:8px;border:1px solid var(--line);background:transparent;color:var(--blue);padding:6px 8px;border-radius:8px;font-size:11px;font-weight:800}.rw7-guide-suggestions{padding:9px 13px 11px;display:flex;flex-wrap:wrap;gap:6px}.rw7-guide-suggestions button{border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:999px;padding:7px 9px;font-size:10px;text-align:left}.rw7-guide-suggestions button:hover{border-color:var(--accent);color:var(--text)}.rw7-guide-form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line);background:var(--panel2)}.rw7-guide-form input{flex:1;min-width:0;border:1px solid var(--line);border-radius:10px;padding:11px;background:var(--bg);color:var(--text);font:inherit;font-size:12px}.rw7-guide-form button{border:0;border-radius:10px;background:var(--accent);color:#1e2b1f;padding:0 14px;font-weight:850}.rw7-guide-note{font-size:10px;color:var(--soft);padding:0 14px 10px;line-height:1.45}
  body[data-theme="warm-light"] .rw7-world-hero{background:linear-gradient(120deg,#fffdf7,#eef1e6)}body[data-theme="warm-light"] .rw7-world-actions button{background:#f1f2e9;color:#304035;border-color:#d7dccf}body[data-theme="warm-light"] .rw7-world-actions button:first-child{background:#537a51;color:#fff;border-color:#537a51}
  body[data-theme="warm-light"] .rw7-milestone{background:#f7f6ee}body[data-theme="warm-light"] .rw7-milestone-icon{background:#e4e9da;color:#496c48}body[data-theme="warm-light"] .rw7-milestone.is-earned .rw7-milestone-icon{background:#dcebd9;color:#326a40}
  body[data-theme="warm-light"] .rw7-guide-fab{background:#537a51;color:#fff;border-color:#537a51}body[data-theme="warm-light"] .rw7-guide-panel{background:#fffdf7;color:#28352e}body[data-theme="warm-light"] .rw7-guide-head{background:#f2f1e7}body[data-theme="warm-light"] .rw7-msg.user{background:#e4edde;border-color:#c5d7c0;color:#263b2b}body[data-theme="warm-light"] .rw7-guide-form{background:#f2f1e7}body[data-theme="warm-light"] .rw7-guide-form input{background:#fffdf8;color:#28352e}
  @media(max-width:980px){.rw7-milestone-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.rw7-world-hero{grid-template-columns:minmax(0,1.1fr) minmax(170px,.9fr)}}
  @media(max-width:760px){.rw7-world-hero{grid-template-columns:1fr;padding:16px;gap:8px}.rw7-world-hero .rw7-scene-wrap{order:-1;max-width:360px;margin:0 auto;width:100%}.rw7-scene{max-height:165px}.rw7-world-hero h2{font-size:22px}.rw7-world-hero p{font-size:12px}.rw7-world-actions button{flex:1}.rw7-milestone-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rw7-guide-fab{right:12px;bottom:calc(75px + env(safe-area-inset-bottom));padding:10px 13px}.rw7-guide-panel{right:8px;bottom:calc(128px + env(safe-area-inset-bottom));width:calc(100vw - 16px);max-height:min(620px,calc(100dvh - 150px))}.rw7-guide-messages{max-height:26vh}.rw7-theme-toggle{font-size:11px}.rw7-guide-note{font-size:9px}}
  @media(max-width:380px){.rw7-milestone-grid{grid-template-columns:1fr 1fr}.rw7-milestone{padding:10px}.rw7-world-metrics span{font-size:10px}.rw7-guide-fab{font-size:11px}}
  @media(prefers-reduced-motion:reduce){.rw7-guide-fab,.rw7-world-actions button{transition:none;scroll-behavior:auto}}
  `;

  function el(selector) { return document.querySelector(selector); }
  function safeEscape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }
  function getGame() {
    try { return typeof game === 'undefined' ? null : game; } catch (_) { return null; }
  }
  function formatMoney(value) {
    try { return typeof money === 'function' ? money(value, true) : String(value); }
    catch (_) { return String(value); }
  }
  function currentWeek() {
    const g = getGame();
    return g && Number.isFinite(Number(g.week)) ? Number(g.week) : 1;
  }
  function themePreference() {
    try { return localStorage.getItem(THEME_KEY) === 'warm-light' ? 'warm-light' : 'soft-dark'; }
    catch (_) { return 'soft-dark'; }
  }
  function applyTheme() {
    const theme = themePreference();
    document.body.dataset.theme = theme;
    const button = el('#rw7-theme-toggle');
    if (button) button.textContent = theme === 'warm-light' ? '◐ Appearance: Warm Light' : '◑ Appearance: Soft Dark';
    const meta = el('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'warm-light' ? '#f7f5ef' : '#111714');
  }
  function toggleTheme() {
    const next = themePreference() === 'warm-light' ? 'soft-dark' : 'warm-light';
    try { localStorage.setItem(THEME_KEY, next); }
    catch (_) { /* Appearance still changes for this session if storage is unavailable. */ }
    document.body.dataset.theme = next;
    const button = el('#rw7-theme-toggle');
    if (button) button.textContent = next === 'warm-light' ? '◐ Appearance: Warm Light' : '◑ Appearance: Soft Dark';
    const meta = el('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'warm-light' ? '#f7f5ef' : '#111714');
  }
  function industryKind(g) {
    const key = `${g && g.industry || ''} ${g && g.businessTemplateId || ''} ${g && g.businessModel || ''}`.toLowerCase();
    if (/cafe|restaurant|food|bakery|kitchen|diner/.test(key)) return 'cafe';
    if (/manufact|workshop|factory|repair|auto|construction|field|trade/.test(key)) return 'workshop';
    if (/agency|consult|service|office|account|studio|education|digital/.test(key)) return 'office';
    return 'retail';
  }
  function renderIllustration(g) {
    const kind = industryKind(g);
    const label = kind === 'cafe' ? 'cafe and counter' : kind === 'workshop' ? 'workshop and tools' : kind === 'office' ? 'office and team workspace' : 'storefront and packed orders';
    const scene = {
      retail: `<rect x="74" y="83" width="294" height="113" rx="8" fill="#e9d9b9"/><rect x="91" y="102" width="260" height="94" rx="4" fill="#f8f0dd"/><path d="M83 83h276l-14-35H98z" fill="#7da28a"/><path d="M83 83h276l-7 19H90z" fill="#496e58"/><path d="M101 48h28v35h-28zM157 48h28v35h-28zM213 48h28v35h-28zM269 48h28v35h-28zM325 48h28v35h-28z" fill="#d9e7ce"/><rect x="111" y="119" width="82" height="53" rx="3" fill="#a4c5c1"/><rect x="211" y="118" width="65" height="78" rx="3" fill="#d1ab7e"/><rect x="287" y="119" width="47" height="42" rx="3" fill="#a4c5c1"/><rect x="298" y="157" width="26" height="39" rx="2" fill="#526f60"/><rect x="421" y="129" width="64" height="54" rx="4" fill="#c99157"/><path d="M421 145h64M453 129v54" stroke="#f3dfbb" stroke-width="3"/><rect x="492" y="149" width="54" height="34" rx="4" fill="#d6b27f"/><path d="M492 161h54M519 149v34" stroke="#f3dfbb" stroke-width="3"/>`,
      cafe: `<rect x="81" y="84" width="295" height="112" rx="8" fill="#e6d5bd"/><rect x="98" y="104" width="261" height="92" rx="4" fill="#f8efe1"/><path d="M89 84h279l-17-34H106z" fill="#d8a16c"/><path d="M89 84h279l-6 19H95z" fill="#976a45"/><path d="M108 51h51v33h-51zM211 51h51v33h-51zM314 51h51v33h-51z" fill="#f7dfb8"/><rect x="112" y="124" width="229" height="24" rx="3" fill="#8d6145"/><rect x="123" y="150" width="43" height="46" rx="3" fill="#a8c9bb"/><rect x="177" y="153" width="53" height="16" rx="3" fill="#ce9b66"/><path d="M432 119h53v45h-53z" fill="#f0d5a8"/><path d="M485 126c16 0 18 26 0 26" fill="none" stroke="#b37b53" stroke-width="6"/><path d="M434 113h50" stroke="#8d6145" stroke-width="7"/><path d="M440 105q6 -8 12 0t12 0t12 0" fill="none" stroke="#fff0dc" stroke-width="4"/>`,
      workshop: `<rect x="76" y="83" width="310" height="113" rx="7" fill="#d1dcd3"/><path d="M66 85 231 32 397 85z" fill="#718b80"/><rect x="94" y="101" width="273" height="95" rx="4" fill="#eef0e4"/><rect x="109" y="116" width="77" height="80" rx="3" fill="#9bb6af"/><path d="M148 116v80M109 156h77" stroke="#e4eee7" stroke-width="4"/><rect x="206" y="132" width="140" height="12" rx="3" fill="#b88c58"/><path d="M218 144v45M334 144v45" stroke="#826446" stroke-width="7"/><path d="M235 121l15-17 9 9-15 17zM270 123l28-13 4 8-27 15z" fill="#7a8f85"/><rect x="431" y="132" width="64" height="51" rx="4" fill="#c99157"/><path d="M431 149h64M463 132v51" stroke="#f3dfbb" stroke-width="3"/><circle cx="526" cy="147" r="18" fill="#d7b37d"/><path d="M526 129v36M508 147h36" stroke="#fff0d2" stroke-width="3"/>`,
      office: `<rect x="76" y="71" width="296" height="125" rx="8" fill="#d9e1d6"/><rect x="94" y="90" width="260" height="106" rx="4" fill="#f4f1e5"/><rect x="108" y="105" width="57" height="44" rx="4" fill="#a8c9c9"/><rect x="178" y="105" width="57" height="44" rx="4" fill="#a8c9c9"/><rect x="248" y="105" width="88" height="44" rx="4" fill="#a8c9c9"/><rect x="108" y="161" width="228" height="11" rx="4" fill="#b5c6ad"/><rect x="421" y="130" width="126" height="10" rx="4" fill="#b58d63"/><path d="M435 140v46M531 140v46" stroke="#8c6e4f" stroke-width="7"/><rect x="447" y="107" width="43" height="24" rx="3" fill="#e5c5a0"/><rect x="466" y="90" width="5" height="17" fill="#a9c5a4"/><circle cx="469" cy="85" r="13" fill="#7fa38a"/><path d="M470 160h44l-6 23h-32z" fill="#85a18b"/>`
    }[kind];
    return `<svg class="rw7-scene" viewBox="0 0 620 220" role="img" aria-label="Illustration of a ${label}" xmlns="http://www.w3.org/2000/svg"><rect width="620" height="220" rx="18" fill="#dbe5d5"/><circle cx="529" cy="47" r="23" fill="#efc98e"/><path d="M0 179q125-51 244-10t211-1 165 1v51H0z" fill="#b6ccb3"/><path d="M0 197q150-30 280 0t340-3v26H0z" fill="#9cb89e"/>${scene}<path d="M36 190h548" stroke="#78977c" stroke-width="3" stroke-linecap="round"/><circle cx="49" cy="157" r="13" fill="#87a98a"/><circle cx="40" cy="141" r="12" fill="#9cbd96"/><circle cx="58" cy="139" r="11" fill="#709a7a"/><rect x="46" y="160" width="6" height="31" rx="3" fill="#718e6d"/></svg>`;
  }
  function worldHero() {
    const g = getGame();
    if (!g) return '';
    let status = 'Company open for business';
    let statusClass = 'good';
    let summary = 'Your company is ready for its next decision. Review recent results, then choose the management area that needs your attention.';
    if (g.companyStatus === 'bankrupt') {
      status = 'Operations closed'; statusClass = 'bad';
      summary = 'Normal operations are suspended in this company. You can still inspect records and export reports, or start a new company.';
    } else if (Number(g.overdraft) > 0) {
      status = 'Credit currently in use'; statusClass = 'warning';
      summary = `The company has ${formatMoney(g.overdraft)} in modeled bank overdraft. Review Finance and the latest cash-flow history before taking on additional obligations.`;
    } else if (Number(g.cash) < Number(g.monthlyRent || 0) + Number(g.monthlyUtilities || 0)) {
      status = 'Cash needs attention'; statusClass = 'warning';
      summary = 'Available cash is below one modeled month of rent and utilities. Review upcoming obligations, expected collections, and the cash runway before discretionary spending.';
    } else if (g.history && g.history.length) {
      const w = g.history[g.history.length - 1];
      summary = `Your latest closed week recorded ${formatMoney(w.revenue)} in revenue and a ${Number(w.net) < 0 ? 'negative' : 'positive'} net result of ${formatMoney(Math.abs(Number(w.net) || 0))}. Review the detail before deciding what to change next.`;
    } else {
      summary = 'Your opening balances are in place. Review prices, stock or service capacity, supplier timing, and fixed costs before closing the first operating week.';
    }
    const industry = (g.businessDisplayName || g.businessModel || g.industry || 'Business').toString();
    const dateText = typeof dateLabel === 'function' ? dateLabel(g.date, 'long') : (g.date || 'Current period');
    const wk = Number.isFinite(Number(g.week)) ? Number(g.week) : 1;
    const net = g.lastWeek && Number.isFinite(Number(g.lastWeek.net)) ? Number(g.lastWeek.net) : null;
    return `<section class="rw7-world-hero" aria-label="Business world overview"><div class="rw7-world-copy"><div class="rw7-world-label"><span class="tag ${statusClass}">${safeEscape(status)}</span><span class="tag">Week ${wk} · ${safeEscape(dateText)}</span></div><h2>Your business, at a glance.</h2><p>${safeEscape(summary)}</p><div class="rw7-world-actions"><button type="button" data-rw7-nav="operations">Review operations</button><button type="button" data-rw7-nav="finance">Open finance</button><button type="button" data-rw7-guide-question="What should I focus on next?">Ask the Guide</button></div><div class="rw7-world-metrics"><span>▦ ${safeEscape(industry)}</span><span>${safeEscape(g.currencyCode || 'Currency')} ${safeEscape(formatMoney(g.cash))} available cash</span>${net === null ? '' : `<span>${net < 0 ? '↓' : '↑'} Last net result: ${safeEscape(typeof signedMoney === 'function' ? signedMoney(net) : formatMoney(net))}</span>`}</div></div><div class="rw7-scene-wrap">${renderIllustration(g)}</div></section>`;
  }
  function milestoneList() {
    const g = getGame();
    if (!g) return [];
    const history = Array.isArray(g.history) ? g.history : [];
    const orders = Array.isArray(g.purchaseOrders) ? g.purchaseOrders : [];
    const delivered = orders.some((po) => po && po.receivedWeek !== null && po.receivedWeek !== undefined && Number.isFinite(Number(po.receivedWeek)));
    let balanced = false;
    try { balanced = typeof balanceSheet === 'function' && Math.abs(Number(balanceSheet().delta) || 0) < 1; } catch (_) { balanced = false; }
    return [
      { id: 'first-week', icon: '✦', title: 'First week completed', copy: 'Close an operating week to create your first period of results.', earned: history.length >= 1 },
      { id: 'first-revenue', icon: '↗', title: 'Revenue recorded', copy: 'Make your first modeled sale and record revenue.', earned: Number(g.totals && g.totals.revenue) > 0 },
      { id: 'supplier-delivery', icon: '▣', title: 'First delivery received', copy: 'Receive a supplier order into the company’s operating records.', earned: delivered },
      { id: 'four-weeks', icon: '◷', title: 'Four-week history', copy: 'Build four closed weeks of history for better trend context.', earned: history.length >= 4 },
      { id: 'balanced-books', icon: '✓', title: 'Books in balance', copy: 'Current modeled balance-sheet totals reconcile within rounding tolerance.', earned: balanced }
    ];
  }
  function renderMilestones() {
    const items = milestoneList();
    if (!items.length) return '';
    const earned = items.filter((item) => item.earned).length;
    return `<section class="panel rw7-milestones" aria-label="Business milestones"><div class="panel-header"><div><h3>Progress milestones</h3><div class="small muted">A gentle record of what your company has achieved · ${earned} of ${items.length}</div></div><span class="tag">No penalty for learning</span></div><div class="rw7-milestone-grid">${items.map((item) => `<article class="rw7-milestone ${item.earned ? 'is-earned' : ''}"><div class="rw7-milestone-icon" aria-hidden="true">${item.icon}</div><div class="rw7-milestone-title">${safeEscape(item.title)}</div><div class="rw7-milestone-copy">${safeEscape(item.copy)}</div><div class="rw7-milestone-status">${item.earned ? '✓ Achieved' : 'In progress'}</div></article>`).join('')}</div><p class="small muted" style="margin:10px 0 0">Milestones are derived from current game records. They do not award money, change company finances, or affect business outcomes.</p></section>`;
  }

  const viewHelp = {
    dashboard: 'The Dashboard summarizes current cash, recent revenue and net results, reputation, alerts, economic conditions, and the latest business activity. It is an overview; open Finance or Operations to inspect details before changing anything.',
    operations: 'Operations covers inventory, supplier orders, delivery timing, and operating capacity. For goods, a purchase order ties up cash before goods arrive. Review current stock and open orders before reordering.',
    market: 'Market & Sales covers offer prices, modeled customer demand, competition, and marketing. Revenue is not the same as profit: consider contribution margin and ongoing fixed costs when comparing choices.',
    people: 'People covers staffing and employee costs. Hiring can improve capacity or operating consistency, but onboarding costs and recurring wages become commitments. Review the role and available cash before hiring.',
    finance: 'Finance contains financial statements, cash-flow history, loans, fixed assets, and the Working Capital & Cash Runway Planner. Distinguish actual recorded balances from forecast values, which are scenario estimates only.',
    risk: 'Compliance & Risk contains the simulation’s modeled compliance tasks and risk indicators. They are not a determination of real-world legal compliance; verify real obligations with relevant official sources or a qualified professional.',
    reports: 'Reports & Journal provides recorded operating results and accounting entries. Use it to understand what has already happened; use forecasts elsewhere to explore hypothetical future scenarios.'
  };
  function forecastSummary() {
    try {
      if (typeof computeWorkingCapitalForecast !== 'function' || typeof getWorkingCapitalPlanSettings !== 'function') return null;
      return computeWorkingCapitalForecast(getWorkingCapitalPlanSettings());
    } catch (_) { return null; }
  }
  function guideAnswer(question) {
    const g = getGame();
    if (!g) return { title: 'Start with a company', body: 'Create or resume a company first. The Guide can then explain the active business, its recent results, suppliers, staffing, finance, and reports.', actionLabel: 'Back to setup', actionView: null };
    const q = String(question || '').trim().toLowerCase();
    const view = (typeof activeView === 'string' && activeView) ? activeView : 'dashboard';
    const currentCash = formatMoney(g.cash);
    const last = g.lastWeek;
    if (/this screen|current screen|where am i|explain (the )?(screen|page)|what is this page/.test(q)) {
      const names = { dashboard: 'Dashboard', operations: 'Operations', market: 'Market & Sales', people: 'People', finance: 'Finance', risk: 'Compliance & Risk', reports: 'Reports & Journal' };
      return { title: `${names[view] || 'Current screen'}`, body: viewHelp[view] || viewHelp.dashboard, actionLabel: 'Review this screen', actionView: view };
    }
    if (/supplier|purchase order|procure|delivery|lead time|advance/.test(q)) {
      const physical = Array.isArray(g.products) && g.products.some((p) => p.kind === 'goods');
      return { title: 'Supplier orders and delivery', body: physical ? 'In REALWORLD, a purchase order is a commitment, not instant stock. The model pays 70% of the order advance when it is placed and records the remaining 30% as payable for the following week. Stock is added only when the supplier delivery is received. Check supplier lead time, open orders, stock on hand, and the cash needed for the advance before reordering.' : 'This company is modeled primarily around services rather than physical goods. Review service capacity, customer receipts, payroll, and other operating obligations. Supplier purchasing guidance only applies where the company has physical-goods offers.', actionLabel: 'Review operations', actionView: 'operations' };
    }
    if (/stock|inventory|out of stock|reorder|product/.test(q)) {
      const goods = (g.products || []).filter((p) => p.kind === 'goods');
      if (!goods.length) return { title: 'Service capacity instead of inventory', body: 'The active company has no physical-goods offers, so stock levels are not the main constraint. Review modeled delivery capacity, staffing, customer demand, and service costs in Operations and Market & Sales.', actionLabel: 'Review operations', actionView: 'operations' };
      const rows = goods.map((p) => `${p.name}: ${Number(p.stock) || 0} units on hand${(g.purchaseOrders || []).some((po) => po.productId === p.id && po.status === 'open') ? ', with at least one open purchase order' : ''}`).join('; ');
      const low = goods.filter((p) => Number(p.stock) < Math.max(5, Number(p.baseDemand || 0) * 0.7));
      return { title: 'Inventory check', body: `${rows}. ${low.length ? `The current low-stock check flags ${low.map((p) => p.name).join(', ')}. ` : 'The basic low-stock check does not currently flag any goods. '}This is a current-state snapshot, not a guarantee of future demand or supplier arrival timing. Check open orders and their ETA before deciding to reorder.`, actionLabel: 'Review stock and orders', actionView: 'operations' };
    }
    if (/cash|runway|reserve|liquid|working capital|why.*(declin|decreas|cash)|cash.*(declin|decreas|low)/.test(q)) {
      const f = forecastSummary();
      let body = `Current available cash is ${currentCash}. `;
      if (f && f.historyAvailable) {
        body += `The Working Capital Planner's selected scenario uses ${f.historyWeeks} closed cash-flow week(s) and estimates average weekly net cash change at ${typeof signedMoney === 'function' ? signedMoney(f.averageWeeklyNet) : formatMoney(f.averageWeeklyNet)}. `;
        if (f.cashRunwayWeeks !== null && f.cashRunwayWeeks !== undefined) body += `At the selected modeled rate, the estimated runway is ${f.cashRunwayWeeks} weeks to zero. `;
        if (f.reserveBreachWeek !== null && f.reserveBreachWeek !== undefined) body += `The selected projection first falls below its reserve in week +${f.reserveBreachWeek}. `;
        body += 'These are scenario projections, not posted cash movements. Review actual cash-flow history and upcoming supplier, payroll, rent, and debt obligations to understand the drivers.';
      } else {
        body += 'There is not yet enough closed cash-flow history for a trend-based forecast. Close a week to start building history, or review the actual cash-flow statement and upcoming obligations. The planner should not invent a trend from an unclosed period.';
      }
      return { title: 'Understanding cash and runway', body, actionLabel: 'Open Finance', actionView: 'finance' };
    }
    if (/profit|profitable|revenue|sales|margin|loss|net result|earnings/.test(q)) {
      const totalRevenue = Number(g.totals && g.totals.revenue) || 0;
      const totalNet = Number(g.totals && g.totals.net) || 0;
      const lastText = last ? `The latest closed week (${last.week}) recorded ${formatMoney(last.revenue)} revenue and a ${Number(last.net) < 0 ? 'negative' : 'positive'} net result of ${formatMoney(Math.abs(Number(last.net) || 0))}. ` : 'No operating week has been closed yet, so there is no actual weekly result to compare. ';
      return { title: 'Revenue, profit, and loss', body: `${lastText}Across recorded totals, revenue is ${formatMoney(totalRevenue)} and cumulative modeled net result is ${typeof signedMoney === 'function' ? signedMoney(totalNet) : formatMoney(totalNet)}. Revenue is money earned from sales; net result subtracts modeled costs and expenses. Cash can move at a different time from profit because supplier payments, receivables, assets, and loan principal have different accounting and cash-flow treatment.`, actionLabel: 'Review reports', actionView: 'reports' };
    }
    if (/loan|debt|borrow|interest|repay/.test(q)) {
      const loans = Array.isArray(g.loans) ? g.loans : [];
      const outstanding = loans.filter((loan) => Number(loan.loanBalance) > 0.01);
      const total = outstanding.reduce((sum, loan) => sum + Math.max(0, Number(loan.loanBalance) || 0), 0);
      const body = loans.length ? `The company has ${loans.length} modeled loan record(s) and ${formatMoney(total)} across loan balances that are still outstanding. Inspect each loan's status, scheduled payment, interest, arrears, and fees in Finance. Loan principal affects cash and liabilities; interest is an expense. Do not assume an affordable payment from revenue alone.` : 'No separate loan records are currently listed for this company. Review cash flow and repayment capacity before applying for financing. The simulation models loan terms, interest, missed payments, and possible default.';
      return { title: 'Loans and repayment obligations', body, actionLabel: 'Review finance', actionView: 'finance' };
    }
    if (/staff|employee|hire|payroll|salary|wage/.test(q)) {
      return { title: 'Staffing and payroll', body: `There are ${(g.employees || []).length} employee record(s) currently listed. Hiring can increase capacity or improve an operating function, but onboarding and ongoing pay add costs. Compare the role's expected contribution with recurring wages and your cash runway; the Guide will not hire or dismiss anyone for you.`, actionLabel: 'Review People', actionView: 'people' };
    }
    if (/save|backup|export|import|restore/.test(q)) {
      return { title: 'Protecting your company save', body: 'REALWORLD saves on this browser. Use “Export game save (.json)” to keep a backup in a safe location before experimenting or changing devices. Import validates the file before replacing the active company. Keep backups private if your company notes contain personal information, and do not overwrite your only good backup.', actionLabel: 'Open reports and save tools', actionView: 'reports' };
    }
    if (/compliance|legal|permit|tax law|regulation/.test(q)) {
      return { title: 'Compliance and modeled rules', body: 'The Compliance & Risk view contains modeled readiness tasks and risk indicators for the selected jurisdiction. Completing a game task changes only the modeled simulation state; it does not confirm that a real business satisfies every current legal, tax, licensing, or local requirement. Use the listed official sources and qualified advice for real-world decisions.', actionLabel: 'Review Compliance & Risk', actionView: 'risk' };
    }
    if (/report|journal|account|balance sheet|transaction/.test(q)) {
      return { title: 'Reports and recorded transactions', body: viewHelp.reports, actionLabel: 'Open Reports & Journal', actionView: 'reports' };
    }
    if (/what should i do|focus on next|next step|recommend|help me start|where should i start|what now/.test(q)) {
      if (g.companyStatus === 'bankrupt') return { title: 'Review a closed company', body: 'Normal operations are suspended for this company. First export the records you want to keep, review Reports & Journal to understand the history, and only then decide whether to start a new company.', actionLabel: 'Review reports', actionView: 'reports' };
      if (Number(g.overdraft) > 0 || Number(g.cash) < Number(g.monthlyRent || 0) + Number(g.monthlyUtilities || 0)) return { title: 'First priority: understand liquidity', body: 'Start in Finance. Review actual cash-flow history, current obligations, and the Working Capital & Cash Runway Planner. Treat projected reserve breaches as warnings about a scenario rather than actual transactions. Avoid making a large commitment until you understand the cash timing.', actionLabel: 'Open Finance', actionView: 'finance' };
      const low = (g.products || []).filter((p) => p.kind === 'goods' && Number(p.stock) < Math.max(5, Number(p.baseDemand || 0) * 0.7));
      if (low.length) return { title: 'First priority: check stock cover', body: `The current low-stock check flags ${low.map((p) => p.name).join(', ')}. Review on-hand stock and open purchase-order ETAs in Operations. Check the cash advance and supplier lead time before placing any order.`, actionLabel: 'Open Operations', actionView: 'operations' };
      if (!g.history || !g.history.length) return { title: 'Start with a baseline review', body: 'Review the starting products or services, prices, stock or capacity, supplier timing, and fixed costs. Then close your first operating week when you are ready; this creates the first period of actual history for later comparisons.', actionLabel: 'Review Operations', actionView: 'operations' };
      return { title: 'Choose the next decision deliberately', body: 'Review the latest operating result, then compare contribution margin, stock or service capacity, cash flow, and current obligations. Make one change at a time where practical so you can understand how the simulation responds.', actionLabel: 'Review the Dashboard', actionView: 'dashboard' };
    }
    return { title: 'Let’s find the right help topic', body: 'I can explain the current screen, cash runway, working capital, supplier orders, inventory, pricing and profit, staffing, loans, saving and backups, compliance, and reports. I use this simulation’s known rules and visible company state; I will say when a question is outside that knowledge rather than inventing a mechanic.', actionLabel: 'Explain the current screen', actionView: view };
  }

  let guideMessages = [];
  let guideOpen = false;
  let previousFocus = null;
  function renderGuideMessages() {
    const host = el('#rw7-guide-messages');
    if (!host) return;
    host.innerHTML = guideMessages.map((message) => {
      const user = message.role === 'user';
      const action = !user && message.actionView ? `<button type="button" class="rw7-guide-next" data-rw7-nav="${safeEscape(message.actionView)}">${safeEscape(message.actionLabel || 'Open relevant screen')} →</button>` : '';
      return `<div class="rw7-msg ${user ? 'user' : 'assistant'}" ${user ? '' : 'aria-live="polite"'}>${user ? safeEscape(message.text) : `<div class="rw7-msg-title">${safeEscape(message.title || 'REALWORLD Guide')}</div>${safeEscape(message.body || '')}${action}`}</div>`;
    }).join('');
    host.scrollTop = host.scrollHeight;
  }
  function sendGuideQuestion(rawQuestion) {
    const question = String(rawQuestion || '').trim().slice(0, 300);
    if (!question) return;
    guideMessages.push({ role: 'user', text: question });
    guideMessages.push({ role: 'assistant', ...guideAnswer(question) });
    if (guideMessages.length > 24) guideMessages = guideMessages.slice(-24);
    renderGuideMessages();
    const input = el('#rw7-guide-question');
    if (input) { input.value = ''; input.focus(); }
  }
  function openGuide(seedQuestion) {
    if (!guideOpen) previousFocus = document.activeElement || null;
    guideOpen = true;
    const backdrop = el('#rw7-guide-backdrop');
    const panel = el('#rw7-guide-panel');
    const fab = el('#rw7-guide-fab');
    if (backdrop) backdrop.classList.remove('hidden');
    if (panel) panel.classList.remove('hidden');
    if (fab) fab.setAttribute('aria-expanded', 'true');
    if (!guideMessages.length) guideMessages.push({ role: 'assistant', title: 'Welcome to the REALWORLD Guide', body: 'Ask about the current screen, your company’s recorded results, or how a game mechanic works. I explain and point you to relevant screens; I never place orders or change your company.' });
    renderGuideMessages();
    window.setTimeout(() => { const input = el('#rw7-guide-question'); if (input) input.focus(); }, 0);
    if (seedQuestion) sendGuideQuestion(seedQuestion);
  }
  function closeGuide() {
    guideOpen = false;
    const backdrop = el('#rw7-guide-backdrop');
    const panel = el('#rw7-guide-panel');
    const fab = el('#rw7-guide-fab');
    if (backdrop) backdrop.classList.add('hidden');
    if (panel) panel.classList.add('hidden');
    if (fab) fab.setAttribute('aria-expanded', 'false');
    if (previousFocus && typeof previousFocus.focus === 'function') { try { previousFocus.focus(); } catch (_) {} }
    previousFocus = null;
  }
  function installShell() {
    if (el('#rw7-guide-panel')) return;
    const style = document.createElement('style');
    style.id = 'rw7-styles';
    style.textContent = css;
    document.head.appendChild(style);

    const build = document.querySelector('.brand-build');
    if (build) build.textContent = `Build ID: ${BUILD_LABEL}`;
    const appVersion = el('meta[name="application-version"]');
    if (appVersion) appVersion.setAttribute('content', BUILD_LABEL);
    const description = el('meta[name="description"]');
    if (description) description.setAttribute('content', 'A realistic, approachable business simulation with illustrated company views and an in-game guide.');
    document.body.dataset.theme = themePreference();

    const sidebar = el('.sidebar-bottom');
    if (sidebar) sidebar.insertAdjacentHTML('afterbegin', '<button id="rw7-theme-toggle" class="rw7-theme-toggle" type="button" aria-label="Change appearance">◑ Appearance: Soft Dark</button>');

    const app = el('#app');
    if (app) app.insertAdjacentHTML('beforeend', `
      <button id="rw7-guide-fab" class="rw7-guide-fab" type="button" data-rw7-open-guide aria-controls="rw7-guide-panel" aria-expanded="false"><span aria-hidden="true">✦</span> REALWORLD Guide</button>
      <div id="rw7-guide-backdrop" class="rw7-guide-backdrop hidden" data-rw7-close-guide aria-hidden="true"></div>
      <aside id="rw7-guide-panel" class="rw7-guide-panel hidden" role="dialog" aria-modal="true" aria-labelledby="rw7-guide-title" aria-describedby="rw7-guide-description">
        <div class="rw7-guide-head"><div><h2 id="rw7-guide-title">REALWORLD Guide</h2><p id="rw7-guide-description">An in-game business mentor. Explanations only — you stay in control.</p></div><div class="rw7-guide-tools"><button type="button" id="rw7-guide-theme" aria-label="Change appearance">Appearance</button><button type="button" data-rw7-close-guide aria-label="Close guide">✕</button></div></div>
        <div id="rw7-guide-messages" class="rw7-guide-messages" aria-live="polite"></div>
        <div class="rw7-guide-suggestions" aria-label="Suggested questions">
          <button type="button" data-rw7-question="Explain the current screen">Explain this screen</button>
          <button type="button" data-rw7-question="What should I focus on next?">What next?</button>
          <button type="button" data-rw7-question="Why is my cash decreasing?">Cash runway</button>
          <button type="button" data-rw7-question="How do supplier orders work?">Supplier orders</button>
          <button type="button" data-rw7-question="Explain revenue and profit">Profit & revenue</button>
        </div>
        <div class="rw7-guide-note">Answers use locally available game rules and company data. Forecasts are estimates; the Guide does not post transactions or change your company.</div>
        <form id="rw7-guide-form" class="rw7-guide-form"><input id="rw7-guide-question" name="question" type="text" maxlength="300" autocomplete="off" placeholder="Ask about your business…" aria-label="Ask the REALWORLD Guide" required><button type="submit">Ask</button></form>
      </aside>`);
    applyTheme();
  }

  function installDashboardEnhancements() {
    if (typeof renderDashboard !== 'function' || renderDashboard.__rw7Wrapped) return;
    const previous = renderDashboard;
    const wrapped = function renderDashboardWithWorldAndMilestones() {
      const original = previous.apply(this, arguments);
      let result = String(original);
      result = result.replace('<div class="page-head">', `${worldHero()}<div class="page-head">`);
      const footerMarker = '<div class="footnote" style="margin-top:18px">';
      if (result.includes(footerMarker)) result = result.replace(footerMarker, `${renderMilestones()}${footerMarker}`);
      else result += renderMilestones();
      return result;
    };
    wrapped.__rw7Wrapped = true;
    renderDashboard = wrapped;
  }

  function routeTo(view) {
    const valid = ['dashboard', 'operations', 'market', 'people', 'finance', 'risk', 'reports'];
    if (!valid.includes(view)) return;
    try { if (typeof navSet === 'function') navSet(view); } catch (_) { /* Keep help available even if navigation fails. */ }
    closeGuide();
  }
  function handleClick(event) {
    const q = event.target.closest('[data-rw7-question]');
    if (q) { event.preventDefault(); sendGuideQuestion(q.getAttribute('data-rw7-question')); openGuide(); return; }
    const ask = event.target.closest('[data-rw7-guide-question]');
    if (ask) { event.preventDefault(); openGuide(ask.getAttribute('data-rw7-guide-question')); return; }
    if (event.target.closest('[data-rw7-open-guide]')) { event.preventDefault(); openGuide(); return; }
    if (event.target.closest('[data-rw7-close-guide]')) { event.preventDefault(); closeGuide(); return; }
    if (event.target.closest('[data-rw7-theme-toggle], #rw7-theme-toggle, #rw7-guide-theme')) { event.preventDefault(); toggleTheme(); return; }
    const nav = event.target.closest('[data-rw7-nav]');
    if (nav) { event.preventDefault(); routeTo(nav.getAttribute('data-rw7-nav')); }
  }
  function handleSubmit(event) {
    if (!event.target || event.target.id !== 'rw7-guide-form') return;
    event.preventDefault();
    const input = el('#rw7-guide-question');
    if (input) sendGuideQuestion(input.value);
  }
  function handleKeydown(event) {
    if (event.key === 'Escape' && guideOpen) { closeGuide(); return; }
    if (event.key === 'Tab' && guideOpen) {
      const panel = el('#rw7-guide-panel');
      const focusables = panel ? Array.from(panel.querySelectorAll('button:not([disabled]), input:not([disabled])')) : [];
      if (focusables.length) {
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && event.target && event.target.id === 'rw7-guide-question') {
      event.preventDefault();
      const input = el('#rw7-guide-question');
      if (input) sendGuideQuestion(input.value);
    }
  }

  function init() {
    installShell();
    installDashboardEnhancements();
    // The base application's boot runs before this separate script loads. If an
    // existing save already opened the Dashboard, redraw once so its new hero
    // and milestones appear immediately instead of waiting for navigation.
    if (getGame() && typeof renderView === 'function') {
      try { renderView(); } catch (_) { /* Leave the base Dashboard usable if rendering fails. */ }
    }
    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleSubmit);
    document.addEventListener('keydown', handleKeydown);
    const meta = el('meta[name="application-version"]');
    if (meta) meta.setAttribute('content', BUILD_LABEL);
    const commentBuild = document.querySelector('.brand-build');
    if (commentBuild) commentBuild.textContent = `Build ID: ${BUILD_LABEL}`;
    // Source-level build identity is updated in index.html during installation; this value helps manual checks.
    window.REALWORLD_LAYER7 = {
      build: BUILD_LABEL,
      guideAnswer,
      milestoneList,
      renderMilestones,
      renderIllustration,
      worldHero,
      themePreference,
      toggleTheme,
      getGuideState: () => ({ open: guideOpen, messages: guideMessages.length })
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
