"""
Nomic Embeddings wrapper using nomic-embed-text via Ollama.
"""
from __future__ import annotations

import math
from typing import List, Optional

from config import EMBEDDING_MODEL
from core.logger import get_logger
from core.ollama_client import get_ollama_client

log = get_logger("embeddings")


class NomicEmbedder:
    """Embedder using local nomic-embed-text model."""

    def __init__(self) -> None:
        self._client = get_ollama_client()
        self._model = EMBEDDING_MODEL

    def get_embedding(self, text: str) -> Optional[List[float]]:
        """Generate float vector embedding for given text."""
        text_clean = text.strip()
        if not text_clean:
            return None
        return self._client.embed(model=self._model, prompt=text_clean)


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity score between two float vectors."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return dot_product / (norm_a * norm_b)


_embedder: Optional[NomicEmbedder] = None


def get_embedder() -> NomicEmbedder:
    global _embedder
    if _embedder is None:
        _embedder = NomicEmbedder()
    return _embedder
