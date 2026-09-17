"""Normalizes provider responses into a single internal shape."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class AIResponse:
    text: str
    success: bool = True
    error: Optional[str] = None
    raw: Optional[Dict[str, Any]] = None
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)

    @classmethod
    def failure(cls, message: str) -> "AIResponse":
        return cls(text=message, success=False, error=message)
