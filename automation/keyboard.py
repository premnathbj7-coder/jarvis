"""Keyboard automation via pyautogui, used sparingly and only for safe, explicit actions."""
from __future__ import annotations

from core.logger import get_logger

log = get_logger("keyboard")


def type_text(text: str) -> None:
    try:
        import pyautogui
        pyautogui.write(text, interval=0.01)
    except ImportError:
        log.warning("pyautogui not installed; cannot simulate typing")
    except Exception:
        log.exception("Failed to type text")


def press_hotkey(*keys: str) -> None:
    try:
        import pyautogui
        pyautogui.hotkey(*keys)
    except ImportError:
        log.warning("pyautogui not installed; cannot simulate hotkey")
    except Exception:
        log.exception("Failed to press hotkey %s", keys)
