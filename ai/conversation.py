"""
High-level conversation manager tying together the AI provider,
session context, and persisted conversation memory.
"""
from __future__ import annotations

from typing import List, Tuple

from ai.provider import get_ai_provider
from ai.response import AIResponse
from core.context import get_session_context
from core.logger import get_logger
from memory.memory_manager import get_memory_manager

log = get_logger("conversation")


class ConversationManager:
    def __init__(self) -> None:
        self._provider = get_ai_provider()
        self._ctx = get_session_context()
        self._memory = get_memory_manager()

    def ask(self, message: str) -> AIResponse:
        history: List[Tuple[str, str]] = [(t.role, t.text) for t in self._ctx.recent_turns()]

        self._ctx.add_turn("user", message)
        self._memory.log_turn("user", message)

        response = self._provider.generate(message, history)

        self._ctx.add_turn("assistant", response.text)
        self._memory.log_turn("assistant", response.text)

        return response
