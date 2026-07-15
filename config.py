"""Central configuration.

Paths are resolved ABSOLUTE, relative to this file — not the working directory.
The old `Path("data")` worked from a CLI launched in the project root and broke
the moment a uvicorn/gunicorn worker started somewhere else. Every path here is
also env-overridable so a deployed UI can point at a mounted volume.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


def _path(env_var: str, default: str) -> Path:
    return Path(os.getenv(env_var, str(BASE_DIR / default))).resolve()


DATA_DIR = _path("FA_DATA_DIR", "data")            # source PDFs
STORE_DIR = _path("FA_STORE_DIR", "chroma_store")  # vector index + manifest
PORTFOLIO_DIR = _path("FA_PORTFOLIO_DIR", "store")  # portfolio.json
PORTFOLIO_PATH = PORTFOLIO_DIR / "portfolio.json"
MANIFEST = STORE_DIR / "manifest.json"
# The env file is DISCOVERED, not hardcoded.
#
# A single hardcoded filename is a silent-failure trap: load_dotenv() on a path
# that doesn't exist is a no-op, so a file named GeminiAPI.env when the code
# expects GemAPI.env produces "no API key found" while the key sits right there
# in plain sight. These names are all tried, in order.
ENV_CANDIDATES = ("GemAPI.env", "GeminiAPI.env", "gemini.env", ".env")
DEFAULT_ENV_FILE = BASE_DIR / ENV_CANDIDATES[0]


def find_env_file() -> Path | None:
    """Return the env file to load, or None if there isn't one.

    Order:
      1. $FA_ENV_FILE, if set (explicit wins — deployments pin this)
      2. any of ENV_CANDIDATES in the project dir
      3. any other *.env in the project dir (excluding *.example)

    Called fresh at load time rather than resolved at import, so creating the
    file after the process starts still works.
    """
    override = os.getenv("FA_ENV_FILE")
    if override:
        p = Path(override).expanduser().resolve()
        return p if p.is_file() else None

    for name in ENV_CANDIDATES:
        p = BASE_DIR / name
        if p.is_file():
            return p

    for p in sorted(BASE_DIR.glob("*.env")):
        if not p.name.endswith(".example"):
            return p
    return None


# Kept for display and back-compat imports. Prefer find_env_file() for logic —
# this is resolved once at import and can go stale.
ENV_FILE = find_env_file() or DEFAULT_ENV_FILE

COLLECTION_NAME = os.getenv("FA_COLLECTION", "personal_finance")
EMBED_MODEL = os.getenv("FA_EMBED_MODEL", "all-MiniLM-L6-v2")

CHUNK_SIZE = int(os.getenv("FA_CHUNK_SIZE", "900"))
CHUNK_OVERLAP = int(os.getenv("FA_CHUNK_OVERLAP", "150"))
TOP_K = int(os.getenv("FA_TOP_K", "4"))

FAST_MODEL = os.getenv("FA_FAST_MODEL", "gemini-2.5-flash-lite")
MAIN_MODEL = os.getenv("FA_MAIN_MODEL", "gemini-2.5-flash")


def configure_logging(level: str | None = None) -> None:
    """Call from an entry point (cli.py, or your web app's startup) — never from
    a library module. Libraries log; applications decide where logs go."""
    logging.basicConfig(
        level=(level or os.getenv("FA_LOG_LEVEL", "INFO")).upper(),
        format="%(levelname)s %(name)s: %(message)s",
    )
