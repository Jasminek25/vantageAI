"""Stock quotes.

WHY TWO SOURCES:
An LLM asked "what is AAPL trading at" without grounding will produce a
confident, plausible, *fabricated* number. That is the single worst failure mode
in this whole app. So:

  1. yfinance      - real quote data, free, no key. Primary.
  2. Gemini + Google Search grounding - a real retrieval, not recall. Fallback
     only, and every quote it returns is tagged confident=False so the UI can
     badge it as unverified.

Ungrounded Gemini is never used for prices. If both sources fail we return a
stale cached value clearly marked as stale, or raise — we do not guess.
"""

from __future__ import annotations

import json
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor

from models import Quote

log = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 900          # 15 min; a UI refresh button shouldn't hammer
_cache: dict[str, tuple[float, Quote]] = {}


class QuoteUnavailable(Exception):
    pass


# --------------------------------------------------------------------------
def _from_yfinance(ticker: str) -> Quote:
    import yfinance as yf

    t = yf.Ticker(ticker)
    price = None
    info = {}
    try:
        info = t.fast_info or {}
        price = info.get("last_price") or info.get("lastPrice")
    except Exception:
        pass

    if not price:
        hist = t.history(period="5d")
        if hist.empty:
            raise QuoteUnavailable(f"yfinance returned no data for {ticker}")
        price = float(hist["Close"].iloc[-1])

    name = ""
    try:
        name = (t.info or {}).get("shortName", "") or ""
    except Exception:
        pass

    return Quote(
        ticker=ticker.upper(),
        price=float(price),
        currency=(info.get("currency") or "USD"),
        source="yfinance",
        name=name,
        confident=True,
    )


def _from_gemini_grounded(ticker: str) -> Quote:
    from google.genai import types
    from gem_client import client, FAST_MODEL

    tool = types.Tool(google_search=types.GoogleSearch())
    config = types.GenerateContentConfig(
        tools=[tool],
        temperature=0.0,
        system_instruction=(
            "You look up stock prices using search. Return ONLY a JSON object, "
            "no markdown fences, no prose: "
            '{"ticker": str, "price": number, "currency": str, "name": str}. '
            "The price must come from a search result you actually retrieved. "
            'If you cannot retrieve it, return {"error": "not found"}.'
        ),
    )
    resp = client.models.generate_content(
        model=FAST_MODEL,
        contents=f"Current share price for ticker {ticker}",
        config=config,
    )
    text = (resp.text or "").strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise QuoteUnavailable(f"grounded lookup returned no JSON for {ticker}")

    data = json.loads(match.group(0))
    if "error" in data or "price" not in data:
        raise QuoteUnavailable(f"grounded lookup could not find {ticker}")

    return Quote(
        ticker=ticker.upper(),
        price=float(data["price"]),
        currency=data.get("currency", "USD"),
        source="gemini_grounded",
        name=data.get("name", ""),
        confident=False,          # retrieved, but not from a quote API
    )


# --------------------------------------------------------------------------
def get_quote(ticker: str, use_cache: bool = True) -> Quote:
    key = ticker.strip().upper()
    now = time.time()

    if use_cache and key in _cache:
        ts, q = _cache[key]
        if now - ts < CACHE_TTL_SECONDS:
            return q

    errors = []
    for fetch in (_from_yfinance, _from_gemini_grounded):
        try:
            q = fetch(key)
            _cache[key] = (now, q)
            return q
        except Exception as e:
            errors.append(f"{fetch.__name__}: {e}")

    if key in _cache:
        _, stale = _cache[key]
        stale.source = "stale_cache"
        stale.confident = False
        return stale

    raise QuoteUnavailable(f"No price for {key}. Tried -> " + " | ".join(errors))


def get_quotes(tickers: list[str], use_cache: bool = True) -> dict[str, Quote | None]:
    """Parallel fetch. Network-bound, so threads help a lot: 10 tickers goes from
    ~10 sequential round trips to roughly one."""
    unique = sorted({t.strip().upper() for t in tickers if t.strip()})
    if not unique:
        return {}

    out: dict[str, Quote | None] = {}
    with ThreadPoolExecutor(max_workers=min(8, len(unique))) as pool:
        futures = {pool.submit(get_quote, t, use_cache): t for t in unique}
        for fut, tk in futures.items():
            try:
                out[tk] = fut.result()
            except Exception as e:
                log.warning("no quote for %s: %s", tk, e)
                out[tk] = None
    return out
