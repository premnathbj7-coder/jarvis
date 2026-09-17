"""
In-memory countdown timers.

Timers don't need to survive a restart, so they live in memory with
a background thread per timer rather than in the database.
"""
from __future__ import annotations

import re
import threading
import time
import uuid
from dataclasses import dataclass
from typing import Callable, Dict, Optional

from core.logger import get_logger

log = get_logger("timers")

_UNIT_SECONDS = {
    "second": 1, "seconds": 1, "sec": 1, "secs": 1,
    "minute": 60, "minutes": 60, "min": 60, "mins": 60,
    "hour": 3600, "hours": 3600, "hr": 3600, "hrs": 3600,
}

_DURATION_PATTERN = re.compile(r"(\d+)\s*([a-zA-Z]+)")


def parse_duration(text: str) -> Optional[int]:
    """Parse a phrase like '20 minute' or '1 hour 30 minutes' into total seconds."""
    total = 0
    matches = _DURATION_PATTERN.findall(text.lower())
    if not matches:
        return None
    for value, unit in matches:
        seconds_per_unit = _UNIT_SECONDS.get(unit.rstrip("."))
        if seconds_per_unit is None:
            continue
        total += int(value) * seconds_per_unit
    return total or None


@dataclass
class Timer:
    id: str
    label: str
    duration_seconds: int
    started_at: float


class TimerManager:
    def __init__(self) -> None:
        self._timers: Dict[str, Timer] = {}
        self._lock = threading.RLock()

    def start(self, duration_text: str, on_complete: Callable[[str], None]) -> str:
        seconds = parse_duration(duration_text)
        if not seconds:
            return "I didn't catch how long to set the timer for."

        timer_id = str(uuid.uuid4())
        timer = Timer(id=timer_id, label=duration_text.strip(), duration_seconds=seconds, started_at=time.time())

        with self._lock:
            self._timers[timer_id] = timer

        def _worker():
            time.sleep(seconds)
            with self._lock:
                if timer_id not in self._timers:
                    return  # cancelled
                del self._timers[timer_id]
            log.info("Timer complete: %s", timer.label)
            on_complete(timer.label)

        threading.Thread(target=_worker, daemon=True).start()
        log.info("Timer started: %s (%ds)", timer.label, seconds)
        return f"Timer set for {timer.label}."

    def cancel_all(self) -> int:
        with self._lock:
            count = len(self._timers)
            self._timers.clear()
        return count

    def active_count(self) -> int:
        with self._lock:
            return len(self._timers)


_timer_manager: "TimerManager | None" = None


def get_timer_manager() -> TimerManager:
    global _timer_manager
    if _timer_manager is None:
        _timer_manager = TimerManager()
    return _timer_manager
