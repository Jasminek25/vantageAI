# Parent Dashboard Scope and Integration Contract

## Confirmed team ownership

This implementation follows the team's Slack decisions:

- **Vedang:** parent dashboard features and frontend prototype
- **Aayush:** heir dashboard and server-side Gemini support for the AI financial coach
- **Jasmine:** shared repository and broader product website direction

The repository contained only its initial README when this branch was created. Jasmine's earlier Heirline HTML was available in Slack and informed this branch's cream, pine, brass, rust, serif, and ledger-style visual language. Aayush's implementation files were not yet present in the shared repository, so the routes below are an explicit proposed contract—not a claim about code that has already been merged.

## Feature map

| Priority | Parent feature | Demo behavior | Production dependency |
| --- | --- | --- | --- |
| 1 | Readiness Assessment | Four-question score, document evidence, action list | Authenticated document/status API and advisor-reviewed scoring method |
| 2 | Wealth Transfer Simulator | Equal, trust, and staggered hypothetical comparisons | Legal/tax modeling, suitability controls, professional review |
| 3 | Coordination Hub | Document states, review dates, advisors, milestones | Encrypted storage, audit trail, role-based access |
| 4 | Legacy Planner | Values, goals, instructions, roadmap | Consent and granular sharing controls |
| 5 | Family Overview | Engagement summary and learning-goal assignment | Aayush's heir service and consent-filtered events |
| 6 | Jurisdiction Map | Asset locations and professional-review questions | Verified location extraction and jurisdiction-specific counsel content |

## Proposed parent API boundary

The frontend currently uses safe mock responses. Setting `VITE_API_BASE_URL` enables these proposed routes:

```text
GET  /api/parent/dashboard
POST /api/parent/readiness/assessment
POST /api/parent/transfer/scenarios
POST /api/parent/heirs/:heirId/recommendations
```

The API adapter lives in `src/services/parentApi.js`. This is the only frontend file that should know route paths.

## Parent-to-heir handoff

The parent side may send only approved, minimal context:

```json
{
  "heirId": "maya",
  "resource": "Trust distributions",
  "assignedBy": "parent-account",
  "sharingApproved": true
}
```

The parent side may receive only consent-filtered summary data:

```json
{
  "heirId": "maya",
  "connection": "connected",
  "engagement": 82,
  "literacy": 76,
  "learningGoalStatus": "in-progress"
}
```

Private AI-coach messages, quiz answers, passwords, financial decisions, and Gemini credentials must never be returned to the parent UI.

## Security rules

1. Gemini and all other API keys remain server-side. They must not use the `VITE_` prefix or appear in browser bundles.
2. Authentication must use a secure server-managed session; the demo does not implement real login.
3. Real wills, trusts, healthcare directives, and account records require encryption, access controls, retention rules, and audit logs before upload is considered.
4. All AI outputs require clear educational framing and human review. Jurisdiction content must not be presented as legal advice.
5. The parent sees only heir data the heir has consented to share.

## Week 7 test/freeze checklist

- [x] Six parent features are separately labeled and navigable.
- [x] Readiness score updates through a complete assessment flow.
- [x] Three transfer structures update amounts and visuals.
- [x] Coordination table filters and updates demo statuses.
- [x] Legacy values, instructions, goals, and roadmap are visible.
- [x] Parent-to-heir assignment uses the integration adapter.
- [x] Jurisdiction locations change the selected asset/questions view.
- [x] No secrets, API keys, or real personal documents are included.
- [x] Demo data passes automated structural validation.
- [x] Production build compiles successfully.

## Remaining integration work

1. Aayush adds or shares the heir-dashboard/backend branch.
2. Team agrees on route and payload names; update only `parentApi.js` if names change.
3. Jasmine merges the parent and heir navigation into the shared website shell.
4. Add authenticated test accounts and consent rules before any real cross-dashboard sync.
5. Replace fictional data only after the privacy/security design is reviewed.
