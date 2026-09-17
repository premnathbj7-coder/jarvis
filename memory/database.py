"""
SQLite database layer.

Single lightweight local database (no server) shared by memory,
productivity (notes/tasks/reminders), and conversation history.
"""
from __future__ import annotations

import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional

from core.config_loader import get_config
from core.logger import get_logger

log = get_logger("database")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS conversation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT NOT NULL,
    due_at TEXT,
    fired INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vector_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    embedding_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_conversation_created ON conversation_history(created_at);
CREATE INDEX IF NOT EXISTS idx_reminders_fired ON reminders(fired);
"""


class Database:
    """Thread-safe SQLite wrapper with a single shared connection guarded by a lock."""

    def __init__(self, db_path: Optional[str] = None) -> None:
        cfg = get_config()
        path = db_path or cfg.get("memory.db_path", "data/database/jarvis.db")
        self._path: Path = cfg.data_path(path)
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(str(self._path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()
        log.info("Database initialized at %s", self._path)

    def _init_schema(self) -> None:
        with self._lock:
            self._conn.executescript(_SCHEMA)
            self._conn.commit()

    @contextmanager
    def cursor(self) -> Iterator[sqlite3.Cursor]:
        with self._lock:
            cur = self._conn.cursor()
            try:
                yield cur
                self._conn.commit()
            except Exception:
                self._conn.rollback()
                log.exception("Database operation failed, rolled back")
                raise
            finally:
                cur.close()

    def close(self) -> None:
        with self._lock:
            self._conn.close()


_db: Optional[Database] = None


def get_database() -> Database:
    global _db
    if _db is None:
        _db = Database()
    return _db
