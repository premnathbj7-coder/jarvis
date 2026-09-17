"""
Professional logging setup for JARVIS.

- Rotating file logs under data/logs/
- Console output for development
- Automatically redacts common secret patterns (API keys) if they
  somehow end up in a log message.
"""
from __future__ import annotations

import logging
import re
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional

from core.config_loader import get_config

_SECRET_PATTERN = re.compile(
    r"(api[_-]?key\s*[:=]\s*)([^\s\"']{6,})", re.IGNORECASE
)

_configured = False


class RedactingFormatter(logging.Formatter):
    """Formatter that scrubs likely API keys/secrets from log lines."""

    def format(self, record: logging.LogRecord) -> str:
        msg = super().format(record)
        return _SECRET_PATTERN.sub(r"\1[REDACTED]", msg)


def setup_logging() -> None:
    """Idempotently configure the root JARVIS logger. Call once at startup."""
    global _configured
    if _configured:
        return

    cfg = get_config()
    level_name = cfg.get("logging.level", "INFO")
    log_dir = cfg.data_path(cfg.get("logging.log_dir", "data/logs"))
    log_dir_path = Path(log_dir)
    log_dir_path.mkdir(parents=True, exist_ok=True)

    max_bytes = int(cfg.get("logging.max_log_size_mb", 5)) * 1024 * 1024
    backup_count = int(cfg.get("logging.backup_count", 3))

    root = logging.getLogger("jarvis")
    root.setLevel(getattr(logging, str(level_name).upper(), logging.INFO))
    root.handlers.clear()

    fmt = RedactingFormatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_handler = RotatingFileHandler(
        log_dir_path / "jarvis.log",
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    file_handler.setFormatter(fmt)
    root.addHandler(file_handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(fmt)
    root.addHandler(console_handler)

    root.propagate = False
    _configured = True


def get_logger(name: str) -> logging.Logger:
    """Get a named logger under the 'jarvis' namespace. Ensures setup has run."""
    if not _configured:
        setup_logging()
    return logging.getLogger(f"jarvis.{name}")
