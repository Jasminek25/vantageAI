"""PlanAhead: pulls the AssetManager portfolio, takes risk/salary/debt inputs,
and produces a specific plan.

DESIGN PRINCIPLE — the model does not do arithmetic.
Every number (net worth, DTI, payoff ordering, emergency-fund gap, hurdle-rate
comparison) is computed deterministically in `compute_metrics()`. Gemini receives
those figures as facts and writes the reasoning and sequencing around them. LLMs
are unreliable at multi-step compounding math, and this is somebody's
inheritance. It also means the metrics are unit-testable and a UI can render the
dashboard without spending a single token.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict, field
from typing import Optional, Iterator

from models import RiskTolerance, DebtType, FinancialProfile, AssetClass
from AssetManager import AssetManager, PortfolioSnapshot
from storage import PortfolioStore

# Long-run nominal expected returns used only as a *hurdle rate* for the
# "pay debt vs invest" comparison. Assumptions, not predictions — surfaced to
# the user in the output so they can disagree with them.
EXPECTED_RETURN = {
    RiskTolerance.CONSERVATIVE: 5.0,
    RiskTolerance.MODERATE: 7.0,
    RiskTolerance.AGGRESSIVE: 8.5,
}

EMERGENCY_MONTHS = {
    RiskTolerance.CONSERVATIVE: 6,
    RiskTolerance.MODERATE: 5,
    RiskTolerance.AGGRESSIVE: 3,
}

CONCENTRATION_FLAG_PCT = 20.0   # single holding above this % of assets


@dataclass
class DebtPlanItem:
    name: str
    debt_type: str
    balance: float
    interest_rate: float
    minimum_payment: float
    priority: int
    beats_investing: bool          # rate > expected return => pay down first
    months_to_payoff_at_minimum: Optional[float]


@dataclass
class PlanMetrics:
    net_worth: float
    total_assets: float
    total_debt: float
    stock_value: float
    real_estate_value: float
    physical_value: float
    allocation_pct: dict[str, float]
    liquidity_pct: dict[str, float]
    liquid_value: float

    monthly_gross: float
    monthly_expenses: float
    monthly_surplus: float
    debt_to_income_pct: Optional[float]
    total_minimum_payments: float

    weighted_avg_interest: Optional[float]
    hurdle_rate: float
    debt_plan: list[DebtPlanItem]

    emergency_fund: float
    emergency_target: float
    emergency_gap: float

    concentration_flags: list[dict]
    unpriced_tickers: list[str]
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["debt_plan"] = [asdict(x) for x in self.debt_plan]
        return d


# --------------------------------------------------------------------------
def _months_to_payoff(balance: float, rate_pct: float, payment: float) -> Optional[float]:
    """Standard amortization. None if the payment never clears the interest."""
    if payment <= 0 or balance <= 0:
        return None
    r = rate_pct / 100 / 12
    if r == 0:
        return balance / payment
    if payment <= balance * r:
        return None                     # negative amortization
    import math
    return math.log(payment / (payment - balance * r)) / math.log(1 + r)


def compute_metrics(snapshot: PortfolioSnapshot, profile: FinancialProfile) -> PlanMetrics:
    warnings: list[str] = []

    total_assets = snapshot.total_assets
    total_debt = snapshot.total_debt
    hurdle = EXPECTED_RETURN[profile.risk_tolerance]

    # -- allocation
    alloc = {}
    if total_assets > 0:
        alloc = {
            "stocks": round(snapshot.stock_value / total_assets * 100, 1),
            "real_estate": round(snapshot.real_estate_value / total_assets * 100, 1),
            "physical_and_cash": round(snapshot.physical_value / total_assets * 100, 1),
        }
    else:
        warnings.append("No assets logged — plan will be thin. Add holdings in AssetManager.")

    liq = snapshot.by_liquidity()
    liquid_value = liq.get("liquid", 0.0)
    liq_pct = ({k: round(v / total_assets * 100, 1) for k, v in liq.items()}
               if total_assets > 0 else {})

    # -- cash flow
    monthly_gross = profile.monthly_gross
    monthly_expenses = profile.monthly_expenses
    total_min = sum(d.minimum_payment for d in snapshot.debts)
    monthly_surplus = monthly_gross - monthly_expenses - total_min

    dti = round(total_min / monthly_gross * 100, 1) if monthly_gross > 0 else None
    if monthly_gross <= 0:
        warnings.append("No salary on file — cash-flow guidance will be generic.")
    if monthly_expenses <= 0 and monthly_gross > 0:
        warnings.append("No monthly expenses on file — surplus and emergency target are unreliable.")
    if monthly_surplus < 0:
        warnings.append("Expenses plus minimum debt payments exceed income. Cash flow is negative.")

    # -- debt: avalanche order (highest rate first = least total interest paid)
    ordered = sorted(snapshot.debts, key=lambda d: d.interest_rate, reverse=True)
    debt_plan = [
        DebtPlanItem(
            name=d.name, debt_type=d.debt_type.value, balance=d.balance,
            interest_rate=d.interest_rate, minimum_payment=d.minimum_payment,
            priority=i + 1,
            beats_investing=d.interest_rate > hurdle,
            months_to_payoff_at_minimum=_months_to_payoff(
                d.balance, d.interest_rate, d.minimum_payment),
        )
        for i, d in enumerate(ordered)
    ]
    for item in debt_plan:
        if item.minimum_payment > 0 and item.months_to_payoff_at_minimum is None:
            warnings.append(
                f"'{item.name}' minimum payment doesn't cover its interest — balance grows."
            )

    wavg = (sum(d.balance * d.interest_rate for d in snapshot.debts) / total_debt
            if total_debt > 0 else None)

    # -- emergency fund
    months = EMERGENCY_MONTHS[profile.risk_tolerance]
    target = monthly_expenses * months
    gap = max(0.0, target - profile.emergency_fund)

    # -- concentration
    flags = []
    for p in snapshot.positions:
        if p.market_value and total_assets > 0:
            pct = p.market_value / total_assets * 100
            if pct > CONCENTRATION_FLAG_PCT:
                flags.append({"name": p.holding.ticker, "pct_of_assets": round(pct, 1)})
    for a in snapshot.manual_assets:
        if total_assets > 0:
            pct = a.net_value / total_assets * 100
            if pct > CONCENTRATION_FLAG_PCT:
                flags.append({"name": a.name, "pct_of_assets": round(pct, 1)})

    if snapshot.unpriced:
        warnings.append(
            f"No price for: {', '.join(snapshot.unpriced)}. These are excluded from totals."
        )

    return PlanMetrics(
        net_worth=round(snapshot.net_worth, 2),
        total_assets=round(total_assets, 2),
        total_debt=round(total_debt, 2),
        stock_value=round(snapshot.stock_value, 2),
        real_estate_value=round(snapshot.real_estate_value, 2),
        physical_value=round(snapshot.physical_value, 2),
        allocation_pct=alloc,
        liquidity_pct=liq_pct,
        liquid_value=round(liquid_value, 2),
        monthly_gross=round(monthly_gross, 2),
        monthly_expenses=round(monthly_expenses, 2),
        monthly_surplus=round(monthly_surplus, 2),
        debt_to_income_pct=dti,
        total_minimum_payments=round(total_min, 2),
        weighted_avg_interest=round(wavg, 2) if wavg is not None else None,
        hurdle_rate=hurdle,
        debt_plan=debt_plan,
        emergency_fund=round(profile.emergency_fund, 2),
        emergency_target=round(target, 2),
        emergency_gap=round(gap, 2),
        concentration_flags=flags,
        unpriced_tickers=snapshot.unpriced,
        warnings=warnings,
    )


# --------------------------------------------------------------------------
_SYSTEM = (
    "You are a financial planning assistant for someone who has recently "
    "inherited assets. You are not a licensed financial advisor, CPA, or attorney.\n\n"
    "RULES:\n"
    "1. All figures are computed and given to you. Use them exactly. Do NOT "
    "recompute, re-derive, or invent any number. If a number you want isn't "
    "provided, say what's missing instead of estimating it.\n"
    "2. Be specific and sequenced: what to do first, next, later, and why.\n"
    "3. Present trade-offs rather than commands. The user decides. Where "
    "reasonable people disagree (paying down low-rate debt vs investing, "
    "holding vs selling an inherited concentrated position), give both sides.\n"
    "4. Surface the assumptions you were handed (hurdle rate, emergency-fund "
    "months) as assumptions the user can reject.\n"
    "5. Flag anything that genuinely needs a professional: estate tax, "
    "stepped-up basis specifics, probate, large real-estate decisions.\n"
    "6. Address the listed warnings directly. Do not paper over missing data.\n"
    "7. No hype, no guarantees about returns.\n\n"
    "FORMAT (markdown):\n"
    "## Where You Stand\n## Immediate Priorities (next 90 days)\n"
    "## Debt Strategy\n## Portfolio Considerations\n## Medium Term (1-5 years)\n"
    "## Assumptions & Caveats\n## Questions For A Professional"
)


def build_prompt(metrics: PlanMetrics, profile: FinancialProfile) -> str:
    import json
    return (
        "USER PROFILE\n"
        f"- Risk tolerance: {profile.risk_tolerance.value}\n"
        f"- Age: {profile.age or 'not provided'}\n"
        f"- State: {profile.state or 'not provided'}\n"
        f"- Time horizon: {profile.time_horizon_years or 'not provided'} years\n"
        f"- Stated goals: {profile.goals or 'not provided'}\n\n"
        "COMPUTED FIGURES (authoritative — use as given)\n"
        f"{json.dumps(metrics.to_dict(), indent=2)}\n\n"
        "Write the plan."
    )


class PlanAhead:
    def __init__(self, manager: Optional[AssetManager] = None):
        self.manager = manager or AssetManager()

    @property
    def profile(self) -> FinancialProfile:
        return self.manager.store.profile

    def update_profile(self, **kwargs) -> FinancialProfile:
        return self.manager.set_profile(**kwargs)

    def metrics(self, use_cache: bool = True) -> PlanMetrics:
        """Dashboard numbers with zero Gemini calls. Cheap, instant, testable."""
        return compute_metrics(self.manager.snapshot(use_cache=use_cache), self.profile)

    def generate_plan(self, use_cache: bool = True) -> tuple[str, PlanMetrics]:
        from google.genai import types
        from gem_client import client, MAIN_MODEL

        m = self.metrics(use_cache=use_cache)
        config = types.GenerateContentConfig(system_instruction=_SYSTEM, temperature=0.4)
        resp = client.models.generate_content(
            model=MAIN_MODEL, contents=build_prompt(m, self.profile), config=config
        )
        return (resp.text or ""), m

    def stream_plan(self, use_cache: bool = True) -> Iterator[str]:
        """Yields text chunks. A CLI prints them; a web UI can SSE them straight
        through without touching this code."""
        from google.genai import types
        from gem_client import client, MAIN_MODEL

        m = self.metrics(use_cache=use_cache)
        config = types.GenerateContentConfig(system_instruction=_SYSTEM, temperature=0.4)
        for chunk in client.models.generate_content_stream(
            model=MAIN_MODEL, contents=build_prompt(m, self.profile), config=config
        ):
            if chunk.text:
                yield chunk.text
