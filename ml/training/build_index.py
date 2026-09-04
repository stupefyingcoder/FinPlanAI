"""Rebuild the FAISS retrieval index from the documents in ml/data.

Run:  python -m training.build_index

The committed index is 768-dimensional, built with `models/text-embedding-004`.
Google retires embedding model names over time, and an index can only be queried
with the model that built it — mixing them raises a dimension mismatch or, worse,
returns confident nonsense. So if `EMBED_MODEL` changes, the index has to be
rebuilt, and this is that step.

Needs a working GEMINI_API_KEY; embeddings are produced by the API.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from finplan_ml import config  # noqa: E402

CHUNK_SIZE = 900
CHUNK_OVERLAP = 150


def read_documents() -> list[tuple[str, str]]:
    """Return (source name, text) for every PDF and text file under data/."""
    documents: list[tuple[str, str]] = []

    for pdf in sorted(config.DATA_DIR.glob("*.pdf")):
        try:
            from PyPDF2 import PdfReader

            text = "\n".join((page.extract_text() or "") for page in PdfReader(str(pdf)).pages)
            if text.strip():
                documents.append((pdf.name, text))
        except Exception as exc:  # noqa: BLE001
            print(f"  skipped {pdf.name}: {exc}")

    for txt in sorted(config.DATA_DIR.glob("*.md")) + sorted(config.DATA_DIR.glob("*.txt")):
        documents.append((txt.name, txt.read_text(encoding="utf-8", errors="ignore")))

    return documents


def main() -> int:
    api_key = config.GEMINI_API_KEY
    if not api_key:
        print("GEMINI_API_KEY is not set — the index cannot be rebuilt without it.")
        print("Copy ml/.env.example to ml/.env and add a key from")
        print("https://aistudio.google.com/apikey")
        return 1

    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    from langchain_community.vectorstores import FAISS

    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
    except ImportError:  # pragma: no cover
        from langchain.text_splitter import RecursiveCharacterTextSplitter

    documents = read_documents()
    if not documents:
        print(f"no documents found in {config.DATA_DIR}")
        return 1
    print(f"read {len(documents)} documents from {config.DATA_DIR.name}/")

    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    texts: list[str] = []
    metadatas: list[dict] = []
    for name, body in documents:
        for chunk in splitter.split_text(body):
            texts.append(chunk)
            metadatas.append({"source": name})
    print(f"split into {len(texts)} chunks (size {CHUNK_SIZE}, overlap {CHUNK_OVERLAP})")

    print(f"embedding with {config.EMBED_MODEL} …")
    embeddings = GoogleGenerativeAIEmbeddings(model=config.EMBED_MODEL, google_api_key=api_key)
    store = FAISS.from_texts(texts, embeddings, metadatas=metadatas)

    if config.INDEX_DIR.exists():
        backup = config.INDEX_DIR.with_name(config.INDEX_DIR.name + "_previous")
        shutil.rmtree(backup, ignore_errors=True)
        shutil.move(str(config.INDEX_DIR), str(backup))
        print(f"previous index moved to {backup.name}/")

    store.save_local(str(config.INDEX_DIR))
    print(f"saved {len(texts)} vectors to {config.INDEX_DIR.name}/")
    print("\nThe embedding model that built an index is the only one that can query it —")
    print(f"keep EMBED_MODEL set to {config.EMBED_MODEL} unless you rebuild again.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
