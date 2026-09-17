"""
Discovers and loads plugins from the plugins/ directory at startup.

A plugin lives in its own subfolder (e.g. plugins/spotify/) with a
`plugin.py` module exposing a `Plugin` class subclassing BasePlugin.
Loading failures are isolated per-plugin so one broken plugin can't
take down the whole assistant.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Callable, Dict, List

from core.logger import get_logger
from plugins.base_plugin import BasePlugin

log = get_logger("plugin_manager")


class PluginManager:
    def __init__(self, plugins_dir: Path | None = None) -> None:
        self._plugins_dir = plugins_dir or Path(__file__).resolve().parent
        self._loaded: List[BasePlugin] = []
        self._command_map: Dict[str, Callable[[str], str]] = {}

    def discover_and_load(self) -> None:
        if not self._plugins_dir.exists():
            return
        for entry in self._plugins_dir.iterdir():
            if not entry.is_dir() or entry.name.startswith("_"):
                continue
            plugin_file = entry / "plugin.py"
            if not plugin_file.exists():
                continue
            self._load_one(entry.name, plugin_file)

    def _load_one(self, plugin_name: str, plugin_file: Path) -> None:
        try:
            spec = importlib.util.spec_from_file_location(f"plugins.{plugin_name}.plugin", plugin_file)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)  # type: ignore

            plugin_cls = getattr(module, "Plugin", None)
            if plugin_cls is None or not issubclass(plugin_cls, BasePlugin):
                log.warning("Plugin '%s' has no valid Plugin class; skipping", plugin_name)
                return

            instance: BasePlugin = plugin_cls()
            instance.initialize()
            for keyword, handler in instance.commands().items():
                self._command_map[keyword.lower()] = handler
            self._loaded.append(instance)
            log.info("Loaded plugin: %s", instance.name)
        except Exception:
            log.exception("Failed to load plugin '%s' — continuing without it", plugin_name)

    def dispatch(self, keyword: str, args: str) -> str | None:
        handler = self._command_map.get(keyword.lower())
        if handler is None:
            return None
        try:
            return handler(args)
        except Exception:
            log.exception("Plugin command '%s' raised an exception", keyword)
            return "That plugin ran into an error."

    def shutdown_all(self) -> None:
        for plugin in self._loaded:
            try:
                plugin.shutdown()
            except Exception:
                log.exception("Plugin '%s' failed to shut down cleanly", plugin.name)

    @property
    def loaded_plugins(self) -> List[BasePlugin]:
        return list(self._loaded)


_manager: "PluginManager | None" = None


def get_plugin_manager() -> PluginManager:
    global _manager
    if _manager is None:
        _manager = PluginManager()
    return _manager
