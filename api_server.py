"""Small HTTP adapter that connects Aayush's Python services to the web demo.

The adapter intentionally runs without an API key and without heavyweight AI
dependencies. When a Gemini key and the optional packages are available, the
coach delegates to ``assistant.Assistant``. Otherwise it returns clearly marked
educational demo responses. No real financial records are persisted.
"""

from __future__ import annotations

import argparse
import json
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from DocTrack import DocTrackError, normalize_state

ROOT = Path(__file__).resolve().parent
HEIR_DATA_PATH = ROOT / "src" / "data" / "heir-demo.json"
MAX_BODY_BYTES = 32_000


def load_heir_dashboard() -> dict:
    return json.loads(HEIR_DATA_PATH.read_text(encoding="utf-8"))


def educational_coach_response(question: str) -> dict:
    lower = question.lower()
    if "trust" in lower:
        text = (
            "A trust distribution is made by a trustee under the trust's terms. "
            "Confirm the relevant provision, timing, conditions, and tax treatment "
            "with the trustee and qualified professionals before relying on it."
        )
    elif "document" in lower or "paper" in lower:
        text = (
            "Start by organizing identification, the notice naming you as an heir "
            "or beneficiary, recent statements, and any claim forms. Requirements "
            "vary, so confirm the checklist with the estate attorney."
        )
    else:
        text = (
            "Before moving inherited money, pause large decisions, confirm where "
            "each asset is held, record deadlines, and bring the complete picture "
            "to a fiduciary advisor and tax professional."
        )
    return {"text": text, "route": "educational-demo", "grounded": False,
            "citations": [], "mode": "Python offline demo"}


def coach_answer(question: str) -> dict:
    question = (question or "").strip()
    if not question:
        raise ValueError("Question is required.")
    if len(question) > 1_000:
        raise ValueError("Question must be 1,000 characters or fewer.")

    if any(os.getenv(name) for name in ("My_API_Key", "GEMINI_API_KEY", "GOOGLE_API_KEY")):
        try:
            from assistant import Assistant
            result = Assistant().ask(question)
            payload = result.to_dict()
            payload["mode"] = "Aayush Gemini service"
            return payload
        except Exception:
            # The demo stays available if optional AI/RAG dependencies are absent.
            pass
    return educational_coach_response(question)


def calculate_plan(payload: dict) -> dict:
    fields = ("salary", "expenses", "debtPayment", "emergencyFund")
    values = {}
    for field in fields:
        try:
            values[field] = float(payload.get(field, 0))
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{field} must be numeric.") from exc
        if values[field] < 0:
            raise ValueError(f"{field} cannot be negative.")

    risk = payload.get("risk", "moderate")
    months = {"conservative": 6, "moderate": 5, "aggressive": 3}.get(risk)
    if months is None:
        raise ValueError("risk must be conservative, moderate, or aggressive.")

    monthly_gross = values["salary"] / 12
    monthly_surplus = monthly_gross - values["expenses"] - values["debtPayment"]
    emergency_target = values["expenses"] * months
    emergency_gap = max(0, emergency_target - values["emergencyFund"])
    dti = values["debtPayment"] / monthly_gross * 100 if monthly_gross else 0

    steps = [
        "Keep near-term inheritance cash liquid while ownership and tax questions are confirmed.",
        ("Build the emergency reserve before committing the full inheritance to long-term investments."
         if emergency_gap else
         "The illustrative emergency reserve target is covered; verify it against actual obligations."),
        "Review debt rates, account basis, beneficiary restrictions, and investment risk with qualified professionals.",
    ]
    return {
        "monthlySurplus": round(monthly_surplus, 2),
        "emergencyTarget": round(emergency_target, 2),
        "emergencyGap": round(emergency_gap, 2),
        "debtToIncome": round(dti, 1),
        "steps": steps,
        "mode": "Aayush deterministic planner adapter",
    }


def document_checklist(state: str) -> dict:
    normalized = normalize_state(state)
    documents = load_heir_dashboard()["documents"]
    return {"state": normalized, "documents": documents,
            "mode": "curated inheritor checklist"}


class ApiHandler(BaseHTTPRequestHandler):
    server_version = "VantageIntegration/1.0"

    def _headers(self, status: int = HTTPStatus.OK) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", os.getenv("VANTAGE_ALLOWED_ORIGIN", "http://localhost:5173"))
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def _send(self, payload: dict, status: int = HTTPStatus.OK) -> None:
        self._headers(status)
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def _body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length > MAX_BODY_BYTES:
            raise ValueError("Request body is too large.")
        raw = self.rfile.read(length) if length else b"{}"
        value = json.loads(raw)
        if not isinstance(value, dict):
            raise ValueError("JSON body must be an object.")
        return value

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._headers(HTTPStatus.NO_CONTENT)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/api/health":
                self._send({"ok": True, "mode": "demo-safe", "aiKeyConfigured": any(
                    os.getenv(name) for name in ("My_API_Key", "GEMINI_API_KEY", "GOOGLE_API_KEY"))})
            elif parsed.path == "/api/heir/dashboard":
                self._send(load_heir_dashboard())
            elif parsed.path == "/api/heir/documents":
                state = parse_qs(parsed.query).get("state", [""])[0]
                self._send(document_checklist(state))
            elif parsed.path == "/api/parent/dashboard":
                parent_path = ROOT / "src" / "data" / "parent-demo.json"
                self._send(json.loads(parent_path.read_text(encoding="utf-8")))
            else:
                self._send({"error": "Not found."}, HTTPStatus.NOT_FOUND)
        except (ValueError, DocTrackError, json.JSONDecodeError) as exc:
            self._send({"error": str(exc)}, HTTPStatus.BAD_REQUEST)

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        try:
            body = self._body()
            if parsed.path == "/api/heir/coach":
                self._send(coach_answer(body.get("question", "")))
            elif parsed.path == "/api/heir/plan":
                self._send(calculate_plan(body))
            elif parsed.path.startswith("/api/parent/"):
                self._send({"saved": True, "mode": "fictional demo only"})
            else:
                self._send({"error": "Not found."}, HTTPStatus.NOT_FOUND)
        except (ValueError, DocTrackError, json.JSONDecodeError) as exc:
            self._send({"error": str(exc)}, HTTPStatus.BAD_REQUEST)

    def log_message(self, format: str, *args) -> None:
        if os.getenv("VANTAGE_API_LOG") == "1":
            super().log_message(format, *args)


def run(host: str = "127.0.0.1", port: int = 8001) -> None:
    server = ThreadingHTTPServer((host, port), ApiHandler)
    print(f"Vantage demo API: http://{host}:{server.server_port}")
    server.serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the Vantage AI demo API")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()
    run(args.host, args.port)
