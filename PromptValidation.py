"""Routes a user prompt to a generic LLM answer or a personalized RAG answer.

Unchanged in behaviour. Now returns a Route enum instead of a bare int, so a UI
can render the routing decision ("answered from your documents" vs "general
knowledge") without magic numbers, and uses the lazy client.
"""

from __future__ import annotations

import logging
from enum import IntEnum

from config import FAST_MODEL

log = logging.getLogger(__name__)


class Route(IntEnum):
    GENERIC = 1
    PERSONALIZED = 2

    @property
    def label(self) -> str:
        return ("General knowledge" if self is Route.GENERIC
                else "Your documents")


# Back-compat: existing code does `from PromptValidation import GENERIC`
GENERIC = Route.GENERIC
PERSONALIZED = Route.PERSONALIZED

_SYSTEM = (
    "You are a router. Classify the user's financial prompt.\n"
    "Reply 2 if answering it well would require the user's own financial "
    "data, risk profile, holdings, income, debts, or personal situation.\n"
    "Reply 1 if it can be answered from general public knowledge.\n"
    "Output exactly one character: 1 or 2. No explanation, no punctuation."
)


def _config():
    from google.genai import types
    return types.GenerateContentConfig(
        system_instruction=_SYSTEM,
        temperature=0.0,
        max_output_tokens=2,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
    )


def InputRoute(user: str) -> Route:
    """Return Route.GENERIC or Route.PERSONALIZED.

    Falls back to PERSONALIZED on failure: answering with the user's context is
    the safer default. Route is an IntEnum, so `== 1` and `== GENERIC` both
    still work for any existing caller.
    """
    from gem_client import get_client

    try:
        resp = get_client().models.generate_content(
            model=FAST_MODEL, contents=user, config=_config(),
        )
        text = (resp.text or "").strip()
        return Route.GENERIC if text.startswith("1") else Route.PERSONALIZED
    except Exception as e:
        log.warning("router failed, defaulting to personalized: %s", e)
        return Route.PERSONALIZED
