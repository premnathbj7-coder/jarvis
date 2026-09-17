"""
Persisted conversation history (distinct from the in-memory
SessionContext, which only holds the current session's turns).

Useful for "what did we talk about earlier" style continuity and
for pruning old data past the retention window.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Tuple

from core.config_loader import get_config
from core.logger import get_logger
from memory.database import get_database

log = get_logger("conversation_memory")


class ConversationMemory:
    def __init__(self) -> None:
        self._db = get_database()
        self._cfg = get_config()

    def add(self, role: str, content: str) -> None:
        with self._db.cursor() as cur:
            cur.execute(
                "INSERT INTO conversation_history (role, content) VALUES (?, ?)",
                (role, content),
            )

    def recent(self, limit: int = 20) -> List[Tuple[str, str, str]]:
        with self._db.cursor() as cur:
            cur.execute(
                "SELECT role, content, created_at FROM conversation_history "
                "ORDER BY id DESC LIMIT ?",
                (limit,),
            )
            rows = cur.fetchall()
        return [(r["role"], r["content"], r["created_at"]) for r in reversed(rows)]

    def prune_old(self) -> int:
        """Delete conversation rows older than the configured retention window."""
        days = int(self._cfg.get("memory.conversation_retention_days", 30))
        cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
        with self._db.cursor() as cur:
            cur.execute("DELETE FROM conversation_history WHERE created_at < ?", (cutoff,))
            deleted = cur.rowcount
        if deleted:
            log.info("Pruned %d old conversation rows (older than %d days)", deleted, days)
        return deleted
