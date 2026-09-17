"""
Centralized configuration loader.

Merges config.yaml (non-secret settings) with .env (secrets).
Every other module should pull settings from here rather than
reading files directly.
"""
from __future__ import annotations

import os
import copy
import threading
from pathlib import Path
from typing import Any, Dict, Optional

import yaml
from dotenv import load_dotenv

_PROJECT_ROOT = Path(__file__).resolve().parent.parent


class ConfigError(Exception):
    """Raised when configuration cannot be loaded or is invalid."""


class Config:
    """
    Thread-safe singleton wrapper around config.yaml + environment secrets.

    Usage:
        from core.config_loader import get_config
        cfg = get_config()
        cfg.get("voice.tts_rate", default=180)
        cfg.get_secret("AI_API_KEY")
    """

    _instance: Optional["Config"] = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, config_path: Optional[str] = None, env_path: Optional[str] = None):
        if self._initialized:
            return
        self._initialized = True
        self._data: Dict[str, Any] = {}
        self._config_path = Path(config_path) if config_path else _PROJECT_ROOT / "config.yaml"
        self._env_path = Path(env_path) if env_path else _PROJECT_ROOT / ".env"
        self.reload()

    def reload(self) -> None:
        """Reload config.yaml and .env from disk. Safe to call at runtime."""
        # Load secrets first so they're available even if yaml is missing.
        if self._env_path.exists():
            load_dotenv(dotenv_path=self._env_path, override=True)

        if not self._config_path.exists():
            raise ConfigError(f"config.yaml not found at {self._config_path}")

        try:
            with open(self._config_path, "r", encoding="utf-8") as f:
                self._data = yaml.safe_load(f) or {}
        except yaml.YAMLError as e:
            raise ConfigError(f"Failed to parse config.yaml: {e}") from e

    def get(self, dotted_key: str, default: Any = None) -> Any:
        """Fetch a nested value using dot notation, e.g. 'voice.tts_rate'."""
        node = self._data
        for part in dotted_key.split("."):
            if isinstance(node, dict) and part in node:
                node = node[part]
            else:
                return default
        return node

    def set(self, dotted_key: str, value: Any) -> None:
        """Set a nested value at runtime (in-memory only, not persisted)."""
        parts = dotted_key.split(".")
        node = self._data
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = value

    def get_secret(self, env_var: str, default: Optional[str] = None) -> Optional[str]:
        """Fetch a secret from environment variables (never from yaml)."""
        return os.environ.get(env_var, default)

    def as_dict(self) -> Dict[str, Any]:
        """Return a deep copy of the full non-secret config tree."""
        return copy.deepcopy(self._data)

    @property
    def project_root(self) -> Path:
        return _PROJECT_ROOT

    def data_path(self, relative: str) -> Path:
        """Resolve a path relative to the project root, creating parent dirs."""
        p = _PROJECT_ROOT / relative
        p.parent.mkdir(parents=True, exist_ok=True)
        return p


def get_config() -> Config:
    """Return the process-wide Config singleton."""
    return Config()
