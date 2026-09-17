"""Mouse automation via pyautogui."""
from __future__ import annotations

from core.logger import get_logger

log = get_logger("mouse")


def move_to(x: int, y: int, duration: float = 0.2) -> None:
    try:
        import pyautogui
        pyautogui.moveTo(x, y, duration=duration)
    except ImportError:
        log.warning("pyautogui not installed; cannot move mouse")
    except Exception:
        log.exception("Failed to move mouse")


def click(x: int | None = None, y: int | None = None) -> None:
    try:
        import pyautogui
        if x is not None and y is not None:
            pyautogui.click(x, y)
        else:
            pyautogui.click()
    except ImportError:
        log.warning("pyautogui not installed; cannot click")
    except Exception:
        log.exception("Failed to click")
