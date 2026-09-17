"""Simple task list backed by SQLite."""
from __future__ import annotations

from typing import List, Tuple

from core.logger import get_logger
from memory.database import get_database

log = get_logger("tasks")


class TaskManager:
    def __init__(self) -> None:
        self._db = get_database()

    def add(self, description: str) -> str:
        with self._db.cursor() as cur:
            cur.execute("INSERT INTO tasks (description) VALUES (?)", (description,))
        log.info("Task added: %s", description)
        return f"Added '{description}' to your tasks."

    def complete(self, description_fragment: str) -> str:
        with self._db.cursor() as cur:
            cur.execute(
                "UPDATE tasks SET done = 1 WHERE description LIKE ? AND done = 0",
                (f"%{description_fragment}%",),
            )
            updated = cur.rowcount
        return f"Marked {updated} task(s) as complete." if updated else "I couldn't find that task."

    def list_pending(self) -> List[Tuple[int, str]]:
        with self._db.cursor() as cur:
            cur.execute("SELECT id, description FROM tasks WHERE done = 0 ORDER BY id ASC")
            rows = cur.fetchall()
        return [(r["id"], r["description"]) for r in rows]


_tasks: "TaskManager | None" = None


def get_task_manager() -> TaskManager:
    global _tasks
    if _tasks is None:
        _tasks = TaskManager()
    return _tasks
