"""
Local vector memory store using SQLite and Nomic embeddings.
"""
from __future__ import annotations

import json
from typing import List, Tuple

from core.logger import get_logger
from memory.database import get_database
from memory.embeddings import cosine_similarity, get_embedder

log = get_logger("memory_store")


class VectorMemoryStore:
    """Manages semantic vector memory storage and retrieval."""

    def __init__(self) -> None:
        self._db = get_database()
        self._embedder = get_embedder()

    def store_memory(self, content: str) -> str:
        """Embed content using nomic-embed-text and store in SQLite."""
        text = content.strip()
        if not text:
            return "Cannot store empty memory."

        embedding = self._embedder.get_embedding(text)
        if not embedding:
            log.warning("Embedding generation failed for text: %s", text)
            # Store without embedding as fallback text record
            embedding_json = "[]"
        else:
            embedding_json = json.dumps(embedding)

        with self._db.cursor() as cur:
            cur.execute(
                "INSERT INTO vector_memory (content, embedding_json) VALUES (?, ?)",
                (text, embedding_json),
            )
        log.info("Stored vector memory: %s", text)
        return f"Understood. I have stored '{text}' in my local memory."

    def search_memories(self, query: str, limit: int = 3, min_similarity: float = 0.35) -> List[str]:
        """Perform semantic vector search using nomic-embed-text."""
        query_text = query.strip()
        if not query_text:
            return []

        query_embedding = self._embedder.get_embedding(query_text)

        with self._db.cursor() as cur:
            cur.execute("SELECT id, content, embedding_json FROM vector_memory")
            rows = cur.fetchall()

        if not rows:
            return []

        # If query embedding failed, fallback to keyword substring matching
        if not query_embedding:
            query_lower = query_text.lower()
            return [r["content"] for r in rows if query_lower in r["content"].lower()][:limit]

        scored_memories: List[Tuple[float, str]] = []
        for r in rows:
            content = r["content"]
            emb_str = r["embedding_json"]
            try:
                emb = json.loads(emb_str)
                if emb:
                    sim = cosine_similarity(query_embedding, emb)
                    if sim >= min_similarity:
                        scored_memories.append((sim, content))
                else:

                    if query_text.lower() in content.lower():
                        scored_memories.append((0.5, content))
            except Exception:
                continue

        scored_memories.sort(key=lambda x: x[0], reverse=True)
        return [mem for _, mem in scored_memories[:limit]]

    def recall_all(self) -> List[str]:
        with self._db.cursor() as cur:
            cur.execute("SELECT content FROM vector_memory ORDER BY id ASC")
            rows = cur.fetchall()
        return [r["content"] for r in rows]

    def forget_memory(self, fragment: str) -> str:
        """Delete memories matching fragment."""
        frag = f"%{fragment.strip()}%"
        with self._db.cursor() as cur:
            cur.execute("DELETE FROM vector_memory WHERE content LIKE ?", (frag,))
            count = cur.rowcount
        if count == 0:
            return f"I couldn't find any memory matching '{fragment}' to delete."
        return f"Done. I've forgotten {count} memory entry(ies)."


_store: "VectorMemoryStore | None" = None


def get_vector_store() -> VectorMemoryStore:
    global _store
    if _store is None:
        _store = VectorMemoryStore()
    return _store
