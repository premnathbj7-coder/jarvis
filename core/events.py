"""
Lightweight synchronous/async-friendly event bus.

Used to decouple subsystems: e.g. the orb UI subscribes to
"state_changed" events without the command router needing to
know the UI exists.
"""
from __future__ import annotations

import threading
from collections import defaultdict
from typing import Any, Callable, Dict, List

from core.logger import get_logger

log = get_logger("events")

Callback = Callable[..., None]


class EventBus:
    """Thread-safe publish/subscribe event bus."""

    def __init__(self) -> None:
        self._subscribers: Dict[str, List[Callback]] = defaultdict(list)
        self._lock = threading.RLock()

    def subscribe(self, event_name: str, callback: Callback) -> None:
        with self._lock:
            self._subscribers[event_name].append(callback)

    def unsubscribe(self, event_name: str, callback: Callback) -> None:
        with self._lock:
            if callback in self._subscribers.get(event_name, []):
                self._subscribers[event_name].remove(callback)

    def emit(self, event_name: str, *args: Any, **kwargs: Any) -> None:
        with self._lock:
            callbacks = list(self._subscribers.get(event_name, []))
        for cb in callbacks:
            try:
                cb(*args, **kwargs)
            except Exception:
                log.exception("Event handler for '%s' raised an exception", event_name)


_bus: EventBus | None = None


def get_event_bus() -> EventBus:
    global _bus
    if _bus is None:
        _bus = EventBus()
    return _bus


# ---- Common event name constants (avoid typo-prone magic strings) ----
class Events:
    STATE_CHANGED = "state_changed"          # orb/UI state machine
    USER_UTTERANCE = "user_utterance"         # raw recognized speech / typed text
    AI_RESPONSE = "ai_response"               # final assistant text
    COMMAND_EXECUTED = "command_executed"
    CONFIRMATION_REQUIRED = "confirmation_required"
    ERROR = "error"
    WAKE_WORD_DETECTED = "wake_word_detected"
    MIC_LEVEL = "mic_level"                   # audio amplitude for orb visualizer
    TTS_LEVEL = "tts_level"
