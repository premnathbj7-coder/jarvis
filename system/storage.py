"""Disk / storage usage."""
from __future__ import annotations

from typing import Dict, List

import psutil


def storage_usage(path: str = "/") -> Dict[str, object]:
    usage = psutil.disk_usage(path)
    return {
        "total_gb": round(usage.total / (1024 ** 3), 1),
        "used_gb": round(usage.used / (1024 ** 3), 1),
        "free_gb": round(usage.free / (1024 ** 3), 1),
        "percent": usage.percent,
    }


def all_partitions() -> List[Dict[str, object]]:
    results = []
    for part in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(part.mountpoint)
            results.append({
                "device": part.device,
                "mountpoint": part.mountpoint,
                "total_gb": round(usage.total / (1024 ** 3), 1),
                "percent": usage.percent,
            })
        except (PermissionError, OSError):
            continue
    return results
