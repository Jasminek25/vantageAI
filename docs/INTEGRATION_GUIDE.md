# Vantage AI Integration Guide

## Outcome

The final prototype is one role-based website rather than three unrelated code
samples. It is intentionally demo-safe: every person, balance, document status,
and score is fictional; no API key is required; and no real record is stored.

## Ownership and attribution

| Workstream | Owner | Preserved source | Integrated surface |
| --- | --- | --- | --- |
| Shared product website | Jasmine | `vantage-ai-frontend.html` | `src/components/LandingPage.jsx` and the role selector |
| Parent dashboard | Vedang | `src/App.jsx`, `src/services/parentApi.js`, `src/data/parent-demo.json`, `docs/PARENT_DASHBOARD_SCOPE.md` | Parent role, six working parent features |
| Heir backend | Aayush | Root Python modules including `assistant.py`, `AssetManager.py`, `PlanAhead.py`, and `DocTrack.py` | `api_server.py` plus `src/components/HeirDashboard.jsx` |
| Integration | Shared | This branch | Navigation, API boundary, tests, CI, and demo runbook |

Git history and the original pull requests remain the authoritative record of
who contributed each workstream. Integration files describe the connections;
they do not rewrite the original branches.

## Application flow

```text
Landing page
├── Parent role
│   ├── Readiness assessment
│   ├── Wealth transfer simulator
│   ├── Professional coordination
│   ├── Legacy planner
│   ├── Consent-based family overview
│   └── Jurisdiction map
├── Heir role
│   ├── AI inheritance coach
│   ├── Asset manager
│   ├── Deterministic financial planner
│   └── State document tracker
└── Wealth Manager role
    └── Future-feature explanation only
```

## API routes

`api_server.py` exposes a narrow demo boundary:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API/key readiness without exposing a secret |
| GET | `/api/parent/dashboard` | Fictional parent dashboard data |
| POST | `/api/parent/*` | Non-persistent demo save acknowledgement |
| GET | `/api/heir/dashboard` | Fictional heir profile, assets, and checklist |
| POST | `/api/heir/coach` | Aayush assistant when configured; explicit offline education otherwise |
| POST | `/api/heir/plan` | Deterministic cash-flow and reserve metrics |
| GET | `/api/heir/documents?state=CA` | State-validated inheritor organizing checklist |

The browser never receives a Gemini key. The default CORS origin is limited to
the local Vite server and can be changed with `VANTAGE_ALLOWED_ORIGIN`.

## Demo script

1. Start with `npm run dev` and open `http://localhost:5173`.
2. Explain the landing page as Jasmine's shared entry point.
3. Open **Parent / Wealth Holder** and demonstrate one parent workflow, such as
   the readiness assessment or transfer simulator.
4. Use **Switch role**, open **Heir**, and demonstrate the coach, asset inventory,
   planner calculation, and state checklist.
5. Explain that only approved goals and engagement summaries cross the family
   boundary; private heir questions do not appear in the parent view.
6. Open **Wealth Manager** only to show that the team intentionally treated it
   as future scope.

## Production boundary

This integration is not production-ready authentication, document storage, tax
modeling, legal guidance, or multi-user RAG. Before real users or records:

1. add authenticated server-managed sessions and role-based authorization;
2. enforce consent in the backend, not only in the UI;
3. encrypt records and define audit, retention, and deletion policies;
4. isolate each user's vector collection and portfolio store;
5. review all financial, tax, and jurisdiction content with professionals; and
6. deploy the API behind TLS with a real secret manager and restricted origins.
