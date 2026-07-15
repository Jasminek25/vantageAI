"""Gemini client access.

CHANGED: the client is now LAZY and never raises at import time.

The old version called genai.Client() and raised RuntimeError at module import
if the key was missing. In a CLI that's a clear error message. In a web app it's
an ImportError during startup that takes down every route, including the ones
that don't touch Gemini at all — and it makes the module unimportable in tests
and in CI where no key exists. Now the error surfaces at the call site, where a
UI can catch MissingAPIKey and render "add your API key" instead of a 500.
"""

from __future__ import annotations

import logging
import os
import threading

from dotenv import load_dotenv

from config import (  # noqa: F401  (FAST_MODEL/MAIN_MODEL re-exported)
    ENV_FILE, ENV_CANDIDATES, DEFAULT_ENV_FILE, find_env_file,
    FAST_MODEL, MAIN_MODEL,
)

log = logging.getLogger(__name__)

_client = None
_lock = threading.Lock()
_env_loaded = False
_env_path = None      # which file we actually loaded, for doctor/logging


class MissingAPIKey(RuntimeError):
    """Raised when My_API_Key can't be found. Catchable by a UI."""


# Accepted key names, in priority order. My_API_Key is this project's original
# name; GEMINI_API_KEY is the conventional one that hosting platforms and CI
# secret stores expect, so both work.
KEY_NAMES = ("My_API_Key", "GEMINI_API_KEY", "GOOGLE_API_KEY")


def _load_env() -> None:
    """Load the discovered env file WITHOUT overriding real environment vars.

    Order matters: a variable already exported in the environment (a container
    secret, a CI secret, `export My_API_Key=...`) wins over the file. That is
    what lets the exact same code run locally off a gitignored file and in
    production off a secret manager, with no file present at all.
    """
    global _env_loaded, _env_path
    if not _env_loaded:
        path = find_env_file()
        if path:
            # override=False is the default, but state it explicitly — this is a
            # security-relevant choice, not an incidental one.
            load_dotenv(path, override=False)
            _env_path = path
            log.debug("loaded env from %s", path)
        else:
            log.debug("no env file found; relying on the environment")
        _env_loaded = True


def _find_key() -> str | None:
    for name in KEY_NAMES:
        val = os.getenv(name)
        if val and val.strip() and val.strip() != "your_key_here":
            return val.strip()
    return None


def env_file_used() -> str:
    """Which file the key actually came from — or a note that it didn't come
    from a file at all. Purely for diagnostics; never includes the key."""
    _load_env()
    if _env_path:
        return str(_env_path)
    return "(none — using environment variables)" if _find_key() else "(none found)"


def key_fingerprint() -> str:
    """Last 4 chars only — safe to log or show in a UI. Never returns the key."""
    k = _find_key()
    return f"...{k[-4:]}" if k else "(none)"


def api_key_present() -> bool:
    """Cheap check a UI can call to decide whether to show a setup screen."""
    _load_env()
    return _find_key() is not None


def get_client():
    """Thread-safe singleton. Under a threaded web server two requests can hit
    this simultaneously; the lock keeps it to one client."""
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                _load_env()
                key = _find_key()
                if not key:
                    # Never interpolate the key into a message. This one is safe
                    # because it only ever names paths and variable names.
                    raise MissingAPIKey(
                        "No API key found.\n"
                        f"  Looked for a file named any of: {', '.join(ENV_CANDIDATES)}\n"
                        f"  in: {DEFAULT_ENV_FILE.parent}\n"
                        f"  and for env vars: {', '.join(KEY_NAMES)}\n"
                        "  Fix: cp GemAPI.env.example GemAPI.env, then add "
                        "My_API_Key=your_key_here\n"
                        "  Or point at any path with: export FA_ENV_FILE=/path/to/your.env"
                    )
                from google import genai
                _client = genai.Client(api_key=key)
                log.debug("Gemini client initialized")
    return _client


def __getattr__(name: str):
    """PEP 562 module-level attribute hook.

    Keeps `from gem_client import client` working for existing callers
    (market_data.py, AssetManager.py, PlanAhead.py all import it inside
    functions) while the construction stays lazy — `client` doesn't exist as a
    module global, so this only fires on actual first use.
    """
    if name == "client":
        return get_client()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
