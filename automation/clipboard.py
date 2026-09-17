"""Clipboard read/write via pyperclip."""
from __future__ import annotations

from typing import Optional

from core.logger import get_logger

log = get_logger("clipboard")


def copy_text(text: str) -> str:
    try:
        import pyperclip
        pyperclip.copy(text)
        return "Copied to clipboard."
    except ImportError:
        log.warning("pyperclip not installed")
        return "Clipboard access isn't available right now."
    except Exception:
        log.exception("Clipboard copy failed")
        return "I couldn't copy that to the clipboard."


def read_clipboard() -> Optional[str]:
    try:
        import pyperclip
        return pyperclip.paste()
    except ImportError:
        log.warning("pyperclip not installed")
        return None
    except Exception:
        log.exception("Clipboard read failed")
        return None
