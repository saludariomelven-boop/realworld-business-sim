# REALWORLD — Layer 3.0: Country Rules Registry & Readiness

**Build ID:** `RW-LAYER-3.0 · Country Rules Registry & Readiness · 2026-10-12`

Layer 3 builds on the accepted Layer 2 business catalogue/custom builder and adds a country-specific official-source registry in **Compliance & Risk**. It also introduces three in-game review tasks, while keeping real-world laws and the simulation mechanics explicitly separate.

## What Layer 3 adds

- **14 country rule profiles:** Philippines (PH), United States (US), United Kingdom (GB), Canada (CA), Australia (AU), New Zealand (NZ), India (IN), Singapore (SG), Malaysia (MY), Germany (DE), France (FR), South Africa (ZA), Brazil (BR), and Mexico (MX).
- **Three official starting points per country:** entity setup/permits, tax registration/records, and employment/labour guidance. Each profile carries a plain-language scope note and links to official government sources.
- **In-game review checklist:** players can log that they reviewed each topic. The modeled readiness score increases by 5 points for formation/permits and 4 points each for tax records and employment/payroll, capped at 100. Each task may be logged once.
- **Honest compliance boundary:** logging a task does not submit a form, register an entity, file taxes, create an employment contract, or certify legal compliance. The links are official starting points, not a complete legal opinion.
- **Version 8 save format:** persists the completed review-task IDs while retaining integer minor-unit money storage. Existing v1–v7 saves are readable; v7 migrates with an empty task checklist and no intentional revaluation of nominal financial balances. A best-effort pre-v8 local-storage backup is created when a prior version is auto-migrated.
- **Build identity fixed:** HTML `application-version` metadata, `REALWORLD_BUILD_ID` comment, and visible in-app build label agree on Layer 3.0.

## Country-rule coverage and official starting points

These are sources surfaced by the game, grouped by country. Their scope and availability can change; check the linked authority directly for current requirements. The registry review date is **12 October 2026**.

| Country | Formation / permits | Tax registration / filing | Employment / labour |
|---|---|---|---|
| Philippines | [DTI Business Name Registration System](https://bnrs.dti.gov.ph/) | [BIR New Business Registration](https://web-services.bir.gov.ph/newbizreg/) | [DOLE](https://www.dole.gov.ph/) |
| United States | [SBA: Register your business](https://www.sba.gov/business-guide/launch-your-business/register-your-business) | [IRS: Starting a business](https://www.irs.gov/businesses/small-businesses-self-employed/starting-a-business) | [U.S. DOL: Small business compliance](https://www.dol.gov/agencies/whd/compliance-assistance/small-business) |
| United Kingdom | [GOV.UK: Set up a business](https://www.gov.uk/set-up-business) | [GOV.UK: Business tax and returns](https://www.gov.uk/browse/business/business-tax-returns) | [GOV.UK: Employment status and rights](https://www.gov.uk/government/publications/employment-status-and-employment-rights) |
| Canada | [Government of Canada: Starting a business](https://www.canada.ca/en/services/business/start.html) | [CRA: Business registration](https://www.canada.ca/en/services/taxes/business-registration.html) | [Government of Canada: Workplace standards](https://www.canada.ca/en/services/jobs/workplace.html) |
| Australia | [Australian Government: Business Registration Service](https://register.business.gov.au/registration) | [business.gov.au: Tax registration](https://business.gov.au/registrations/register-for-taxes/tax-registration-for-your-business) | [Fair Work Ombudsman: National Employment Standards](https://www.fairwork.gov.au/employment-conditions/national-employment-standards) |
| New Zealand | [Business.govt.nz: Register with government agencies](https://www.business.govt.nz/business-stage-or-type/starting-a-business/registering-with-government-agencies) | [Inland Revenue: Business and organisations](https://www.ird.govt.nz/business-and-organisations) | [Inland Revenue: Register as an employer](https://www.ird.govt.nz/employing-staff/register-as-an-employer) |
| India | [Ministry of Corporate Affairs](https://www.mca.gov.in/content/mca/global/en/home.html) | [Goods and Services Tax portal](https://www.gst.gov.in/) | [Ministry of Labour and Employment](https://labour.gov.in/acts-wise) |
| Singapore | [ACRA: Register a business](https://www.acra.gov.sg/register/business/) | [IRAS: Corporate income tax](https://www.iras.gov.sg/taxes/corporate-income-tax) | [MOM: Employment practices](https://www.mom.gov.sg/employment-practices) |
| Malaysia | [SSM: Starting a company](https://www.ssm.com.my/Pages/Register_Business_Company_LLP/Company/Starting_Company.aspx) | [LHDN: e-Daftar](https://www.hasil.gov.my/en/syarikat/perniagaan-digital/e-daftar/) | [JTKSM](https://jtksm.mohr.gov.my/) |
| Germany | [Federal startup portal](https://www.existenzgruendungsportal.de/EN/Home/inhalt.html) | [ELSTER](https://www.elster.de/eportal/start) | [Federal Ministry of Labour and Social Affairs](https://www.bmas.de/EN/Home/home.html) |
| France | [Formalities portal](https://formalites.entreprises.gouv.fr/) | [Impots.gouv.fr: Professional formalities](https://www.impots.gouv.fr/professionnel/les-formalites-accomplir) | [Ministry of Labour](https://travail-emploi.gouv.fr/) |
| South Africa | [CIPC](https://www.cipc.co.za/) | [SARS: Starting a business and tax](https://www.sars.gov.za/businesses-and-employers/small-businesses-taxpayers/starting-a-business-and-tax/) | [Department of Employment and Labour](https://www.labour.gov.za/) |
| Brazil | [REDESIM: Open a CNPJ](https://www.gov.br/empresas-e-negocios/pt-br/redesim/abrir-cnpj/) | [Receita Federal: Businesses](https://www.gov.br/receitafederal/pt-br/assuntos/empresas-e-negocios/minhas-empresas-e-negocios/) | [Ministry of Labour and Employment](https://www.gov.br/trabalho-e-emprego/pt-br) |
| Mexico | [Tu Empresa](https://www.gob.mx/tuempresa) | [SAT](https://www.sat.gob.mx/portal/public/home) | [STPS](https://www.gob.mx/stps) |

The country panel is a signposting tool. It is not an exhaustive permit list, personalized legal advice, a determination of whether a rule applies, or a guarantee that each linked page is the correct filing route for every legal form or locality.

## What did *not* become a legal engine

- The game does **not** calculate actual jurisdiction-specific income tax, VAT/GST/sales tax, payroll contributions, tax thresholds, filing deadlines, licence fees, minimum wages, overtime, leave, redundancy or statutory employer costs.
- The existing in-game tax reserve rate, wages, location factors, currency scaling and startup costs remain illustrative gameplay assumptions. The source registry does not automatically alter them.
- There is no government API, automated eligibility check, company registration, tax filing, legal compliance certification, cloud save, live FX feed or AI legal adviser.
- Exact obligations may vary by legal form, city/county/state/province, industry, revenue/turnover, employment status and staffing arrangements.

## Existing systems preserved

Layer 2's 20 curated business profiles and custom builder remain in place, including weekly simulation, pricing, market segments, seasonality, competitors, people/staffing, supplier orders, inventory capitalization, accounts payable, fixed assets, depreciation/disposal, general journal, balance sheet, cash flow, multi-loan repayment and delinquency/default systems. The catalogue remains curated configurations over shared operating engines, not 20 independent specialist simulators.

## Run automated regression tests

From the repository root:

```bash
node --test regression.test.cjs
```

The Layer 3 candidate passes **87 tests with 0 failures** locally. Coverage includes all 14 country profiles, source URL structure, readiness task score/idempotency and persistence, v7-to-v8 migration without monetary revaluation, invalid task-data rejection, all 20 business catalogue configurations, core financial reconciliation, multi-loan isolation, supplier lifecycle, and a controlled insolvency-close fixture. The inline script and test file pass Node syntax checks.

These are local candidate results only. They do not mean the package has been committed, deployed, or accepted in a live browser. Live UI acceptance should be recorded separately from source and automated evidence.

## Deployment

Replace only the repository-root `index.html`, `regression.test.cjs`, and `README.md` with the files included in the Layer 3 package. Keep `.github/workflows/realworld-regression.yml` unchanged. Use the commit message shown in `HOW_TO_REPLACE_FILES.md`, verify regression and Pages workflows pass for the same commit SHA, then run `LAYER3_LIVE_QA_PROMPT.md` against the published site.

REALWORLD is a static, single-player browser simulation. Saves are local to the browser; JSON export/import provides manual portability.
