# REALWORLD — Layer 4.0: Save Import & Migration Assurance

**Build ID:** `RW-LAYER-4.0 · Save Import & Migration Assurance · 2026-10-12`

Layer 4 focuses on the application's save-file boundary. It builds on the accepted Layer 3.0 country registry and checklist without changing the underlying business simulation or raising the save format version.

## What Layer 4 adds

- **Import preflight:** JSON is parsed into a detached candidate and validated before the active company is changed. The confirmation identifies the imported company, business, week, country/currency, source format, and current target format.
- **Explicit migration messaging:** flat legacy v1 and envelope v2–v7 files are identified as older formats and normalized to the current format when imported. Existing balances remain denominated in the save's nominal currency; there is no intentional FX revaluation.
- **Atomic active-state handover:** the imported candidate is encoded and written to local storage before it replaces the in-memory company. If validation or storage write fails, the active company remains unchanged.
- **Bounded file handling:** both declared file size and decoded text size are checked against the 2 MiB limit. Invalid JSON, unsupported/corrupt saves, file-read errors, prototype-sensitive property names and storage failures provide a visible error without replacing the active company.
- **Migration regression fixtures:** test harnesses pass version 6 country-aware and version 7 catalogue-aware fixtures through the same `importSaveFile` preflight path used by the browser. Tests check that financial values, nominal currency and compatible business identity survive migration to v8.
- **Country source host audit:** regression coverage checks all 42 country-rule links (14 countries × formation/tax/employment) use HTTPS and a country-specific allowlisted official-source domain family. This is a structural/domain safety check, not a guarantee every page remains available forever.
- **Build identity:** the HTML application-version metadata, `REALWORLD_BUILD_ID` comment, and visible sidebar label agree on Layer 4.0.

## Save format remains v8

Layer 4 does not add a new persisted game-state field. New exports continue to use `saveFormatVersion: 8` and `moneyStorage: "integer-minor-unit"`. Existing v1–v8 files remain supported through the compatibility paths already in the app. v6 saves receive the compatible default business identity and v8 checklist field; v7 saves receive an empty readiness checklist. The import flow never asks the player to manually edit JSON to migrate a save.

## Source URL review notes

This release updates two source destinations following current official-site review:

- Germany's startup portal now points to the current `Navigation/DE/Home/home` page on the official Existenzgründungsportal.
- Malaysia's labour link now points directly to JTKSM's English Acts & Guidelines page over HTTPS.

The allowlist test evaluates all 42 hosts. Network access checks were successful for several sources, while some government hosts rejected or intermittently failed automated retrieval. Those fetch errors are not treated as proof that a site is dead, and the app continues to label its registry as official starting points rather than a verified checklist of legal obligations. See `COUNTRY_SOURCE_AUDIT.md` for scope and results.

## Existing systems preserved

The business catalogue/custom builder, country/currency profiles, readiness checklist, market demand/seasonality/rivals, staff and payroll accrual, purchase orders/supplier advances/payables, inventory, fixed assets/depreciation/disposal, journal, balance sheet, cash-flow statements, and multi-loan/delinquency/default mechanics are preserved. The registry still does not calculate jurisdiction-specific tax or employment law.

## Automated tests

Run from the repository root:

```bash
node --test regression.test.cjs
```

The Layer 4 candidate passes **96 tests with 0 failures** locally. This includes actual handler-path fixtures for v6 and v7 file imports, rejection of malformed and oversized imports, file-reader errors, storage-write failure without active-state replacement, prototype-sensitive-key rejection, source host allowlists, and all preceding accounting/business-regression coverage.

Automated tests use a deterministic browser/FileReader mock. They exercise the production import handler and migration functions but do not replace final hands-on testing of the published website or a real operating system's file picker.

## Deployment

Replace only the repository-root `index.html`, `regression.test.cjs`, and `README.md` with these files. Leave `.github/workflows/realworld-regression.yml` unchanged. Use the commit message in `HOW_TO_REPLACE_FILES.md`, verify the regression and Pages workflows succeed for the same commit SHA, then run `LAYER4_LIVE_QA_PROMPT.md` against the live published app.

REALWORLD remains a static, single-player browser simulation. Saves are browser-local; JSON export/import provides manual portability.
