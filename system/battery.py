"""Battery status (gracefully handles desktops with no battery)."""
from __future__ import annotations

from typing import Dict, Optional

import psutil


def battery_status() -> Optional[Dict[str, object]]:
    battery = psutil.sensors_battery()
    if battery is None:
        return None
    return {
        "percent": battery.percent,
        "plugged_in": battery.power_plugged,
        "secs_left": battery.secsleft if battery.secsleft not in (psutil.POWER_TIME_UNLIMITED, psutil.POWER_TIME_UNKNOWN) else None,
    }
