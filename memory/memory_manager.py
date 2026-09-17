"""
Unified facade over conversation + user memory, used by the command
router and AI provider so callers don't need to know about the two
underlying stores.
"""
from __future__ import annotations

from typing import List

from core.logger import get_logger
from memory.conversation_memory import ConversationMemory
from memory.user_memory import UserMemory

log = get_logger("memory_manager")


class MemoryManager:
    def __init__(self) -> None:
        self.conversation = ConversationMemory()
        self.user = UserMemory()

    def remember_fact(self, fact: str) -> str:
        self.user.remember(fact)
        return f"Understood. I'll remember that {fact}."

    def recall(self, topic: str = "") -> str:
        facts = self.user.recall_about(topic) if topic else self.user.recall_all()
        if not facts:
            return "I don't have anything stored about that yet." if topic else "I don't have anything stored in memory yet."
        joined = "; ".join(facts)
        return f"Here's what I remember: {joined}"

    def forget_fact(self, fragment: str) -> str:
        count = self.user.forget(fragment)
        if count == 0:
            return "I couldn't find anything matching that to forget."
        return "Done. I've forgotten that."

    def log_turn(self, role: str, content: str) -> None:
        self.conversation.add(role, content)

    def recent_history_text(self, limit: int = 10) -> List[str]:
        return [f"{role}: {content}" for role, content, _ in self.conversation.recent(limit)]


_manager: "MemoryManager | None" = None


def get_memory_manager() -> MemoryManager:
    global _manager
    if _manager is None:
        _manager = MemoryManager()
    return _manager
