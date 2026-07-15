"""PDF-backed RAG, as a service.

WHAT CHANGED AND WHY (all of it is about UI integration):
  * generate_rag_response() used to PRINT the stream. A web UI would get the
    answer on the server console and nothing in the browser. Streaming now
    YIELDS chunks; whoever calls it decides what to do with them.
  * ingest_pdfs() used to print progress and return an int. It now returns an
    IngestReport so a UI can render per-file status, including "this PDF is a
    scan with no extractable text" — previously invisible unless you watched
    stdout.
  * Retrieval returns Citation objects, so a UI can render source badges
    instead of scraping "[file.pdf p.3]" back out of prose.
  * Lazy init is now lock-guarded: two concurrent requests would otherwise both
    load the embedding model.
  * Paths come from config (absolute), not Path("data") relative to CWD.

Behaviour is otherwise unchanged: same chunking, same fingerprint cache, same
prompt, same models.
"""

from __future__ import annotations

import json
import logging
import threading
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Iterable, Iterator, Optional

from config import (
    DATA_DIR, STORE_DIR, COLLECTION_NAME, EMBED_MODEL,
    CHUNK_SIZE, CHUNK_OVERLAP, TOP_K, MAIN_MODEL,
)

log = logging.getLogger(__name__)

NO_DOCS_MESSAGE = (
    "I don't have any of your documents indexed yet. "
    f"Add PDFs to {DATA_DIR} and ask again."
)


# --------------------------------------------------------------------------
# Return types — everything a UI needs, JSON-serializable
# --------------------------------------------------------------------------
@dataclass
class FileStatus:
    name: str
    status: str          # "indexed" | "unchanged" | "no_text" | "error"
    chunks: int = 0
    pages: int = 0
    detail: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class IngestReport:
    files: list[FileStatus] = field(default_factory=list)
    chunks_added: int = 0
    total_chunks_in_index: int = 0

    @property
    def ok(self) -> bool:
        return not any(f.status == "error" for f in self.files)

    @property
    def needs_ocr(self) -> list[str]:
        return [f.name for f in self.files if f.status == "no_text"]

    def to_dict(self) -> dict:
        return {
            "files": [f.to_dict() for f in self.files],
            "chunks_added": self.chunks_added,
            "total_chunks_in_index": self.total_chunks_in_index,
            "ok": self.ok,
            "needs_ocr": self.needs_ocr,
        }


@dataclass
class Citation:
    source: str
    page: int
    text: str
    distance: Optional[float] = None

    @property
    def label(self) -> str:
        return f"{self.source} p.{self.page}"

    def to_dict(self) -> dict:
        return {**asdict(self), "label": self.label}


@dataclass
class RAGAnswer:
    query: str
    text: str
    citations: list[Citation] = field(default_factory=list)
    grounded: bool = True     # False => no docs indexed, answer is a fallback

    def to_dict(self) -> dict:
        return {
            "query": self.query,
            "text": self.text,
            "citations": [c.to_dict() for c in self.citations],
            "grounded": self.grounded,
        }


# --------------------------------------------------------------------------
# Pure helpers (no I/O, unit-testable without Gemini or Chroma)
# --------------------------------------------------------------------------
def _chunk(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> Iterable[str]:
    if len(text) <= size:
        if text.strip():
            yield text
        return
    start = 0
    while start < len(text):
        end = start + size
        window = text[start:end]
        if end < len(text):
            cut = max(window.rfind(". "), window.rfind("\n"))
            if cut > size * 0.5:
                window = window[: cut + 1]
                end = start + cut + 1
        piece = window.strip()
        if piece:
            yield piece
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)


def _read_pdf(path: Path) -> list[tuple[int, str]]:
    from pypdf import PdfReader

    pages: list[tuple[int, str]] = []
    reader = PdfReader(str(path))
    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((i, " ".join(text.split())))
    return pages


def _fingerprint(path: Path) -> str:
    st = path.stat()
    return f"{st.st_size}:{int(st.st_mtime)}"


# --------------------------------------------------------------------------
_RAG_SYSTEM = (
    "You are a personal financial assistant. Answer using ONLY the provided "
    "context from the user's own documents. Cite the source file and page for "
    "any figure you use. If the context does not contain what's needed, say so "
    "plainly and name what document would answer it. Never invent numbers."
)


class RAGEngine:
    """Stateless from the caller's perspective; holds the expensive handles.

    A UI creates one at startup (or uses the module-level `engine`) and calls
    ingest()/retrieve()/answer()/stream_answer() per request.
    """

    def __init__(self, data_dir: Path = DATA_DIR, store_dir: Path = STORE_DIR):
        self.data_dir = Path(data_dir)
        self.store_dir = Path(store_dir)
        self.manifest_path = self.store_dir / "manifest.json"
        self._embedder = None
        self._collection = None
        self._lock = threading.Lock()

    # -- lazy handles -------------------------------------------------------
    @property
    def embedder(self):
        if self._embedder is None:
            with self._lock:
                if self._embedder is None:
                    from sentence_transformers import SentenceTransformer
                    log.info("loading embedding model %s", EMBED_MODEL)
                    self._embedder = SentenceTransformer(EMBED_MODEL)
        return self._embedder

    @property
    def collection(self):
        if self._collection is None:
            with self._lock:
                if self._collection is None:
                    import chromadb
                    self.store_dir.mkdir(parents=True, exist_ok=True)
                    chroma = chromadb.PersistentClient(path=str(self.store_dir))
                    self._collection = chroma.get_or_create_collection(name=COLLECTION_NAME)
        return self._collection

    def is_ready(self) -> bool:
        """True if there's anything to retrieve."""
        return self._safe_count() > 0

    def list_documents(self) -> list[str]:
        if not self.data_dir.exists():
            return []
        return sorted(p.name for p in self.data_dir.glob("*.pdf"))

    # -- manifest -----------------------------------------------------------
    def _load_manifest(self) -> dict:
        if self.manifest_path.exists():
            try:
                return json.loads(self.manifest_path.read_text())
            except json.JSONDecodeError:
                log.warning("manifest unreadable; treating corpus as un-indexed")
        return {}

    def _save_manifest(self, m: dict) -> None:
        self.store_dir.mkdir(parents=True, exist_ok=True)
        self.manifest_path.write_text(json.dumps(m, indent=2))

    def _safe_count(self) -> int:
        try:
            return self.collection.count()
        except Exception:
            return 0

    # -- ingestion ----------------------------------------------------------
    def ingest(self, force: bool = False, progress=None) -> IngestReport:
        """Sync PDFs into the vector store.

        `progress` is an optional callback(FileStatus) — a CLI prints it, a UI
        pushes it over a websocket, a test collects it. The engine never decides
        how progress is displayed.
        """
        self.data_dir.mkdir(parents=True, exist_ok=True)
        report = IngestReport()
        pdfs = sorted(self.data_dir.glob("*.pdf"))

        if not pdfs:
            log.info("no PDFs found in %s", self.data_dir)
            report.total_chunks_in_index = self._safe_count()
            return report

        manifest = {} if force else self._load_manifest()

        for pdf in pdfs:
            fp = _fingerprint(pdf)
            if manifest.get(pdf.name) == fp:
                st = FileStatus(pdf.name, "unchanged")
            else:
                try:
                    st = self._ingest_one(pdf, fp, manifest, report)
                except Exception as e:
                    log.exception("failed to ingest %s", pdf.name)
                    st = FileStatus(pdf.name, "error", detail=str(e))
            report.files.append(st)
            if progress:
                progress(st)

        self._save_manifest(manifest)
        report.total_chunks_in_index = self._safe_count()
        return report

    def _ingest_one(self, pdf: Path, fp: str, manifest: dict,
                    report: IngestReport) -> FileStatus:
        # file changed -> drop its old chunks before re-adding
        try:
            self.collection.delete(where={"source": pdf.name})
        except Exception:
            pass

        pages = _read_pdf(pdf)
        ids, docs, metas = [], [], []
        for page_no, page_text in pages:
            for j, piece in enumerate(_chunk(page_text)):
                ids.append(f"{pdf.stem}-p{page_no}-c{j}")
                docs.append(piece)
                metas.append({"source": pdf.name, "page": page_no})

        if not docs:
            manifest[pdf.name] = fp
            return FileStatus(
                pdf.name, "no_text", pages=len(pages),
                detail="No extractable text — likely a scan. Run OCR (e.g. ocrmypdf) first.",
            )

        embeddings = self.embedder.encode(docs, batch_size=32, show_progress_bar=False).tolist()
        self.collection.add(ids=ids, documents=docs, embeddings=embeddings, metadatas=metas)
        manifest[pdf.name] = fp
        report.chunks_added += len(docs)
        log.info("indexed %s: %d chunks", pdf.name, len(docs))
        return FileStatus(pdf.name, "indexed", chunks=len(docs), pages=len(pages))

    # -- retrieval ----------------------------------------------------------
    def retrieve(self, query: str, top_k: int = TOP_K) -> list[Citation]:
        """Exposed separately so a UI can show sources *before* the answer
        streams in, and so retrieval quality is testable without token spend."""
        count = self._safe_count()
        if count == 0:
            return []

        emb = self.embedder.encode(query).tolist()
        res = self.collection.query(
            query_embeddings=[emb],
            n_results=min(top_k, count),
            include=["documents", "metadatas", "distances"],
        )
        docs = res.get("documents", [[]])[0]
        metas = res.get("metadatas", [[]])[0]
        dists = res.get("distances", [[]])[0] or [None] * len(docs)

        return [
            Citation(source=m.get("source", "?"), page=int(m.get("page", 0)),
                     text=d, distance=dist)
            for d, m, dist in zip(docs, metas, dists)
        ]

    @staticmethod
    def build_prompt(query: str, citations: list[Citation]) -> str:
        context = "\n\n---\n\n".join(f"[{c.label}]\n{c.text}" for c in citations)
        return (f"Context from the user's documents:\n\n{context}\n\n"
                f"User Question: {query}\n\nAnswer:")

    def _config(self):
        from google.genai import types
        return types.GenerateContentConfig(system_instruction=_RAG_SYSTEM, temperature=0.3)

    # -- answering ----------------------------------------------------------
    def answer(self, query: str, auto_ingest: bool = True) -> RAGAnswer:
        """Blocking. Returns the full answer plus its citations."""
        from gem_client import get_client

        if auto_ingest:
            self.ingest()

        citations = self.retrieve(query)
        if not citations:
            return RAGAnswer(query=query, text=NO_DOCS_MESSAGE, grounded=False)

        resp = get_client().models.generate_content(
            model=MAIN_MODEL, contents=self.build_prompt(query, citations),
            config=self._config(),
        )
        return RAGAnswer(query=query, text=(resp.text or ""), citations=citations)

    def stream_answer(self, query: str, auto_ingest: bool = True) -> Iterator[str]:
        """Yields text chunks. Prints nothing.

        CLI:  for c in engine.stream_answer(q): sys.stdout.write(c)
        SSE:  return Response(engine.stream_answer(q), mimetype="text/event-stream")

        To show citations alongside a stream, call retrieve() first, render
        those, then stream with auto_ingest=False.
        """
        from gem_client import get_client

        if auto_ingest:
            self.ingest()

        citations = self.retrieve(query)
        if not citations:
            yield NO_DOCS_MESSAGE
            return

        for chunk in get_client().models.generate_content_stream(
            model=MAIN_MODEL, contents=self.build_prompt(query, citations),
            config=self._config(),
        ):
            if chunk.text:
                yield chunk.text


# Shared default instance — one embedding model per process.
engine = RAGEngine()


# --------------------------------------------------------------------------
# Back-compat shims so existing callers keep working.
# --------------------------------------------------------------------------
def generate_rag_response(user_query: str, stream: bool = False) -> str:
    """Deprecated. Returns the answer text.

    NOTE: `stream` no longer prints — the old version wrote to stdout, which is
    the exact behaviour that broke UI integration. The argument is accepted and
    ignored so existing calls don't crash. Use RAGEngine.stream_answer().
    """
    if stream:
        log.warning("generate_rag_response(stream=True) no longer prints; "
                    "use RAGEngine.stream_answer() to stream chunks")
    return engine.answer(user_query).text


def ingest_pdfs(force: bool = False) -> int:
    """Deprecated. Returns chunks added; use engine.ingest() for the full report."""
    return engine.ingest(force=force).chunks_added
