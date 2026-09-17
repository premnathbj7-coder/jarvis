"""
Lightweight rule-based intent detection.

JARVIS does not need a heavy NLU model for most commands — a fast
pattern-based classifier handles deterministic commands (open app,
system info, timers, etc.) and falls back to the AI provider for
open-ended conversation. This keeps latency and CPU usage low.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Pattern, Tuple


class IntentCategory(str, Enum):
    APP_OPEN = "APP_OPEN"
    APP_CLOSE = "APP_CLOSE"
    WEB_SEARCH = "WEB_SEARCH"
    WEB_OPEN_SITE = "WEB_OPEN_SITE"
    SYSTEM_INFO = "SYSTEM_INFO"
    FILE_OP = "FILE_OP"
    TIMER = "TIMER"
    REMINDER = "REMINDER"
    NOTE = "NOTE"
    TASK = "TASK"
    CALCULATOR = "CALCULATOR"
    WEATHER = "WEATHER"
    MEDIA_CONTROL = "MEDIA_CONTROL"
    SCREENSHOT = "SCREENSHOT"
    CLIPBOARD = "CLIPBOARD"
    MEMORY_REMEMBER = "MEMORY_REMEMBER"
    MEMORY_RECALL = "MEMORY_RECALL"
    MEMORY_FORGET = "MEMORY_FORGET"
    SYSTEM_POWER = "SYSTEM_POWER"           # shutdown/restart - always confirmed
    CONFIRMATION_YES = "CONFIRMATION_YES"
    CONFIRMATION_NO = "CONFIRMATION_NO"
    CONVERSATION = "CONVERSATION"           # falls through to AI


@dataclass
class IntentMatch:
    category: IntentCategory
    confidence: float
    slots: Dict[str, str] = field(default_factory=dict)
    raw_text: str = ""


@dataclass
class _Rule:
    category: IntentCategory
    pattern: Pattern
    slot_names: Tuple[str, ...] = ()


def _rule(category: IntentCategory, regex: str, slot_names: Tuple[str, ...] = ()) -> _Rule:
    return _Rule(category=category, pattern=re.compile(regex, re.IGNORECASE), slot_names=slot_names)


_RULES: List[_Rule] = [
    _rule(IntentCategory.CONFIRMATION_YES, r"^\s*(yes|yeah|yep|confirm|go ahead|do it|proceed)\s*[.!]?\s*$"),
    _rule(IntentCategory.CONFIRMATION_NO, r"^\s*(no|nope|cancel|stop|don'?t|never ?mind)\s*[.!]?\s*$"),

    _rule(IntentCategory.SYSTEM_POWER, r"\b(shut ?down|restart|reboot)\b.*\b(computer|pc|system|laptop)?\b"),

    _rule(IntentCategory.APP_CLOSE, r"\bclose\s+(?P<app>.+)$", ("app",)),
    _rule(IntentCategory.APP_OPEN, r"\b(open|launch|start)\s+(?P<app>.+)$", ("app",)),

    _rule(IntentCategory.SCREENSHOT, r"\b(take|grab)?\s*a?\s*screenshot\b"),
    _rule(IntentCategory.CLIPBOARD, r"\b(copy|clipboard|paste)\b"),

    _rule(IntentCategory.WEATHER, r"\bweather\b.*(?:\bin\s+(?P<location>.+))?$", ("location",)),

    _rule(IntentCategory.CALCULATOR, r"\bwhat(?:'s| is)\s+(?P<expr>[\d\s\.\+\-\*/\(\)%]+)\??$", ("expr",)),
    _rule(IntentCategory.CALCULATOR, r"\bcalculate\s+(?P<expr>.+)$", ("expr",)),

    _rule(IntentCategory.TIMER, r"\bset\s+a\s+(?P<duration>[\w\s]+?)\s+timer\b", ("duration",)),
    _rule(IntentCategory.TIMER, r"\btimer\s+for\s+(?P<duration>[\w\s]+)$", ("duration",)),

    _rule(IntentCategory.REMINDER, r"\bremind me to\s+(?P<task>.+?)\s+at\s+(?P<time>.+)$", ("task", "time")),
    _rule(IntentCategory.REMINDER, r"\bremind me to\s+(?P<task>.+)$", ("task",)),

    _rule(IntentCategory.NOTE, r"\bcreate\s+a?\s*note\s+(?:called\s+)?(?P<title>.+)$", ("title",)),
    _rule(IntentCategory.NOTE, r"\bnote\s+that\s+(?P<content>.+)$", ("content",)),

    _rule(IntentCategory.TASK, r"\badd\s+(?P<task>.+?)\s+to\s+(?:my\s+)?tasks?$", ("task",)),

    _rule(IntentCategory.MEMORY_REMEMBER, r"\bremember\s+that\s+(?P<fact>.+)$", ("fact",)),
    _rule(IntentCategory.MEMORY_RECALL, r"\bwhat\s+do\s+you\s+remember\s*(?:about\s+(?P<topic>.+))?$", ("topic",)),
    _rule(IntentCategory.MEMORY_FORGET, r"\bforget\s+(?:that\s+)?(?P<fact>.+)$", ("fact",)),

    _rule(IntentCategory.MEDIA_CONTROL, r"\b(play|pause|skip|next track|previous track|volume up|volume down|mute)\b"),

    _rule(IntentCategory.SYSTEM_INFO, r"\b(cpu|ram|memory|battery|disk|storage|network)\s*(usage|status|info)?\b"),

    _rule(IntentCategory.FILE_OP, r"\b(open|show)\s+(my\s+)?(downloads|documents|desktop)\b"),
    _rule(IntentCategory.FILE_OP, r"\bcreate\s+a?\s*folder\s+(?:called\s+)?(?P<name>.+)$", ("name",)),
    _rule(IntentCategory.FILE_OP, r"\bfind\s+my\s+(?P<filetype>\w+)\s+files\b", ("filetype",)),

    _rule(IntentCategory.WEB_OPEN_SITE, r"\bopen\s+(youtube|github|gmail|google)\b"),
    _rule(IntentCategory.WEB_SEARCH, r"\bsearch\s+(?:the\s+web\s+)?for\s+(?P<query>.+)$", ("query",)),
    _rule(IntentCategory.WEB_SEARCH, r"\bgoogle\s+(?P<query>.+)$", ("query",)),
]


def detect_intent(text: str) -> IntentMatch:
    """
    Classify free text into an intent category with extracted slots.
    Falls back to CONVERSATION (handled by the AI provider) if nothing matches.
    """
    cleaned = text.strip()
    for rule in _RULES:
        m = rule.pattern.search(cleaned)
        if m:
            slots = {name: (m.group(name) or "").strip() for name in rule.slot_names if name in m.groupdict()}
            return IntentMatch(category=rule.category, confidence=0.9, slots=slots, raw_text=cleaned)
    return IntentMatch(category=IntentCategory.CONVERSATION, confidence=0.4, slots={}, raw_text=cleaned)
