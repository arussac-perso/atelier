"""
Indexing service — chunks documents and stores embeddings in LanceDB.
Used for semantic search (RAG) by agents.
"""
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Lazy imports to avoid slow startup
_db = None
_embed_model = None


def _get_db(lancedb_path: str):
    global _db
    if _db is None:
        import lancedb
        _db = lancedb.connect(lancedb_path)
    return _db


def _get_embed_model():
    global _embed_model
    if _embed_model is None:
        from sentence_transformers import SentenceTransformer
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embed_model


def _chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
    words = text.split()
    chunks = []
    step = chunk_size - overlap
    for i in range(0, len(words), step):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks


def index_file(
    project_id: int,
    file_id: int,
    filename: str,
    text: str,
    lancedb_path: str,
) -> int:
    """
    Chunk text, embed it, and upsert into the project's LanceDB table.
    Returns the number of chunks indexed.
    """
    if not text or not text.strip():
        return 0

    chunks = _chunk_text(text)
    if not chunks:
        return 0

    model = _get_embed_model()
    embeddings = model.encode(chunks, show_progress_bar=False)

    records = [
        {
            "file_id": file_id,
            "filename": filename,
            "chunk_index": i,
            "text": chunk,
            "vector": embedding.tolist(),
        }
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]

    db = _get_db(lancedb_path)
    table_name = f"project_{project_id}"

    try:
        if table_name in db.table_names():
            # Remove old entries for this file, then add new ones
            table = db.open_table(table_name)
            table.delete(f"file_id = {file_id}")
            table.add(records)
        else:
            db.create_table(table_name, data=records)
    except Exception as exc:
        logger.exception("LanceDB indexing error: %s", exc)
        return 0

    return len(chunks)


def search(
    project_id: int,
    query: str,
    lancedb_path: str,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """
    Semantic search in a project's LanceDB table.
    Returns a list of result dicts with keys: filename, text, score.
    """
    db = _get_db(lancedb_path)
    table_name = f"project_{project_id}"

    if table_name not in db.table_names():
        return []

    model = _get_embed_model()
    query_vec = model.encode([query], show_progress_bar=False)[0]

    try:
        table = db.open_table(table_name)
        results = (
            table.search(query_vec.tolist())
            .limit(limit)
            .to_list()
        )
        return [
            {
                "filename": r.get("filename", ""),
                "text": r.get("text", ""),
                "score": r.get("_distance", 0),
            }
            for r in results
        ]
    except Exception as exc:
        logger.exception("LanceDB search error: %s", exc)
        return []


def delete_file_index(project_id: int, file_id: int, lancedb_path: str) -> None:
    """Remove all chunks for a specific file from the project index."""
    db = _get_db(lancedb_path)
    table_name = f"project_{project_id}"
    if table_name in db.table_names():
        table = db.open_table(table_name)
        table.delete(f"file_id = {file_id}")
