"""Base class every plugin must subclass."""
from __future__ import annotations

import abc
from typing import Callable, Dict, List

from security.permissions import PermissionLevel


class BasePlugin(abc.ABC):
    """
    Subclass this to add a new JARVIS capability without touching core code.

    Example:
        class WeatherPlugin(BasePlugin):
            name = "weather"
            description = "Look up current weather conditions."

            def commands(self):
                return {"weather": self.handle_weather}

            def handle_weather(self, args: str) -> str:
                ...
    """

    name: str = "unnamed_plugin"
    description: str = ""
    permission_level: PermissionLevel = PermissionLevel.SAFE

    def initialize(self) -> None:
        """Called once when the plugin is loaded. Override for setup."""
        return None

    def shutdown(self) -> None:
        """Called once when JARVIS is shutting down. Override for cleanup."""
        return None

    @abc.abstractmethod
    def commands(self) -> Dict[str, Callable[[str], str]]:
        """Return a mapping of command keyword -> handler(args_text) -> response_text."""
        raise NotImplementedError
