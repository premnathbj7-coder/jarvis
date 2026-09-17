"""Screenshot capture, saved under data/cache/screenshots/."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

from core.config_loader import get_config
from core.logger import get_logger

log = get_logger("screenshot")


def take_screenshot() -> str:
    try:
        import pyautogui
        cfg = get_config()
        out_dir = cfg.data_path("data/screenshots")
        out_dir.mkdir(parents=True, exist_ok=True)
        filename = out_dir / f"screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        img = pyautogui.screenshot()
        img.save(str(filename))
        log.info("Screenshot saved: %s", filename)
        return f"Screenshot successfully saved to: {filename.resolve()}"
    except ImportError:
        log.warning("pyautogui not installed; cannot take screenshot")
        return "Screenshot capture isn't available right now."
    except Exception:
        log.exception("Screenshot capture failed")
        return "I couldn't take a screenshot."
