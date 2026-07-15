"""AssetManager: log inherited stocks, real estate, and physical property;
report current valuation.

Every method returns data. Nothing here prints or prompts — that is cli.py's job,
and tomorrow it will be a Flask route's job instead.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from models import (
    StockHolding, ManualAsset, Debt, AssetClass, Liquidity, DebtType, FinancialProfile
)
from storage import PortfolioStore
import market_data


class AssetError(Exception):
    """Raised for bad input. A UI can catch this and render it as a form error."""


# --------------------------------------------------------------------------
@dataclass
class ValuedPosition:
    holding: StockHolding
    price: Optional[float]
    market_value: Optional[float]
    gain_loss: Optional[float]
    source: str
    confident: bool
    error: str = ""

    def to_dict(self) -> dict:
        return {
            **self.holding.to_dict(),
            "price": self.price,
            "market_value": self.market_value,
            "gain_loss": self.gain_loss,
            "source": self.source,
            "confident": self.confident,
            "error": self.error,
        }


@dataclass
class PortfolioSnapshot:
    positions: list[ValuedPosition] = field(default_factory=list)
    manual_assets: list[ManualAsset] = field(default_factory=list)
    debts: list[Debt] = field(default_factory=list)

    @property
    def stock_value(self) -> float:
        return sum(p.market_value or 0.0 for p in self.positions)

    @property
    def real_estate_value(self) -> float:
        return sum(a.net_value for a in self.manual_assets
                   if a.asset_class == AssetClass.REAL_ESTATE)

    @property
    def physical_value(self) -> float:
        return sum(a.net_value for a in self.manual_assets
                   if a.asset_class in (AssetClass.PHYSICAL, AssetClass.CASH))

    @property
    def total_assets(self) -> float:
        return self.stock_value + sum(a.net_value for a in self.manual_assets)

    @property
    def total_debt(self) -> float:
        return sum(d.balance for d in self.debts)

    @property
    def net_worth(self) -> float:
        return self.total_assets - self.total_debt

    def by_liquidity(self) -> dict[str, float]:
        out = {L.value: 0.0 for L in Liquidity}
        for p in self.positions:
            out[p.holding.liquidity.value] += p.market_value or 0.0
        for a in self.manual_assets:
            out[a.liquidity.value] += a.net_value
        return out

    @property
    def unpriced(self) -> list[str]:
        return [p.holding.ticker for p in self.positions if p.market_value is None]

    def to_dict(self) -> dict:
        return {
            "positions": [p.to_dict() for p in self.positions],
            "manual_assets": [a.to_dict() for a in self.manual_assets],
            "debts": [d.to_dict() for d in self.debts],
            "totals": {
                "stock_value": round(self.stock_value, 2),
                "real_estate_value": round(self.real_estate_value, 2),
                "physical_value": round(self.physical_value, 2),
                "total_assets": round(self.total_assets, 2),
                "total_debt": round(self.total_debt, 2),
                "net_worth": round(self.net_worth, 2),
            },
            "by_liquidity": {k: round(v, 2) for k, v in self.by_liquidity().items()},
            "unpriced": self.unpriced,
        }


# --------------------------------------------------------------------------
class AssetManager:
    def __init__(self, store: Optional[PortfolioStore] = None):
        self.store = store or PortfolioStore()

    # -- stocks -------------------------------------------------------------
    def add_stock(self, ticker: str, shares: float,
                  cost_basis_per_share: Optional[float] = None,
                  date_acquired: Optional[str] = None,
                  inherited: bool = True, notes: str = "",
                  verify: bool = True) -> StockHolding:
        ticker = ticker.strip().upper()
        if not ticker:
            raise AssetError("Ticker is required.")
        if shares <= 0:
            raise AssetError("Shares must be greater than zero.")

        if verify:
            try:
                market_data.get_quote(ticker)
            except Exception:
                raise AssetError(
                    f"Couldn't find a price for '{ticker}'. Check the symbol, "
                    f"or pass verify=False to log it anyway."
                )

        existing = self.store.find_stock(ticker)
        if existing:
            # Merge lots into a weighted-average basis rather than duplicating.
            total = existing.shares + shares
            if existing.cost_basis_per_share is not None and cost_basis_per_share is not None:
                existing.cost_basis_per_share = (
                    existing.cost_basis_per_share * existing.shares
                    + cost_basis_per_share * shares
                ) / total
            existing.shares = total
            self.store.save()
            return existing

        holding = StockHolding(
            ticker=ticker, shares=shares,
            cost_basis_per_share=cost_basis_per_share,
            inherited=inherited, notes=notes,
            **({"date_acquired": date_acquired} if date_acquired else {}),
        )
        self.store.stocks.append(holding)
        self.store.save()
        return holding

    def remove_stock(self, id_or_ticker: str) -> bool:
        h = self.store.find_stock(id_or_ticker)
        if not h:
            return False
        self.store.stocks.remove(h)
        self.store.save()
        return True

    def update_shares(self, id_or_ticker: str, shares: float) -> StockHolding:
        h = self.store.find_stock(id_or_ticker)
        if not h:
            raise AssetError(f"No holding '{id_or_ticker}'.")
        if shares <= 0:
            raise AssetError("Shares must be greater than zero; use remove_stock instead.")
        h.shares = shares
        self.store.save()
        return h

    # -- manual assets ------------------------------------------------------
    def add_manual_asset(self, name: str, asset_class: AssetClass | str,
                         estimated_value: float, liquidity: Liquidity | str = None,
                         outstanding_loan: float = 0.0,
                         valuation_source: str = "user", notes: str = "") -> ManualAsset:
        if not name.strip():
            raise AssetError("Name is required.")
        if estimated_value < 0:
            raise AssetError("Value cannot be negative.")

        ac = AssetClass(asset_class) if isinstance(asset_class, str) else asset_class
        if liquidity is None:
            liquidity = Liquidity.ILLIQUID if ac == AssetClass.REAL_ESTATE else Liquidity.SEMI_LIQUID
        liq = Liquidity(liquidity) if isinstance(liquidity, str) else liquidity

        asset = ManualAsset(
            name=name.strip(), asset_class=ac, estimated_value=float(estimated_value),
            liquidity=liq, outstanding_loan=float(outstanding_loan),
            valuation_source=valuation_source, notes=notes,
        )
        self.store.assets.append(asset)
        self.store.save()
        return asset

    def revalue_asset(self, id_or_name: str, value: float, source: str = "user") -> ManualAsset:
        a = self.store.find_asset(id_or_name)
        if not a:
            raise AssetError(f"No asset '{id_or_name}'.")
        a.revalue(float(value), source)
        self.store.save()
        return a

    def remove_asset(self, id_or_name: str) -> bool:
        a = self.store.find_asset(id_or_name)
        if not a:
            return False
        self.store.assets.remove(a)
        self.store.save()
        return True

    # -- debts & profile ----------------------------------------------------
    def add_debt(self, name: str, debt_type: DebtType | str, balance: float,
                 interest_rate: float, minimum_payment: float = 0.0,
                 tax_deductible: bool = False, notes: str = "") -> Debt:
        if balance < 0:
            raise AssetError("Balance cannot be negative.")
        if not 0 <= interest_rate <= 100:
            raise AssetError("Interest rate should be an annual percentage, e.g. 6.8 for 6.8%.")
        dt = DebtType(debt_type) if isinstance(debt_type, str) else debt_type
        debt = Debt(name=name.strip(), debt_type=dt, balance=float(balance),
                    interest_rate=float(interest_rate),
                    minimum_payment=float(minimum_payment),
                    tax_deductible=tax_deductible, notes=notes)
        self.store.debts.append(debt)
        self.store.save()
        return debt

    def remove_debt(self, id_or_name: str) -> bool:
        d = self.store.find_debt(id_or_name)
        if not d:
            return False
        self.store.debts.remove(d)
        self.store.save()
        return True

    def set_profile(self, **kwargs) -> FinancialProfile:
        p = self.store.profile
        for k, v in kwargs.items():
            if v is None:
                continue
            if not hasattr(p, k):
                raise AssetError(f"Unknown profile field '{k}'.")
            setattr(p, k, v)
        self.store.save()
        return p

    # -- valuation ----------------------------------------------------------
    def snapshot(self, use_cache: bool = True) -> PortfolioSnapshot:
        """The one call a UI needs to render a dashboard."""
        quotes = market_data.get_quotes(
            [s.ticker for s in self.store.stocks], use_cache=use_cache
        )

        positions = []
        for h in self.store.stocks:
            q = quotes.get(h.ticker.upper())
            if q is None:
                positions.append(ValuedPosition(
                    holding=h, price=None, market_value=None, gain_loss=None,
                    source="none", confident=False, error="price unavailable",
                ))
                continue
            mv = q.price * h.shares
            gl = None
            if h.cost_basis_per_share is not None:
                gl = mv - (h.cost_basis_per_share * h.shares)
            positions.append(ValuedPosition(
                holding=h, price=q.price, market_value=mv, gain_loss=gl,
                source=q.source, confident=q.confident,
            ))

        return PortfolioSnapshot(
            positions=positions,
            manual_assets=list(self.store.assets),
            debts=list(self.store.debts),
        )

    # -- optional Gemini assist ---------------------------------------------
    def suggest_value(self, description: str) -> dict:
        """Rough ballpark for a physical/real-estate item, grounded in search.

        This is a CONVERSATION STARTER, not a valuation. It is never written to
        an asset automatically — the caller must pass the number to
        revalue_asset() deliberately. Real property needs an appraisal or comps;
        a model's guess about *your specific* house is not that.
        """
        from google.genai import types
        from gem_client import client, FAST_MODEL
        import json, re

        config = types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
            temperature=0.2,
            system_instruction=(
                "Estimate a plausible fair-market value range for the described "
                "asset using search. Return ONLY JSON, no fences: "
                '{"low": number, "high": number, "currency": "USD", '
                '"basis": "one sentence on what comparables you used", '
                '"confidence": "low"|"medium"|"high"}. '
                "Prefer a wide honest range over a narrow confident one."
            ),
        )
        resp = client.models.generate_content(
            model=FAST_MODEL, contents=description, config=config
        )
        m = re.search(r"\{.*\}", (resp.text or ""), re.DOTALL)
        if not m:
            return {"error": "could not estimate", "raw": resp.text}
        out = json.loads(m.group(0))
        out["disclaimer"] = "Search-based estimate only. Not an appraisal."
        return out
