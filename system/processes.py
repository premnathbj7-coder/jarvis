"""Running process introspection."""
from __future__ import annotations

from typing import Dict, List

import psutil


def top_processes(limit: int = 5) -> List[Dict[str, object]]:
    procs = []
    for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
        try:
            procs.append(p.info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    procs.sort(key=lambda x: x.get("cpu_percent") or 0, reverse=True)
    return procs[:limit]


def is_process_running(name: str) -> bool:
    name_lower = name.lower()
    for p in psutil.process_iter(["name"]):
        try:
            if p.info["name"] and name_lower in p.info["name"].lower():
                return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return False
