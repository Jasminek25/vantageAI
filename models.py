"""Domain models. Pure data, no I/O, no Gemini.

Everything here is JSON-serializable in both directions so the same objects can
back a CLI today and an HTTP/JSON API or Streamlit UI later without changes.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field, asdict
from datetime import date, datetime
from enum import Enum
from typing import Optional


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


def _today() -> str:
    return date.today().isoformat()


class AssetClass(str, Enum):
    STOCK = "stock"
    REAL_ESTATE = "real_estate"
    PHYSICAL = "physical"          # vehicles, jewelry, art, collectibles
    CASH = "cash"


class RiskTolerance(str, Enum):
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


class DebtType(str, Enum):
    STUDENT = "student"
    CREDIT_CARD = "credit_card"
    MORTGAGE = "mortgage"
    AUTO = "auto"
    PERSONAL = "personal"
    MEDICAL = "medical"
    OTHER = "other"


class Liquidity(str, Enum):
    LIQUID = "liquid"              # sellable in days
    SEMI_LIQUID = "semi_liquid"    # weeks to months
    ILLIQUID = "illiquid"          # months+, high friction


# --------------------------------------------------------------------------
# Assets
# --------------------------------------------------------------------------
@dataclass
class StockHolding:
    ticker: str
    shares: float
    id: str = field(default_factory=_new_id)
    # Inherited assets usually get a stepped-up basis at date of death (US).
    # Stored so PlanAhead can reason about tax, not just raw value.
    cost_basis_per_share: Optional[float] = None
    date_acquired: str = field(default_factory=_today)
    inherited: bool = True
    notes: str = ""

    asset_class: AssetClass = AssetClass.STOCK
    liquidity: Liquidity = Liquidity.LIQUID

    def to_dict(self) -> dict:
        d = asdict(self)
        d["asset_class"] = self.asset_class.value
        d["liquidity"] = self.liquidity.value
        return d

    @staticmethod
    def from_dict(d: dict) -> "StockHolding":
        d = dict(d)
        d.pop("asset_class", None)
        d["liquidity"] = Liquidity(d.get("liquidity", "liquid"))
        return StockHolding(**d)


@dataclass
class ManualAsset:
    """Real estate and physical property. The user owns the number here, because
    automated valuation of a specific house or a specific painting is unreliable
    enough that a wrong confident number is worse than no number."""
    name: str
    asset_class: AssetClass
    estimated_value: float
    id: str = field(default_factory=_new_id)
    liquidity: Liquidity = Liquidity.ILLIQUID
    date_valued: str = field(default_factory=_today)
    valuation_source: str = "user"     # "user" | "gemini_estimate" | "appraisal"
    outstanding_loan: float = 0.0      # e.g. mortgage still attached to a house
    notes: str = ""
    # Append-only history so a UI can chart value over time.
    history: list[dict] = field(default_factory=list)

    @property
    def net_value(self) -> float:
        return self.estimated_value - self.outstanding_loan

    def revalue(self, value: float, source: str = "user") -> None:
        self.history.append({
            "value": self.estimated_value,
            "date": self.date_valued,
            "source": self.valuation_source,
        })
        self.estimated_value = value
        self.date_valued = _today()
        self.valuation_source = source

    def to_dict(self) -> dict:
        d = asdict(self)
        d["asset_class"] = self.asset_class.value
        d["liquidity"] = self.liquidity.value
        return d

    @staticmethod
    def from_dict(d: dict) -> "ManualAsset":
        d = dict(d)
        d["asset_class"] = AssetClass(d["asset_class"])
        d["liquidity"] = Liquidity(d.get("liquidity", "illiquid"))
        return ManualAsset(**d)


# --------------------------------------------------------------------------
# Liabilities & profile
# --------------------------------------------------------------------------
@dataclass
class Debt:
    name: str
    debt_type: DebtType
    balance: float
    interest_rate: float          # annual %, e.g. 6.8 not 0.068
    minimum_payment: float = 0.0  # monthly
    id: str = field(default_factory=_new_id)
    tax_deductible: bool = False  # mortgage interest, some student loan interest
    notes: str = ""

    def to_dict(self) -> dict:
        d = asdict(self)
        d["debt_type"] = self.debt_type.value
        return d

    @staticmethod
    def from_dict(d: dict) -> "Debt":
        d = dict(d)
        d["debt_type"] = DebtType(d["debt_type"])
        return Debt(**d)


@dataclass
class FinancialProfile:
    """Inputs PlanAhead needs that AssetManager doesn't track."""
    annual_salary: float = 0.0
    monthly_expenses: float = 0.0
    risk_tolerance: RiskTolerance = RiskTolerance.MODERATE
    age: Optional[int] = None
    state: str = ""
    emergency_fund: float = 0.0
    time_horizon_years: Optional[int] = None
    goals: str = ""

    @property
    def monthly_gross(self) -> float:
        return self.annual_salary / 12 if self.annual_salary else 0.0

    def to_dict(self) -> dict:
        d = asdict(self)
        d["risk_tolerance"] = self.risk_tolerance.value
        return d

    @staticmethod
    def from_dict(d: dict) -> "FinancialProfile":
        d = dict(d)
        d["risk_tolerance"] = RiskTolerance(d.get("risk_tolerance", "moderate"))
        return FinancialProfile(**d)


@dataclass
class Quote:
    ticker: str
    price: float
    currency: str = "USD"
    as_of: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    source: str = "unknown"       # "yfinance" | "gemini_grounded" | "stale_cache"
    name: str = ""
    confident: bool = True        # False => show the user a warning badge

    def to_dict(self) -> dict:
        return asdict(self)
