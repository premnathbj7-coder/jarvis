"""
Runtime conversational/session context.

Holds short-lived state that command handlers and the AI provider
need: last N turns, pending confirmations, active timers references,
current user session metadata. This is distinct from persistent
memory (see memory/) which survives restarts.
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class Turn:
    role: str          # "user" | "assistant"
    text: str
    timestamp: float = field(default_factory=time.time)


class SessionContext:
    """Thread-safe holder of the current conversation/session state."""

    def __init__(self, max_turns: int = 12) -> None:
        self._max_turns = max_turns
        self._turns: List[Turn] = []
        self._pending_confirmation: Optional[Dict[str, Any]] = None
        self._scratch: Dict[str, Any] = {}
        self._lock = threading.RLock()

    def add_turn(self, role: str, text: str) -> None:
        with self._lock:
            self._turns.append(Turn(role=role, text=text))
            if len(self._turns) > self._max_turns:
                self._turns = self._turns[-self._max_turns:]

    def recent_turns(self, n: Optional[int] = None) -> List[Turn]:
        with self._lock:
            data = list(self._turns)
        return data[-n:] if n else data

    def clear(self) -> None:
        with self._lock:
            self._turns.clear()
            self._pending_confirmation = None
            self._scratch.clear()

    # --- pending destructive-action confirmations ---
    def set_pending_confirmation(self, action: Dict[str, Any]) -> None:
        with self._lock:
            self._pending_confirmation = action

    def pop_pending_confirmation(self) -> Optional[Dict[str, Any]]:
        with self._lock:
            action = self._pending_confirmation
            self._pending_confirmation = None
            return action

    def has_pending_confirmation(self) -> bool:
        with self._lock:
            return self._pending_confirmation is not None

    # --- generic scratch space for handlers (e.g. active timers dict) ---
    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._scratch[key] = value

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            return self._scratch.get(key, default)


_context: SessionContext | None = None


def get_session_context() -> SessionContext:
    global _context
    if _context is None:
        from core.config_loader import get_config
        cfg = get_config()
        _context = SessionContext(max_turns=int(cfg.get("ai.history_turns", 12)))
    return _context
