"""
JARVIS state machine.

Defines the finite set of states the assistant (and therefore the
Orb UI) can be in, and enforces valid transitions.
"""
from __future__ import annotations

import threading
from enum import Enum

from core.events import Events, get_event_bus
from core.logger import get_logger

log = get_logger("state")


class AssistantState(str, Enum):
    IDLE = "IDLE"
    LISTENING = "LISTENING"
    THINKING = "THINKING"
    PROCESSING = "PROCESSING"
    SPEAKING = "SPEAKING"
    ERROR = "ERROR"


# States it is always legal to transition to from any state.
_ALWAYS_ALLOWED = {AssistantState.IDLE, AssistantState.ERROR}

_TRANSITIONS = {
    AssistantState.IDLE: {AssistantState.LISTENING, AssistantState.THINKING, AssistantState.PROCESSING},
    AssistantState.LISTENING: {AssistantState.THINKING, AssistantState.PROCESSING},
    AssistantState.THINKING: {AssistantState.PROCESSING, AssistantState.SPEAKING},
    AssistantState.PROCESSING: {AssistantState.SPEAKING, AssistantState.THINKING},
    AssistantState.SPEAKING: set(),
    AssistantState.ERROR: set(),
}


class StateMachine:
    """Thread-safe assistant state machine that emits events on change."""

    def __init__(self) -> None:
        self._state = AssistantState.IDLE
        self._lock = threading.RLock()
        self._bus = get_event_bus()

    @property
    def state(self) -> AssistantState:
        with self._lock:
            return self._state

    def transition(self, new_state: AssistantState, reason: str = "") -> bool:
        """Attempt a state transition. Returns True if it succeeded."""
        with self._lock:
            current = self._state
            allowed = new_state in _ALWAYS_ALLOWED or new_state in _TRANSITIONS.get(current, set())
            if not allowed:
                log.debug("Blocked invalid transition %s -> %s", current, new_state)
                return False
            self._state = new_state
        log.debug("State: %s -> %s (%s)", current, new_state, reason)
        self._bus.emit(Events.STATE_CHANGED, old=current, new=new_state, reason=reason)
        return True

    def reset(self) -> None:
        self.transition(AssistantState.IDLE, reason="reset")


_state_machine: StateMachine | None = None


def get_state_machine() -> StateMachine:
    global _state_machine
    if _state_machine is None:
        _state_machine = StateMachine()
    return _state_machine
