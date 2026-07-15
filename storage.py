"""Persistence. Deliberately behind a narrow interface.

Right now this is a JSON file. When the UI arrives and you need multi-user or
concurrency, swap the body of PortfolioStore for SQLite/Postgres — the method
signatures are what AssetManager and PlanAhead depend on, not the file format.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
from pathlib import Path

from config import PORTFOLIO_PATH
from models import StockHolding, ManualAsset, Debt, FinancialProfile

log = logging.getLogger(__name__)

# Absolute, from config — not Path("store"), which resolved against the CWD and
# would silently create a second empty portfolio when launched from elsewhere.
DEFAULT_PATH = PORTFOLIO_PATH

SCHEMA_VERSION = 1


class PortfolioStore:
    def __init__(self, path: Path | str = DEFAULT_PATH, user_id: str = "default"):
        # user_id exists now so a future multi-user UI doesn't need a migration.
        self.path = Path(path)
        self.user_id = user_id
        self.stocks: list[StockHolding] = []
        self.assets: list[ManualAsset] = []
        self.debts: list[Debt] = []
        self.profile: FinancialProfile = FinancialProfile()
        self.load()

    # -- io -----------------------------------------------------------------
    def load(self) -> None:
        if not self.path.exists():
            return
        try:
            raw = json.loads(self.path.read_text())
        except json.JSONDecodeError:
            backup = self.path.with_suffix(".corrupt.json")
            self.path.rename(backup)
            log.error("unreadable portfolio file moved to %s; starting fresh", backup)
            return

        data = raw.get("users", {}).get(self.user_id, raw)
        self.stocks = [StockHolding.from_dict(d) for d in data.get("stocks", [])]
        self.assets = [ManualAsset.from_dict(d) for d in data.get("assets", [])]
        self.debts = [Debt.from_dict(d) for d in data.get("debts", [])]
        self.profile = FinancialProfile.from_dict(data.get("profile", {}))

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)

        existing = {}
        if self.path.exists():
            try:
                existing = json.loads(self.path.read_text())
            except json.JSONDecodeError:
                existing = {}

        users = existing.get("users", {})
        users[self.user_id] = {
            "stocks": [s.to_dict() for s in self.stocks],
            "assets": [a.to_dict() for a in self.assets],
            "debts": [d.to_dict() for d in self.debts],
            "profile": self.profile.to_dict(),
        }
        payload = {"schema_version": SCHEMA_VERSION, "users": users}

        # Atomic write: a crash mid-save must not shred someone's portfolio.
        fd, tmp = tempfile.mkstemp(dir=str(self.path.parent), suffix=".tmp")
        try:
            with os.fdopen(fd, "w") as f:
                json.dump(payload, f, indent=2)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp, self.path)
        except BaseException:
            if os.path.exists(tmp):
                os.unlink(tmp)
            raise

    # -- lookup -------------------------------------------------------------
    def find_stock(self, id_or_ticker: str) -> StockHolding | None:
        key = id_or_ticker.strip().upper()
        for s in self.stocks:
            if s.id == id_or_ticker or s.ticker.upper() == key:
                return s
        return None

    def find_asset(self, id_or_name: str) -> ManualAsset | None:
        key = id_or_name.strip().lower()
        for a in self.assets:
            if a.id == id_or_name or a.name.lower() == key:
                return a
        return None

    def find_debt(self, id_or_name: str) -> Debt | None:
        key = id_or_name.strip().lower()
        for d in self.debts:
            if d.id == id_or_name or d.name.lower() == key:
                return d
        return None
