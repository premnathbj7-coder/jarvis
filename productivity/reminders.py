"""
Reminders with a natural-language due time, persisted to SQLite so
they survive a restart. A lightweight polling thread fires due
reminders via a callback (e.g. TTS + notification).
"""
from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta
from typing import Callable, List, Optional, Tuple

from dateutil import parser as dateutil_parser

from core.logger import get_logger
from memory.database import get_database

log = get_logger("reminders")


def _parse_due_time(time_text: str) -> Optional[str]:
    """Best-effort natural language time parsing -> ISO string, or None."""
    if not time_text:
        return None
    try:
        dt = dateutil_parser.parse(time_text, fuzzy=True, default=datetime.now())
        if dt < datetime.now():
            dt += timedelta(days=1)  # assume next occurrence if time already passed today
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, OverflowError):
        return None


class ReminderManager:
    def __init__(self) -> None:
        self._db = get_database()
        self._poll_thread: Optional[threading.Thread] = None
        self._running = threading.Event()

    def add(self, task: str, time_text: str = "") -> str:
        due_at = _parse_due_time(time_text)
        with self._db.cursor() as cur:
            cur.execute("INSERT INTO reminders (task, due_at) VALUES (?, ?)", (task, due_at))
        log.info("Reminder added: %s at %s", task, due_at)
        if due_at:
            return f"I'll remind you to {task} at {due_at}."
        return f"I'll remember to remind you to {task}, though I couldn't pin down an exact time."

    def list_pending(self) -> List[Tuple[int, str, Optional[str]]]:
        with self._db.cursor() as cur:
            cur.execute("SELECT id, task, due_at FROM reminders WHERE fired = 0 ORDER BY id ASC")
            rows = cur.fetchall()
        return [(r["id"], r["task"], r["due_at"]) for r in rows]

    def start_polling(self, on_due: Callable[[str], None], interval_seconds: int = 30) -> None:
        if self._running.is_set():
            return
        self._running.set()

        def _loop():
            while self._running.is_set():
                self._check_due(on_due)
                time.sleep(interval_seconds)

        self._poll_thread = threading.Thread(target=_loop, daemon=True)
        self._poll_thread.start()

    def stop_polling(self) -> None:
        self._running.clear()

    def _check_due(self, on_due: Callable[[str], None]) -> None:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._db.cursor() as cur:
            cur.execute(
                "SELECT id, task FROM reminders WHERE fired = 0 AND due_at IS NOT NULL AND due_at <= ?",
                (now,),
            )
            due_rows = cur.fetchall()
            for row in due_rows:
                cur.execute("UPDATE reminders SET fired = 1 WHERE id = ?", (row["id"],))
        for row in due_rows:
            on_due(row["task"])


_reminder_manager: "ReminderManager | None" = None


def get_reminder_manager() -> ReminderManager:
    global _reminder_manager
    if _reminder_manager is None:
        _reminder_manager = ReminderManager()
    return _reminder_manager
