"""The single entry point a UI should call.

Previously the routing logic lived in main.py's input() loop, so any frontend
would have had to re-implement it. Now:

    from assistant import Assistant
    a = Assistant()
    result = a.ask("how much do I owe?")      # -> AnswerResult (JSON-ready)
    for chunk in a.stream_ask("..."): ...     # -> yields text

Nothing here prints or prompts.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Iterator, Optional

from config import MAIN_MODEL
from PromptValidation import InputRoute, Route
from RAGresponse import RAGEngine, Citation, engine as default_engine

log = logging.getLogger(__name__)


@dataclass
class AnswerResult:
    query: str
    text: str
    route: Route
    citations: list[Citation] = field(default_factory=list)
    grounded: bool = False
    error: str = ""

    def to_dict(self) -> dict:
        return {
            "query": self.query,
            "text": self.text,
            "route": int(self.route),
            "route_label": self.route.label,
            "citations": [c.to_dict() for c in self.citations],
            "grounded": self.grounded,
            "error": self.error,
        }


class Assistant:
    def __init__(self, rag: Optional[RAGEngine] = None):
        self.rag = rag or default_engine

    # -- routing ------------------------------------------------------------
    def route(self, prompt: str) -> Route:
        """Exposed so a UI can show 'checking your documents…' before answering,
        or let the user override the routing decision."""
        return InputRoute(prompt)

    # -- generic path -------------------------------------------------------
    def _generic(self, prompt: str) -> str:
        from gem_client import get_client
        resp = get_client().models.generate_content(model=MAIN_MODEL, contents=prompt)
        return resp.text or ""

    def _stream_generic(self, prompt: str) -> Iterator[str]:
        from gem_client import get_client
        for chunk in get_client().models.generate_content_stream(
            model=MAIN_MODEL, contents=prompt
        ):
            if chunk.text:
                yield chunk.text

    # -- public -------------------------------------------------------------
    def ask(self, prompt: str, force_route: Optional[Route] = None) -> AnswerResult:
        """Blocking. Always returns an AnswerResult — never raises for expected
        failures, so a UI can render result.error instead of catching."""
        prompt = (prompt or "").strip()
        if not prompt:
            return AnswerResult(prompt, "", Route.GENERIC, error="Empty prompt.")

        route = force_route or self.route(prompt)
        try:
            if route is Route.GENERIC:
                return AnswerResult(prompt, self._generic(prompt), route)
            ans = self.rag.answer(prompt)
            return AnswerResult(prompt, ans.text, route,
                                citations=ans.citations, grounded=ans.grounded)
        except Exception as e:
            log.exception("ask failed")
            return AnswerResult(prompt, "", route, error=str(e))

    def stream_ask(self, prompt: str,
                   force_route: Optional[Route] = None) -> Iterator[str]:
        """Yields text chunks. Call route() separately first if the UI wants to
        display the routing decision or citations before the text arrives."""
        prompt = (prompt or "").strip()
        if not prompt:
            return

        route = force_route or self.route(prompt)
        if route is Route.GENERIC:
            yield from self._stream_generic(prompt)
        else:
            yield from self.rag.stream_answer(prompt)

    def citations_for(self, prompt: str) -> list[Citation]:
        """Retrieve sources without generating an answer — lets a UI paint
        source badges while the model is still thinking."""
        return self.rag.retrieve(prompt)
