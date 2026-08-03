# Heirline Internship Checkpoint and Continuation Handoff

## Outcome

The final presentation converted the internship project into a funded
continuation opportunity. Vantage AI approved continued weekly syncs and an
initial $200 paid-media test after the team moves Heirline to a professional
custom domain and supplies a precise launch plan.

This checkpoint preserves the internship evidence while clearly separating the
next phase from the completed final presentation.

## Current product

- Live demo: https://migthycoder.github.io/vantageAI/
- Repository: https://github.com/Jasminek25/vantageAI
- Product name: Heirline
- Current status: demo-ready prototype with a working landing-page interest
  form, readiness assessment, parent-to-heir goal handoff, parent dashboard,
  heir dashboard, browser-local coach fallback, responsive UI, and a Google
  Sheets validation collector.

### What is live

- Early-access and advisor-pilot form submission
- Campaign and page-view event capture
- Readiness-response persistence in the browser
- Consent-based parent-to-heir learning-goal handoff
- Responsive navigation and role switching
- Deterministic demo-safe coach responses and calculations

### What remains illustrative or prototype-only

- The dashboard's sample campaign metrics
- Fictional Rivera family and asset data
- Professional, legal, tax, and financial-advice workflows
- Production authentication, encryption, permissions, audit logging, and
  multi-tenant data storage
- Automated lead qualification and campaign decisioning

## Team workstreams

- Jasmine: shared landing page, product framing, and presentation foundation
- Vedang: parent dashboard, product integration, validation-ready flows,
  deployed data collection, repository documentation, and market-validation plan
- Aayush: heir dashboard backend, inheritance assistant, assets, planning, and
  document-tracking foundations

The repository records seven project pull requests in total. Six were opened
from Vedang's GitHub account; PR #2 contains Aayush's heir-dashboard work.

## Pull-request evidence

1. PR #1 — Build parent inheritance dashboard  
   https://github.com/Jasminek25/vantageAI/pull/1
2. PR #2 — Aayush heir-dashboard contribution  
   https://github.com/Jasminek25/vantageAI/pull/2
3. PR #3 — Preserve shared project documentation  
   https://github.com/Jasminek25/vantageAI/pull/3
4. PR #4 — Integrate parent and heir experiences  
   https://github.com/Jasminek25/vantageAI/pull/4
5. PR #5 — Add validation-ready Heirline product flows  
   https://github.com/Jasminek25/vantageAI/pull/5
6. PR #6 — Connect pilot validation dashboard  
   https://github.com/Jasminek25/vantageAI/pull/6
7. PR #7 — Add Heirline market-validation pilot plan  
   https://github.com/Jasminek25/vantageAI/pull/7

## Core project artifacts

- Final presentation: https://docs.google.com/presentation/d/1fnFYSiZhZIySgh79uv_Qnoi8QRaC15TtlVuAJ6axKzo/edit
- Pilot validation dashboard: https://docs.google.com/spreadsheets/d/15XcxWHSI_WAaTp5WdWi-kjlr6f9sUQnLNWq4pZNbrWw/edit
- Parent dashboard scope: `docs/PARENT_DASHBOARD_SCOPE.md`
- Integration guide: `docs/INTEGRATION_GUIDE.md`
- Validation setup: `docs/VALIDATION_DATA_SETUP.md`
- Continuation marketing plan: `docs/PILOT_MARKETING_PLAN.md`
- Vedang contribution record: `docs/VEDANG_FINAL_CONTRIBUTION_RECORD.md`

Vedang's private speaking script is intentionally excluded from the shared
handoff.

## Approved continuation plan

### Step 1 — professional domain

- Vantage AI selects and owns the registrar account, payment method, recovery
  email, and renewal.
- `heirline.com` is already registered and listed for resale. Live registry
  checks on August 2 returned no registration record for `tryheirline.com`,
  `joinheirline.com`, or `heirlinewealth.com`; availability and price must still
  be confirmed at checkout.
- `tryheirline.com` is the recommended pilot option, subject to An's approval.
- Domain availability is not brand clearance. Preliminary research found other
  estate and inheritance businesses using Heirline or similar wording, so
  Vantage AI should review the name before purchase and obtain appropriate
  clearance before a scaled launch.
- The selected domain points to the existing GitHub Pages deployment with free
  HTTPS; a separate hosting subscription is not currently required.

### Step 2 — $200 paid-media pilot

- Domain: up to $12
- Meta campaign: $100
- Reddit campaign: $70
- Domain checkout, tax, or tracking reserve: $18
- Maximum authorized pilot spend: $200

The domain comes from the same $200 ceiling. The reserve remains unspent unless
needed. Any amount that would push the total above $200 reduces Meta spend.

### Step 3 — Vantage AI setup needed

Vantage AI should provide or confirm:

1. final domain choice and registrar/payment ownership;
2. Meta Business Portfolio and ad-account ownership;
3. Reddit Ads account ownership;
4. legal advertiser name, business address, contact information, and payment
   method;
5. privacy-policy, terms, and disclosure approval;
6. the adult owner responsible for responding to leads; and
7. who approves campaign launch, changes, and any future spend.

### Step 4 — team launch checklist

1. connect the custom domain and verify HTTPS;
2. update all public URLs and UTM destinations;
3. confirm the live form and event collector;
4. test the validation sheet with clearly separated sample and live rows;
5. load the finished Meta and Reddit creative;
6. complete one end-to-end test submission on each campaign path;
7. obtain Vantage AI's written launch approval; and
8. begin the seven-day capped test, followed by analysis and a decision memo.

The exact settings, three tagged destinations, QA procedure, and decision rules
are in `docs/PILOT_LAUNCH_CHECKLIST.md`.

## Repository verification

Use the declared project checks:

```bash
npm run validate
npm run build
npm run test:api
```

No real financial documents, account balances, government identifiers, API
keys, or personal financial records belong in the repository or validation
sheet.
