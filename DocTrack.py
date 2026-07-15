"""DocTrack: lists inheritance filing documents required in a given US state.

Now a pure service. The module-level input()/print() block is gone — that code
ran on import in some tooling and made the module unusable from a web handler.
All prompting lives in cli.py.

Adds:
  * FilingScope enum instead of the "1"/"2" magic strings.
  * stream_doctrack() for progressive UI rendering.
  * A US-state whitelist, so a bad value fails fast and locally instead of
    burning a Gemini call to discover 'Ontari' isn't a state.
"""

from __future__ import annotations

import logging
from enum import Enum

from config import MAIN_MODEL

log = logging.getLogger(__name__)


class FilingScope(str, Enum):
    ALL = "all"          # was "1"
    INHERITOR = "inheritor"  # was "2"

    @property
    def label(self) -> str:
        return ("All documents, including the deceased member's"
                if self is FilingScope.ALL
                else "Only documents needed on the inheritor's side")


class DocTrackError(Exception):
    """Bad input. A UI can catch this and render it as a form error."""


US_STATES = {
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
    "connecticut", "delaware", "district of columbia", "florida", "georgia",
    "hawaii", "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky",
    "louisiana", "maine", "maryland", "massachusetts", "michigan", "minnesota",
    "mississippi", "missouri", "montana", "nebraska", "nevada", "new hampshire",
    "new jersey", "new mexico", "new york", "north carolina", "north dakota",
    "ohio", "oklahoma", "oregon", "pennsylvania", "rhode island",
    "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont",
    "virginia", "washington", "west virginia", "wisconsin", "wyoming",
}

_ABBREV = {
    "al": "alabama", "ak": "alaska", "az": "arizona", "ar": "arkansas",
    "ca": "california", "co": "colorado", "ct": "connecticut", "de": "delaware",
    "dc": "district of columbia", "fl": "florida", "ga": "georgia", "hi": "hawaii",
    "id": "idaho", "il": "illinois", "in": "indiana", "ia": "iowa", "ks": "kansas",
    "ky": "kentucky", "la": "louisiana", "me": "maine", "md": "maryland",
    "ma": "massachusetts", "mi": "michigan", "mn": "minnesota", "ms": "mississippi",
    "mo": "missouri", "mt": "montana", "ne": "nebraska", "nv": "nevada",
    "nh": "new hampshire", "nj": "new jersey", "nm": "new mexico", "ny": "new york",
    "nc": "north carolina", "nd": "north dakota", "oh": "ohio", "ok": "oklahoma",
    "or": "oregon", "pa": "pennsylvania", "ri": "rhode island",
    "sc": "south carolina", "sd": "south dakota", "tn": "tennessee", "tx": "texas",
    "ut": "utah", "vt": "vermont", "va": "virginia", "wa": "washington",
    "wv": "west virginia", "wi": "wisconsin", "wy": "wyoming",
}


def normalize_state(raw: str) -> str:
    """'ny' / 'New York ' -> 'New York'. Raises DocTrackError if unrecognized."""
    s = (raw or "").strip().lower()
    if not s:
        raise DocTrackError("State is required.")
    s = _ABBREV.get(s, s)
    if s not in US_STATES:
        raise DocTrackError(f"'{raw}' isn't a recognized US state.")
    return s.title()


_BASE = (
    "You take a US state and return a neatly structured list of the legal "
    "documents required for an inheritance filing. Return document names only, "
    "as a markdown list, grouped by category. No commentary, no legal advice. "
    "Requirements vary by county and by how the estate is titled, so this is a "
    "starting checklist, not a complete or authoritative filing list."
)

_INSTRUCTIONS = {
    FilingScope.ALL: _BASE + " Include every document relevant to the "
                             "inheritance, covering the deceased member's side "
                             "as well as the inheritor's side.",
    FilingScope.INHERITOR: _BASE + " Include only the documents required on the "
                                   "inheritor's side; assume all decedent- and "
                                   "guardian-related filings are already handled.",
}


def _config(scope: FilingScope):
    from google.genai import types
    return types.GenerateContentConfig(
        system_instruction=_INSTRUCTIONS[scope], temperature=0.2,
    )


def _coerce_scope(scope) -> FilingScope:
    """Accepts FilingScope, 'all'/'inheritor', or the legacy '1'/'2' and 1/2."""
    if isinstance(scope, FilingScope):
        return scope
    s = str(scope).strip().lower()
    if s in ("1", "all"):
        return FilingScope.ALL
    if s in ("2", "inheritor"):
        return FilingScope.INHERITOR
    raise DocTrackError(f"Unknown filing scope '{scope}'. Use 'all' or 'inheritor'.")


def DocTrack(location: str, scope=FilingScope.INHERITOR) -> str:
    """Blocking. Returns a markdown checklist."""
    from gem_client import get_client

    state = normalize_state(location)
    sc = _coerce_scope(scope)
    resp = get_client().models.generate_content(
        model=MAIN_MODEL, contents=f"US state: {state}", config=_config(sc),
    )
    return resp.text or ""


def stream_doctrack(location: str, scope=FilingScope.INHERITOR):
    """Yields text chunks. Prints nothing."""
    from gem_client import get_client

    state = normalize_state(location)
    sc = _coerce_scope(scope)
    for chunk in get_client().models.generate_content_stream(
        model=MAIN_MODEL, contents=f"US state: {state}", config=_config(sc),
    ):
        if chunk.text:
            yield chunk.text
