"""
Permission classification for actions JARVIS can take.

Every action handler must be tagged with a PermissionLevel so the
command router knows whether it can run immediately or needs a
user confirmation first.
"""
from __future__ import annotations

from enum import IntEnum
from typing import Set

from core.intent import IntentCategory


class PermissionLevel(IntEnum):
    SAFE = 0          # read-only or clearly reversible (open known app, read system info)
    SENSITIVE = 1      # user data changes but low risk (create note, set reminder)
    DESTRUCTIVE = 2    # requires explicit confirmation (delete files, shutdown, arbitrary exec)
    FORBIDDEN = 3      # never allowed regardless of confirmation


# Default permission level per intent category. Individual handlers
# may escalate this at runtime (e.g. FILE_OP becomes DESTRUCTIVE only
# when the specific action is a delete).
_DEFAULT_LEVELS = {
    IntentCategory.APP_OPEN: PermissionLevel.SAFE,
    IntentCategory.APP_CLOSE: PermissionLevel.SENSITIVE,
    IntentCategory.WEB_SEARCH: PermissionLevel.SAFE,
    IntentCategory.WEB_OPEN_SITE: PermissionLevel.SAFE,
    IntentCategory.SYSTEM_INFO: PermissionLevel.SAFE,
    IntentCategory.FILE_OP: PermissionLevel.SENSITIVE,
    IntentCategory.TIMER: PermissionLevel.SAFE,
    IntentCategory.REMINDER: PermissionLevel.SAFE,
    IntentCategory.NOTE: PermissionLevel.SAFE,
    IntentCategory.TASK: PermissionLevel.SAFE,
    IntentCategory.CALCULATOR: PermissionLevel.SAFE,
    IntentCategory.WEATHER: PermissionLevel.SAFE,
    IntentCategory.MEDIA_CONTROL: PermissionLevel.SAFE,
    IntentCategory.SCREENSHOT: PermissionLevel.SAFE,
    IntentCategory.CLIPBOARD: PermissionLevel.SAFE,
    IntentCategory.MEMORY_REMEMBER: PermissionLevel.SENSITIVE,
    IntentCategory.MEMORY_RECALL: PermissionLevel.SAFE,
    IntentCategory.MEMORY_FORGET: PermissionLevel.SENSITIVE,
    IntentCategory.SYSTEM_POWER: PermissionLevel.DESTRUCTIVE,
    IntentCategory.CONVERSATION: PermissionLevel.SAFE,
}

# Keywords that, if present in a FILE_OP or free-form command, force
# escalation to DESTRUCTIVE regardless of the base intent category.
_DESTRUCTIVE_KEYWORDS: Set[str] = {
    "delete", "remove", "erase", "wipe", "format", "overwrite",
    "shutdown", "shut down", "restart", "reboot",
    "uninstall", "install",
}

# Anything matching these is never executed, even with confirmation.
_FORBIDDEN_KEYWORDS: Set[str] = {
    "rm -rf", "del /f /s /q", "format c:", "diskpart",
}


def permission_for(category: IntentCategory, raw_text: str = "") -> PermissionLevel:
    """Resolve the effective permission level for an intent + its raw text."""
    text_lower = raw_text.lower()

    for phrase in _FORBIDDEN_KEYWORDS:
        if phrase in text_lower:
            return PermissionLevel.FORBIDDEN

    base = _DEFAULT_LEVELS.get(category, PermissionLevel.SENSITIVE)

    for word in _DESTRUCTIVE_KEYWORDS:
        if word in text_lower:
            return PermissionLevel.DESTRUCTIVE

    return base


def requires_confirmation(level: PermissionLevel) -> bool:
    return level >= PermissionLevel.DESTRUCTIVE


def is_forbidden(level: PermissionLevel) -> bool:
    return level == PermissionLevel.FORBIDDEN
