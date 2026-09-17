"""
Media/volume control using virtual keypresses (works with most Windows
media players and system volume without needing player-specific APIs).
"""
from __future__ import annotations

from core.logger import get_logger

log = get_logger("media")

_KEY_MAP = {
    "play": "playpause",
    "pause": "playpause",
    "next track": "nexttrack",
    "skip": "nexttrack",
    "previous track": "prevtrack",
    "volume up": "volumeup",
    "volume down": "volumedown",
    "mute": "volumemute",
}


def control(command: str) -> str:
    key = _KEY_MAP.get(command.lower().strip())
    if not key:
        return "I don't recognize that media command."
    try:
        import pyautogui
        pyautogui.press(key)
        return f"Done — {command}."
    except ImportError:
        log.warning("pyautogui not installed; cannot control media")
        return "Media control isn't available right now."
    except Exception:
        log.exception("Media control failed for %s", command)
        return "I couldn't complete that media command."
