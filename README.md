# REALWORLD — Layer 2.0: Business Catalogue & Custom Business Builder

**Build ID:** `RW-LAYER-2.0 · Business Catalogue & Custom Business Builder · 2026-10-12`

Layer 2 extends REALWORLD Core 1.0 and the Layer 1 country/location/currency foundation. It adds a catalogue of 20 curated starter business profiles and a custom-business builder that lets players define their own business, service/product offers, and setup assumptions.

## Layer 2 features

- **20 curated business profiles** across retail and commerce, food and hospitality, trade and field services, personal services, and digital/professional work.
- **Custom business builder** with a player-entered business name and description, a goods/food/services/mixed operating model, one to three offers, and editable opening equipment, rental deposit, monthly rent, and utilities.
- **Custom offer types** distinguish physical goods from services. Service offers do not carry physical inventory; goods can use the existing supplier-purchase-order lifecycle.
- **Mixed operations support** shows service-delivery planning alongside stocked-goods supplier purchasing when both types of offers exist.
- **Business-aware save validation** validates catalogue-specific products and staffing roles, and permits custom offer IDs/types only within the defined schema.
- **Layer 1 audit fixes carried forward:** Reports descriptors use the selected currency code instead of hardcoded Philippine pesos; foreign-currency loan defaults align with localized minimum, step, and current portfolio capacity.
- **Save format version 7** preserves integer-minor-unit storage and persists `businessTemplateId`, `businessModel`, `businessDisplayName`, and `businessDescription`. Legacy v1–v6 saves remain readable and are backfilled with a compatible default business identity without revaluing existing nominal financial balances.

## Important simulation boundary

The 20 catalogue entries are curated playable starter configurations built on the existing shared Retail, Cafe & Food, and Digital Agency operating engines. They are not 20 completely independent specialist simulators. Custom businesses define up to three product/service offers and startup-cost assumptions within the supported goods, food, services, or mixed operating models. More advanced sector-specific mechanics (for example, manufacturing lines, detailed auto-repair job scheduling, construction project control, or franchise agreements) are not claimed to be fully simulated in this layer.

Country and currency profiles from Layer 1 remain in place. Currency reference scaling and local-cost factors are fixed illustrative gameplay assumptions, not live exchange rates or official local market prices. This layer does not yet apply current jurisdiction-specific tax, employment, licensing, registration, banking, or trade law.

## Existing systems preserved

- Weekly business simulation, pricing, customer segments, market positioning, seasonality, competitors, staffing and operations.
- Purchase orders, supplier advances, delivery delays, inventory capitalization, and accounts payable.
- General journal, balance sheet, income statement, cash-flow statements, and 104-period cash-flow history limit.
- Fixed assets, depreciation, disposals, gain/loss accounting, and investing cash-flow classification.
- Multi-loan financing, per-loan repayments, overdue recovery, four-week default rule, default isolation, and bankruptcy behavior.
- Country-aware formatting, v6/v5/v4 and legacy-save migration paths, JSON export/import, and CSV export.

## Validation

Run from the repository root:

```bash
node --test regression.test.cjs
```

The Layer 2 candidate passed **81 tests with 0 failures** in the local regression suite. The inline application script and test file pass Node syntax checks. These are local candidate results only; they do not mean this layer has been committed, deployed, or live-browser accepted.

## Deployment

Replace only these repository-root files with the matching files in the Layer 2 package:

- `index.html`
- `regression.test.cjs`
- `README.md`

Keep `.github/workflows/realworld-regression.yml` unchanged. Commit to `main`, confirm regression tests and GitHub Pages deployment both succeed for the same commit, then run `LAYER2_LIVE_QA_PROMPT.md` against the published site.

REALWORLD is a static, single-player browser simulation. Saves are local to the browser; JSON export/import provides manual portability. No cloud account, multiplayer server, or real financial service is implemented.
