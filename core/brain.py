"""
Gemma 3 12B Core AI Brain (model: gemma3:12b-it-q4_K_M).

Handles natural language conversation, reasoning, explaining, planning,
and answering queries using retrieved vector memories and session history.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from config import BRAIN_MODEL
from core.logger import get_logger
from core.ollama_client import get_ollama_client
from core.personality import get_system_prompt

log = get_logger("brain")


class Gemma3Brain:
    """Core AI Reasoning Brain powered by Gemma 3 12B."""

    def __init__(self) -> None:
        self._client = get_ollama_client()
        self._model = BRAIN_MODEL

    def generate_response(
        self,
        message: str,
        history: List[Tuple[str, str]],
        recalled_memories: str = "",
    ) -> str:
        """
        Generate a JARVIS response using Gemma 3 12B.

        :param message: Current user message.
        :param history: List of (role, content) tuples ordered oldest first.
        :param recalled_memories: Relevant memory string retrieved from vector DB.
        """
        if not self._client.is_available():
            return (
                "Ollama is not running locally. Please start the Ollama application "
                "or service at http://localhost:11434 and try again."
            )

        if not self._client.model_available(self._model):
            return (
                f"The core brain model '{self._model}' is not installed in Ollama. "
                f"Please open a command prompt and run: ollama pull {self._model}"
            )

        msg_clean = message.strip().lower().rstrip(".!?,")
        if msg_clean in ("hello", "hi", "hey", "hey jarvis", "hello jarvis", "hi jarvis", "good morning", "good day", "howdy"):
            log.info("Fast-path greeting response for '%s'", message)
            return "Good day! How may I assist you?"

        # Build message history for Gemma 3
        system_content = get_system_prompt(recalled_memories)
        messages: List[Dict[str, str]] = [{"role": "system", "content": system_content}]

        for role, text in history:
            api_role = "assistant" if role == "assistant" else "user"
            messages.append({"role": api_role, "content": text})

        messages.append({"role": "user", "content": message})

        log.info("Sending request to Gemma 3 12B (%s turns in history)", len(history))
        reply = self._client.chat(model=self._model, messages=messages)

        if reply is None:
            log.warning("Gemma 3 12B timed out or returned empty response; using fallback assistant response.")
            return "JARVIS is online. How may I assist you today?"

        return reply


_brain: Optional[Gemma3Brain] = None


def get_brain() -> Gemma3Brain:
    global _brain
    if _brain is None:
        _brain = Gemma3Brain()
    return _brain
