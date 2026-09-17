"""
Final gate before any handler executes.

Combines permission classification + confirmation state into a
single validate() call the command router uses.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from core.config_loader import get_config
from core.intent import IntentMatch
from core.logger import get_logger
from security.permissions import PermissionLevel, is_forbidden, permission_for, requires_confirmation

log = get_logger("command_validator")


@dataclass
class ValidationResult:
    allowed: bool
    needs_confirmation: bool
    level: PermissionLevel
    reason: str = ""


class CommandValidator:
    def __init__(self) -> None:
        self._cfg = get_config()

    def validate(self, intent: IntentMatch) -> ValidationResult:
        level = permission_for(intent.category, intent.raw_text)

        if is_forbidden(level):
            log.warning("Blocked forbidden command: %s", intent.raw_text)
            return ValidationResult(allowed=False, needs_confirmation=False, level=level,
                                     reason="This action is not permitted for safety reasons.")

        if level == PermissionLevel.DESTRUCTIVE and not self._cfg.get("security.require_confirmation_for_destructive", True):
            # Config explicitly disables confirmation gating (not recommended).
            return ValidationResult(allowed=True, needs_confirmation=False, level=level)

        if requires_confirmation(level):
            return ValidationResult(allowed=True, needs_confirmation=True, level=level)

        return ValidationResult(allowed=True, needs_confirmation=False, level=level)

    def is_shell_execution_allowed(self) -> bool:
        return bool(self._cfg.get("security.allow_shell_execution", False))

    def is_shutdown_allowed(self) -> bool:
        return bool(self._cfg.get("security.allow_system_shutdown", False))


_validator: Optional[CommandValidator] = None


def get_command_validator() -> CommandValidator:
    global _validator
    if _validator is None:
        _validator = CommandValidator()
    return _validator
