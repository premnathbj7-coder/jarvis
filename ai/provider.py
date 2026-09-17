"""
AI provider abstraction using local Ollama.

    AIProvider (interface)
        |
        +-- OllamaProvider      (local reasoning via Ollama)
        |
        +-- NullProvider        (offline fallback — never crashes the app)
"""
from __future__ import annotations

import abc
from typing import List, Optional, Tuple

from ai.response import AIResponse
from core.brain import get_brain
from core.config_loader import get_config
from core.logger import get_logger
from core.ollama_client import get_ollama_client

log = get_logger("ai_provider")


class AIProvider(abc.ABC):
    """Common interface every AI backend must implement."""

    @abc.abstractmethod
    def generate(self, message: str, history: List[Tuple[str, str]]) -> AIResponse:
        """
        Generate a reply to `message` given `history` as a list of
        (role, content) tuples ordered oldest-first.
        """
        raise NotImplementedError

    @property
    @abc.abstractmethod
    def is_available(self) -> bool:
        raise NotImplementedError


class NullProvider(AIProvider):
    """Offline fallback. Always available, never calls the network."""

    _CANNED = (
        "Ollama is currently unreachable. Please ensure the Ollama service is running "
        "at http://localhost:11434 and try again."
    )

    def generate(self, message: str, history: List[Tuple[str, str]]) -> AIResponse:
        return AIResponse(text=self._CANNED, success=True)

    @property
    def is_available(self) -> bool:
        return True


class OllamaProvider(AIProvider):
    """Local reasoning backend using Ollama."""

    def __init__(self) -> None:
        self._brain = get_brain()
        self._client = get_ollama_client()

    @property
    def is_available(self) -> bool:
        return self._client.is_available()

    def generate(self, message: str, history: List[Tuple[str, str]]) -> AIResponse:
        if not self.is_available:
            return AIResponse.failure("Ollama service is unavailable.")

        try:
            text = self._brain.generate_response(message, history)
            return AIResponse(text=text, success=True)
        except Exception as e:
            log.exception("Ollama generation failed")
            return AIResponse.failure(f"Local AI reasoning failed: {e}")


_provider: Optional[AIProvider] = None


def get_ai_provider() -> AIProvider:
    """Return the configured AI provider, falling back to NullProvider on failure."""
    global _provider
    if _provider is not None:
        return _provider

    candidate = OllamaProvider()
    _provider = candidate if candidate.is_available else NullProvider()

    log.info("AI provider active: %s", type(_provider).__name__)
    return _provider
