# Heirline Parent Dashboard

Parent-side product prototype for the team's shared inheritance-planning web application.

This branch deliberately contains only the parent experience. Aayush owns the heir dashboard and its Gemini-backed AI coach; Jasmine owns the broader shared website direction. The parent app exposes a documented frontend service boundary so their work can be connected without placing API keys or private backend data in browser code.

## Parent features in this demo

1. **Inheritance Readiness Assessment** - scores plan completeness and explains the next gaps.
2. **Wealth Transfer Simulator** - compares equal, trust, and staggered hypothetical structures.
3. **Professional Coordination Hub** - tracks documents, review dates, advisors, and milestones.
4. **Legacy Planner** - organizes family values, goals, instructions, and a living roadmap.
5. **Family Overview** - shows consent-based heir engagement and assigns learning goals.
6. **Jurisdiction Map** - groups assets by location and flags questions for professional review.

All names, balances, documents, and scores are fictional demo data. The product does not provide legal, tax, or financial advice.

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm run validate
npm run build
```

## Integration

See [`docs/PARENT_DASHBOARD_SCOPE.md`](docs/PARENT_DASHBOARD_SCOPE.md) for role boundaries, proposed API routes, shared data shapes, security rules, and the handoff path for Aayush's heir backend.
