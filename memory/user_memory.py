"""
User-approved persistent memory ("remember that my project is called JARVIS").

Nothing is written here automatically — every entry must come from an
explicit "remember ..." command, per the project's memory principle.
"""
from __future__ import annotations

from typing import List, Optional, Tuple

from core.logger import get_logger
from memory.database import get_database

log = get_logger("user_memory")


class UserMemory:
    def __init__(self) -> None:
        self._db = get_database()

    def remember(self, fact: str) -> None:
        """Store a fact. Uses the fact text itself as a loose key for simple lookups."""
        key = fact.strip().lower()[:120]
        with self._db.cursor() as cur:
            cur.execute(
                "INSERT INTO user_memory (key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, fact.strip()),
            )
        log.info("Remembered fact: %s", fact)

    def recall_all(self) -> List[str]:
        with self._db.cursor() as cur:
            cur.execute("SELECT value FROM user_memory ORDER BY id ASC")
            rows = cur.fetchall()
        return [r["value"] for r in rows]

    def recall_about(self, topic: str) -> List[str]:
        """Naive substring search over stored facts."""
        topic_lower = topic.strip().lower()
        return [f for f in self.recall_all() if topic_lower in f.lower()]

    def forget(self, fact_fragment: str) -> int:
        """Delete facts whose text contains the given fragment. Returns count deleted."""
        fragment = f"%{fact_fragment.strip()}%"
        with self._db.cursor() as cur:
            cur.execute("DELETE FROM user_memory WHERE value LIKE ?", (fragment,))
            deleted = cur.rowcount
        log.info("Forgot %d fact(s) matching '%s'", deleted, fact_fragment)
        return deleted

    def forget_all(self) -> int:
        with self._db.cursor() as cur:
            cur.execute("DELETE FROM user_memory")
            return cur.rowcount
