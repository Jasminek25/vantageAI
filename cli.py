"""Command-line interface. The ONLY module here that prints or prompts.

This file is disposable — nothing imports it. When the UI lands it calls
Assistant / RAGEngine / DocTrack directly and this file just stops being used.

Usage:
    python cli.py                        # interactive chat (old main.py behaviour)
    python cli.py ask "what's a 401k?"   # one-shot, auto-routed
    python cli.py ask "..." --route rag  # force the personalized path
    python cli.py ask "..." --json       # machine-readable, for piping
    python cli.py ingest [--force]       # index PDFs, show per-file status
    python cli.py docs                   # what's in the corpus
    python cli.py doctrack NY --scope inheritor
    python cli.py assets                 # Asset Manager (interactive)
    python cli.py assets --json          # portfolio snapshot as JSON
    python cli.py plan                   # PlanAhead (interactive)
    python cli.py plan --metrics-only    # deterministic numbers, no tokens spent
    python cli.py doctor                 # check config before you debug blind
"""

from __future__ import annotations

import argparse
import json
import sys

from config import configure_logging, DATA_DIR, STORE_DIR, ENV_FILE


def _stream_out(chunks) -> str:
    parts = []
    for c in chunks:
        sys.stdout.write(c)
        sys.stdout.flush()
        parts.append(c)
    sys.stdout.write("\n")
    return "".join(parts)


# --------------------------------------------------------------------------
def cmd_ask(args) -> int:
    from assistant import Assistant
    from PromptValidation import Route

    a = Assistant()
    forced = None
    if args.route == "generic":
        forced = Route.GENERIC
    elif args.route == "rag":
        forced = Route.PERSONALIZED

    if args.json:
        result = a.ask(args.prompt, force_route=forced)
        print(json.dumps(result.to_dict(), indent=2))
        return 1 if result.error else 0

    route = forced or a.route(args.prompt)
    print(f"[{route.label}]\n")
    if route is Route.PERSONALIZED:
        for c in a.citations_for(args.prompt):
            print(f"  source: {c.label}")
        print()
    _stream_out(a.stream_ask(args.prompt, force_route=route))
    return 0


def cmd_ingest(args) -> int:
    from RAGresponse import engine

    def show(fs):
        icon = {"indexed": "+", "unchanged": "=", "no_text": "!", "error": "x"}
        line = f"  [{icon.get(fs.status, '?')}] {fs.name:<40} {fs.status}"
        if fs.chunks:
            line += f" ({fs.chunks} chunks)"
        print(line)
        if fs.detail:
            print(f"      {fs.detail}")

    print(f"Indexing PDFs from {DATA_DIR}\n")
    report = engine.ingest(force=args.force, progress=show)

    if args.json:
        print(json.dumps(report.to_dict(), indent=2))
        return 0 if report.ok else 1

    print(f"\n  {report.chunks_added} chunks added, "
          f"{report.total_chunks_in_index} total in index.")
    if report.needs_ocr:
        print(f"  Needs OCR (no extractable text): {', '.join(report.needs_ocr)}")
    if not report.files:
        print(f"  No PDFs found. Drop some in {DATA_DIR} and re-run.")
    return 0 if report.ok else 1


def cmd_docs(args) -> int:
    from RAGresponse import engine

    files = engine.list_documents()
    print(f"Corpus dir: {DATA_DIR}")
    if not files:
        print("  (empty)")
    for f in files:
        print(f"  - {f}")
    print(f"Indexed chunks: {engine._safe_count()}")
    return 0


def cmd_doctrack(args) -> int:
    from DocTrack import stream_doctrack, DocTrackError, FilingScope, normalize_state

    try:
        state = normalize_state(args.state)
    except DocTrackError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    scope = FilingScope(args.scope)
    print(f"{state} — {scope.label}\n")
    _stream_out(stream_doctrack(state, scope))
    print("\nStarting checklist only. Requirements vary by county and by how the")
    print("estate is titled. Confirm with the probate court or an attorney.")
    return 0


def cmd_doctor(args) -> int:
    """Config check. Beats guessing why nothing works."""
    import gem_client

    from config import ENV_CANDIDATES, BASE_DIR

    print("Configuration")
    print(f"  env file      {gem_client.env_file_used()}")
    if not gem_client.api_key_present():
        print(f"                (searched {BASE_DIR} for: {', '.join(ENV_CANDIDATES)})")
        stray = [p.name for p in BASE_DIR.glob("*.env") if not p.name.endswith(".example")]
        if stray:
            print(f"                found but unused: {', '.join(stray)}")
    print(f"  API key       {gem_client.key_fingerprint() if gem_client.api_key_present() else 'MISSING'}")
    print(f"  data dir      {DATA_DIR} {'(exists)' if DATA_DIR.exists() else '(will be created)'}")
    print(f"  store dir     {STORE_DIR} {'(exists)' if STORE_DIR.exists() else '(will be created)'}")

    pdfs = list(DATA_DIR.glob("*.pdf")) if DATA_DIR.exists() else []
    print(f"  PDFs          {len(pdfs)}")

    missing = []
    for mod in ("google.genai", "dotenv", "chromadb", "sentence_transformers",
                "pypdf", "yfinance"):
        try:
            __import__(mod)
        except ImportError:
            missing.append(mod)
    print(f"  packages      {'all present' if not missing else 'MISSING: ' + ', '.join(missing)}")

    if not gem_client.api_key_present():
        print(f"\n  cp GemAPI.env.example GemAPI.env")
        print(f"  then add:  My_API_Key=your_key_here")
        print(f"  (any of {', '.join(ENV_CANDIDATES)} works, or set FA_ENV_FILE=/path/to/your.env)")
    if missing:
        print("\n  pip install -r requirements.txt")
    return 0 if (gem_client.api_key_present() and not missing) else 1



# --------------------------------------------------------------------------
# Asset Manager / PlanAhead
# --------------------------------------------------------------------------
def _money(v) -> str:
    return "  —" if v is None else f"${v:,.2f}"


def _ask(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    return input(f"{label}{suffix}: ").strip() or default


def _ask_float(label: str, default=None) -> float:
    while True:
        raw = _ask(label, str(default) if default is not None else "")
        try:
            return float(raw.replace(",", "").replace("$", "").replace("%", ""))
        except ValueError:
            print("  Enter a number.")


def _ask_enum(label: str, enum_cls) -> str:
    opts = [e.value for e in enum_cls]
    while True:
        print(f"{label}: " + ", ".join(f"{i+1}) {o}" for i, o in enumerate(opts)))
        raw = input("  Choose: ").strip()
        if raw.isdigit() and 1 <= int(raw) <= len(opts):
            return opts[int(raw) - 1]
        if raw in opts:
            return raw
        print("  Invalid choice.")


def _print_portfolio(snap) -> None:
    if snap.positions:
        print(f"\n{'TICKER':<10}{'SHARES':>10}{'PRICE':>12}{'VALUE':>15}{'GAIN/LOSS':>15}  SRC")
        print("-" * 78)
        for p in snap.positions:
            flag = "" if p.confident else " *"
            print(f"{p.holding.ticker:<10}{p.holding.shares:>10,.2f}"
                  f"{_money(p.price):>12}{_money(p.market_value):>15}"
                  f"{_money(p.gain_loss):>15}  {p.source}{flag}")
        if any(not p.confident for p in snap.positions):
            print("  * unverified or stale price — confirm before acting on it")

    if snap.manual_assets:
        print(f"\n{'ASSET':<28}{'CLASS':<14}{'VALUE':>14}{'LOAN':>14}{'NET':>14}")
        print("-" * 84)
        for a in snap.manual_assets:
            print(f"{a.name[:27]:<28}{a.asset_class.value:<14}"
                  f"{_money(a.estimated_value):>14}{_money(a.outstanding_loan):>14}"
                  f"{_money(a.net_value):>14}")

    if snap.debts:
        print(f"\n{'DEBT':<28}{'TYPE':<14}{'BALANCE':>14}{'RATE':>8}{'MIN/MO':>12}")
        print("-" * 76)
        for d in snap.debts:
            print(f"{d.name[:27]:<28}{d.debt_type.value:<14}"
                  f"{_money(d.balance):>14}{d.interest_rate:>7.2f}%{_money(d.minimum_payment):>12}")

    print("\n" + "=" * 50)
    for label, val in (("Stocks", snap.stock_value),
                       ("Real estate (net)", snap.real_estate_value),
                       ("Physical / cash", snap.physical_value),
                       ("Total assets", snap.total_assets),
                       ("Total debt", snap.total_debt),
                       ("NET WORTH", snap.net_worth)):
        print(f"{label:<24}{_money(val):>24}")
    print("=" * 50)


def cmd_assets(args) -> int:
    from AssetManager import AssetManager, AssetError
    from models import AssetClass, DebtType

    am = AssetManager()

    if args.json:
        print(json.dumps(am.snapshot().to_dict(), indent=2))
        return 0

    menu = {"1": "View portfolio", "2": "Add stock",
            "3": "Add real estate / physical asset", "4": "Add debt",
            "5": "Re-value an asset", "6": "Estimate a value (search-based)",
            "7": "Remove an entry", "0": "Back"}
    while True:
        print("\n-- Asset Manager --")
        for k, v in menu.items():
            print(f"  {k}) {v}")
        choice = input("> ").strip()
        try:
            if choice == "0":
                return 0
            elif choice == "1":
                print("\nFetching quotes...")
                _print_portfolio(am.snapshot())
            elif choice == "2":
                t = _ask("Ticker").upper()
                sh = _ask_float("Shares")
                basis_raw = _ask("Cost basis per share (blank if unknown)")
                h = am.add_stock(t, sh,
                                 cost_basis_per_share=float(basis_raw) if basis_raw else None)
                print(f"  Logged {h.shares} {h.ticker}.")
                if not basis_raw:
                    print("  Note: inherited stock usually gets a stepped-up basis to the")
                    print("  date-of-death value. Worth confirming — it affects capital gains.")
            elif choice == "3":
                name = _ask("Asset name")
                ac = _ask_enum("Class", AssetClass)
                val = _ask_float("Your estimated value")
                loan = _ask_float("Outstanding loan against it", 0.0)
                a = am.add_manual_asset(name, ac, val, outstanding_loan=loan)
                print(f"  Logged {a.name} at {_money(a.net_value)} net.")
            elif choice == "4":
                name = _ask("Debt name")
                dt = _ask_enum("Type", DebtType)
                bal = _ask_float("Balance")
                rate = _ask_float("Annual interest rate (%)")
                mn = _ask_float("Minimum monthly payment", 0.0)
                am.add_debt(name, dt, bal, rate, mn)
                print("  Logged.")
            elif choice == "5":
                a = am.revalue_asset(_ask("Asset name or id"), _ask_float("New value"))
                print(f"  {a.name} now {_money(a.estimated_value)}.")
            elif choice == "6":
                print("  Searching...")
                print(f"  {am.suggest_value(_ask('Describe the item (be specific)'))}")
                print("  Ballpark, not an appraisal. Nothing was saved.")
                print("  Use option 5 to record a value you're confident in.")
            elif choice == "7":
                key = _ask("Ticker / asset name / debt name")
                ok = am.remove_stock(key) or am.remove_asset(key) or am.remove_debt(key)
                print("  Removed." if ok else "  Not found.")
            else:
                print("  Invalid option.")
        except AssetError as e:
            print(f"  {e}")
        except KeyboardInterrupt:
            print()
            return 0


def cmd_plan(args) -> int:
    from PlanAhead import PlanAhead
    from models import RiskTolerance

    pa = PlanAhead()

    if args.metrics_only:
        print(json.dumps(pa.metrics().to_dict(), indent=2))
        return 0

    p = pa.profile
    print("\n-- PlanAhead --")
    print("Press Enter to keep the value in brackets.\n")
    salary = _ask_float("Annual salary", p.annual_salary)
    expenses = _ask_float("Monthly expenses", p.monthly_expenses)
    ef = _ask_float("Current emergency fund", p.emergency_fund)
    risk = _ask_enum("Risk tolerance", RiskTolerance)
    age_raw = _ask("Age (optional)", str(p.age) if p.age else "")
    state = _ask("State", p.state)
    horizon = _ask("Time horizon in years (optional)",
                   str(p.time_horizon_years) if p.time_horizon_years else "")
    goals = _ask("Goals in a sentence (optional)", p.goals)

    pa.update_profile(
        annual_salary=salary, monthly_expenses=expenses, emergency_fund=ef,
        risk_tolerance=RiskTolerance(risk), state=state, goals=goals,
        age=int(age_raw) if age_raw.isdigit() else None,
        time_horizon_years=int(horizon) if horizon.isdigit() else None,
    )

    print("\nComputing metrics...")
    m = pa.metrics()
    print(f"  Net worth:        {_money(m.net_worth)}")
    print(f"  Monthly surplus:  {_money(m.monthly_surplus)}")
    dti = m.debt_to_income_pct
    print(f"  Debt-to-income:   {dti if dti is not None else '—'}%")
    print(f"  Emergency gap:    {_money(m.emergency_gap)}")
    for w in m.warnings:
        print(f"  ! {w}")

    if m.debt_plan:
        print("\nDebts to add income to, highest rate first:")
        for d in m.debt_plan:
            tag = "beats investing" if d.beats_investing else "below hurdle rate"
            print(f"  {d.priority}. {d.name} — {_money(d.balance)} @ {d.interest_rate}% ({tag})")

    if not input("\nGenerate full plan? [Y/n] ").strip().lower().startswith("n"):
        print("\n" + "=" * 60 + "\n")
        _stream_out(pa.stream_plan())
        print("\n" + "=" * 60)
        print("Informational only — not financial, tax, or legal advice.")
    return 0


# --------------------------------------------------------------------------
def interactive() -> int:
    """The old main.py loop, preserved."""
    from assistant import Assistant
    from PromptValidation import Route
    import gem_client

    if not gem_client.api_key_present():
        print(f"No API key found. Run `python cli.py doctor` for details.")
        return 1

    a = Assistant()
    print("Financial assistant ready. Type 'assets', 'plan', or 'exit'.\n")
    while True:
        try:
            prompt = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye.")
            return 0
        if not prompt:
            continue
        low = prompt.lower()
        if low in ("exit", "quit"):
            return 0
        if low == "assets":
            cmd_assets(argparse.Namespace(json=False)); continue
        if low == "plan":
            cmd_plan(argparse.Namespace(metrics_only=False)); continue

        try:
            route = a.route(prompt)
            if route is Route.PERSONALIZED:
                cites = a.citations_for(prompt)
                if cites:
                    print(f"  ({', '.join(sorted({c.label for c in cites}))})")
            _stream_out(a.stream_ask(prompt, force_route=route))
        except gem_client.MissingAPIKey as e:
            print(f"  {e}")
        except Exception as e:
            print(f"  error: {e}")
        print()


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="cli.py", description="Inheritance assistant")
    p.add_argument("--log", default=None, help="log level (DEBUG, INFO, WARNING)")
    sub = p.add_subparsers(dest="cmd")

    a = sub.add_parser("ask", help="ask one question")
    a.add_argument("prompt")
    a.add_argument("--route", choices=["auto", "generic", "rag"], default="auto")
    a.add_argument("--json", action="store_true")
    a.set_defaults(func=cmd_ask)

    i = sub.add_parser("ingest", help="index PDFs into the vector store")
    i.add_argument("--force", action="store_true", help="re-embed everything")
    i.add_argument("--json", action="store_true")
    i.set_defaults(func=cmd_ingest)

    d = sub.add_parser("docs", help="list the corpus")
    d.set_defaults(func=cmd_docs)

    dt = sub.add_parser("doctrack", help="inheritance filing checklist by state")
    dt.add_argument("state")
    dt.add_argument("--scope", choices=["all", "inheritor"], default="inheritor")
    dt.set_defaults(func=cmd_doctrack)

    am = sub.add_parser("assets", help="Asset Manager: log stocks, property, debts")
    am.add_argument("--json", action="store_true", help="print snapshot as JSON and exit")
    am.set_defaults(func=cmd_assets)

    pl = sub.add_parser("plan", help="PlanAhead: build a financial plan")
    pl.add_argument("--metrics-only", action="store_true",
                    help="deterministic metrics as JSON, no Gemini call")
    pl.set_defaults(func=cmd_plan)

    doc = sub.add_parser("doctor", help="check config and dependencies")
    doc.set_defaults(func=cmd_doctor)

    return p


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    configure_logging(args.log)
    if not getattr(args, "cmd", None):
        return interactive()
    try:
        return args.func(args)
    except KeyboardInterrupt:
        print()
        return 130


if __name__ == "__main__":
    sys.exit(main())
