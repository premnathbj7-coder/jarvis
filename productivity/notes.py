"""Notes: quick titled or freeform text storage in SQLite."""
from __future__ import annotations

from typing import List, Tuple

from core.logger import get_logger
from memory.database import get_database

log = get_logger("notes")


class NotesManager:
    def __init__(self) -> None:
        self._db = get_database()

    def create(self, title: str = "", content: str = "") -> str:
        body = content or title
        with self._db.cursor() as cur:
            cur.execute("INSERT INTO notes (title, content) VALUES (?, ?)", (title or None, body))
        log.info("Note created: %s", title or body[:40])
        label = f"'{title}'" if title else "your note"
        return f"Created {label}."

    def list_all(self, limit: int = 20) -> List[Tuple[str, str, str]]:
        with self._db.cursor() as cur:
            cur.execute("SELECT title, content, created_at FROM notes ORDER BY id DESC LIMIT ?", (limit,))
            rows = cur.fetchall()
        return [(r["title"] or "", r["content"], r["created_at"]) for r in rows]


_notes: "NotesManager | None" = None


def get_notes_manager() -> NotesManager:
    global _notes
    if _notes is None:
        _notes = NotesManager()
    return _notes
