"""CPU usage and info."""
from __future__ import annotations

from typing import Dict

import psutil


def cpu_usage_percent(interval: float = 0.3) -> float:
    return psutil.cpu_percent(interval=interval)


def cpu_info() -> Dict[str, object]:
    freq = psutil.cpu_freq()
    return {
        "physical_cores": psutil.cpu_count(logical=False),
        "logical_cores": psutil.cpu_count(logical=True),
        "current_freq_mhz": round(freq.current, 0) if freq else None,
        "usage_percent": cpu_usage_percent(),
    }
