# REALWORLD — Layer 1: Country, Location & Currency Foundation

**Build:** `RW-LAYER-1.0 | Country, Location & Currency Foundation · 2026-10-12`

REALWORLD is a text-first, static, single-player business simulation. Layer 1 introduces country selection, location metadata, currency-aware formatting, localized starter economics, and a versioned save format that preserves older companies safely. It is a foundation for later jurisdiction and industry layers—not a claim that all local laws are already simulated.

## Layer 1 scope

### Country and location setup

New companies select one of 14 initial profiles:

- Philippines — PHP, `en-PH`
- United States — USD, `en-US`
- United Kingdom — GBP, `en-GB`
- Canada — CAD, `en-CA`
- Australia — AUD, `en-AU`
- New Zealand — NZD, `en-NZ`
- India — INR, `en-IN`
- Singapore — SGD, `en-SG`
- Malaysia — MYR, `en-MY`
- Germany — EUR, `de-DE`
- France — EUR, `fr-FR`
- South Africa — ZAR, `en-ZA`
- Brazil — BRL, `pt-BR`
- Mexico — MXN, `es-MX`

The setup collects country, city/locality, and region/state/province text. A company saves its selected profile, location, currency code and locale. Country changes are only applied when creating a new company; they do not retroactively revalue an existing company's balance sheet.

The initial country list is deliberately limited to the profiles above. More profiles can be added later after currency precision and appropriate benchmark data are reviewed.

### Currency and localized starter economics

- Every displayed monetary amount uses the selected currency profile and locale across the dashboard, operating, market, staffing, finance, risk and reports screens.
- New-company prices, base goods costs and competitor reference prices use a fixed currency reference scale from the PHP benchmark. Starter capital, equipment, deposits, rent, utilities, marketing, employee salary and onboarding assumptions additionally use a **local-cost game-balancing factor**.
- Supported profiles in this layer use two decimal minor units. Stored money is encoded as safe integer minor units, while runtime calculations continue using currency amounts rounded to two decimals.
- Currency profiles and their economics are illustrative game calibration—not a guarantee of actual exchange value, cost of living, supplier prices or business setup cost.

### Reference data and important limitations

- Fixed currency conversion anchors use an XE PHP currency-table snapshot dated **11 October 2026 at 16:00 UTC**. These are not live FX rates and are not what a player, bank, transfer service or business is guaranteed to receive. Reference: [XE currency tables (PHP base)](https://www.xe.com/currencytables/?from=PHP&date=2026-10-11).
- Currency identifiers follow ISO 4217 codes. Reference: [ISO 4217 currency codes](https://www.iso.org/cms/%20render/live/en/sites/isoorg/home/standards/popular-standards/iso-4217--currency-codes.html).
- Number and currency display uses the browser's `Intl.NumberFormat` internationalization API. Reference: [MDN Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat).
- City and region are saved as player-entered location text. Layer 1 does not geocode addresses or validate subdivisions.
- Country selection **does not yet activate country-specific company formation, taxes, payroll/employment law, licensing, accounting standards, banking products, or trade/customs rules**. Those remain generalized illustrative mechanics until the later jurisdiction-rules layer is implemented and sourced.
- Zero-minor-unit currencies and multi-currency accounting are not enabled yet. All monetary fields belong to the single currency selected for the company; exchange-rate changes, FX gains/losses, and international consolidation are out of scope for Layer 1.

## Existing Core 1.0 systems preserved

- Business scenarios: Online Retail, Cafe & Food, and Digital Agency.
- Weekly operations, pricing, inventory, customer segments, market strategy, seasonality, simulated competitors, supplier selection and purchase orders.
- Double-entry journal, balance sheet, income statement, cash-flow statement and 104-period cash-flow history.
- Fixed assets, depreciation, disposals, concurrent term loans, individual repayment, arrears, default, credit risk and bankruptcy safeguards.
- Browser-local autosave, JSON export/import, CSV export, deep save validation and prior-save migration.

## Save format and compatibility

Current save envelope:

```json
{
  "saveFormat": "REALWORLD",
  "saveFormatVersion": 6,
  "moneyStorage": "integer-minor-unit",
  "currency": "USD",
  "state": {}
}
```

The example `currency` value is illustrative. Actual saves store the selected company's currency and full state.

- V6 pairs the country/currency profile with integer minor-unit amounts. The profile must agree with the envelope currency.
- Older flat v1 saves and v2, v3, v4, and v5 envelopes remain readable. Historical saves were PHP amounts; migration assigns the Philippines/PHP profile and preserves their original amounts rather than silently converting values based on new FX data.
- When a prior-format save is upgraded on browser boot, the app attempts a best-effort backup before writing the v6 envelope. Export an independent JSON backup of any valuable company before updating the app.
- Save files are local to the browser/device. GitHub Pages does not provide accounts, cloud saves or multiplayer persistence.

## Local regression suite

Requires a current Node.js installation; no package installation is required.

```sh
node --test regression.test.cjs
```

The Layer 1 local suite passed **73 tests, 0 failures, 0 skipped** in the Node DOM/storage-mocked harness. Tests cover all 14 country profiles, selected-currency formatting, foreign-currency business creation and transactions, v6 storage, older-save migration, and existing Core 1.0 mechanics. This is not a substitute for the post-commit live acceptance check.

## Deployment

1. Export any important company save from the current published game and keep it somewhere safe.
2. Replace the repository-root `index.html`, `regression.test.cjs`, and `README.md` with the supplied Layer 1 files.
3. Leave `.github/workflows/realworld-regression.yml` unchanged.
4. Commit the three files to `main`.
5. Verify the regression and Pages deployment workflows both succeed.
6. Run `LAYER1_LIVE_QA_PROMPT.md` against the published site. Record live results separately from automated evidence.

## Next layers (planned, not included here)

- Layer 2: business catalogue and custom business definition using structured operating models.
- Layer 3: jurisdiction-specific company formation, taxes, payroll/labor and regulatory assumptions using maintained authoritative sources.
- Layer 4: context-aware Business Copilot with forecasts and player-approved actions (requires a secure AI service, not a public client-side secret).
- Layer 5: richer static 2D business/location visuals, progression, and broader gameplay polish.

Layer 1 is the country/location/currency foundation only. The later layers will reuse it rather than redoing this setup or currency logic.
