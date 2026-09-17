"""
Confirmation workflow for destructive actions.

Handlers that want to perform a DESTRUCTIVE action should call
ConfirmationManager.request(...) instead of executing directly.
This stores the pending action in the session context and returns
a spoken/displayed prompt. The next user utterance is then checked
against the pending confirmation by the command router.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

from core.config_loader import get_config
from core.context import get_session_context
from core.events import Events, get_event_bus
from core.logger import get_logger

log = get_logger("confirmations")


@dataclass
class PendingAction:
    description: str
    handler: Callable[..., Any]
    args: tuple
    kwargs: dict
    created_at: float


class ConfirmationManager:
    def __init__(self) -> None:
        self._cfg = get_config()
        self._ctx = get_session_context()
        self._bus = get_event_bus()
        self._pending: Optional[PendingAction] = None

    def request(self, description: str, handler: Callable[..., Any], *args: Any, **kwargs: Any) -> str:
        """
        Register a pending destructive action and return the prompt to
        show/speak to the user. The action is NOT executed here.
        """
        self._pending = PendingAction(
            description=description,
            handler=handler,
            args=args,
            kwargs=kwargs,
            created_at=time.time(),
        )
        self._ctx.set_pending_confirmation({"description": description})
        self._bus.emit(Events.CONFIRMATION_REQUIRED, description=description)
        log.info("Confirmation requested: %s", description)
        return f"{description} Would you like me to continue?"

    def _is_expired(self) -> bool:
        if not self._pending:
            return True
        timeout = float(self._cfg.get("security.confirmation_timeout_seconds", 20))
        return (time.time() - self._pending.created_at) > timeout

    def confirm(self) -> Optional[Any]:
        """User said yes. Execute the pending action if one exists and hasn't expired."""
        if not self._pending:
            return None
        if self._is_expired():
            log.info("Pending confirmation expired before user responded")
            self._pending = None
            self._ctx.pop_pending_confirmation()
            return None
        action = self._pending
        self._pending = None
        self._ctx.pop_pending_confirmation()
        log.info("Confirmation approved, executing: %s", action.description)
        return action.handler(*action.args, **action.kwargs)

    def cancel(self) -> str:
        """User said no. Discard the pending action."""
        desc = self._pending.description if self._pending else "the pending action"
        self._pending = None
        self._ctx.pop_pending_confirmation()
        log.info("Confirmation cancelled: %s", desc)
        return "Understood. Action cancelled."

    def has_pending(self) -> bool:
        return self._pending is not None and not self._is_expired()


_manager: Optional[ConfirmationManager] = None


def get_confirmation_manager() -> ConfirmationManager:
    global _manager
    if _manager is None:
        _manager = ConfirmationManager()
    return _manager
