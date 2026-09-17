"""
Aggregated system info facade + natural-language summaries, used
directly by the command router for SYSTEM_INFO intents.
"""
from __future__ import annotations

import platform
from typing import Dict

from core.logger import get_logger
from system import battery as battery_mod
from system import cpu as cpu_mod
from system import memory as memory_mod
from system import network as network_mod
from system import storage as storage_mod

log = get_logger("system_info")


def full_snapshot() -> Dict[str, object]:
    return {
        "os": f"{platform.system()} {platform.release()}",
        "cpu": cpu_mod.cpu_info(),
        "memory": memory_mod.memory_usage(),
        "battery": battery_mod.battery_status(),
        "storage": storage_mod.storage_usage("C:\\" if platform.system() == "Windows" else "/"),
        "network": network_mod.network_status(),
    }


def describe(topic: str) -> str:
    """Return a natural-language answer for a system info request like 'cpu' or 'battery'."""
    topic = topic.lower()
    try:
        if "cpu" in topic:
            info = cpu_mod.cpu_info()
            return f"Your CPU is currently operating at approximately {info['usage_percent']:.0f} percent across {info['logical_cores']} logical cores."
        if "ram" in topic or "memory" in topic:
            info = memory_mod.memory_usage()
            return f"Memory usage is at {info['percent']:.0f} percent — {info['used_gb']} of {info['total_gb']} gigabytes in use."
        if "battery" in topic:
            info = battery_mod.battery_status()
            if info is None:
                return "This system does not report a battery — it appears to be on a fixed power supply."
            state = "charging" if info["plugged_in"] else "on battery power"
            return f"Battery is at {info['percent']:.0f} percent and currently {state}."
        if "disk" in topic or "storage" in topic:
            info = storage_mod.storage_usage("C:\\" if platform.system() == "Windows" else "/")
            return f"Storage is at {info['percent']:.0f} percent used — {info['free_gb']} gigabytes free of {info['total_gb']}."
        if "network" in topic:
            info = network_mod.network_status()
            return "You're connected to the network." if info["connected"] else "No active network connection detected."
    except Exception:
        log.exception("Failed to gather system info for topic '%s'", topic)
        return "I wasn't able to retrieve that system information right now."

    snap = full_snapshot()
    return (
        f"CPU at {snap['cpu']['usage_percent']:.0f} percent, "
        f"memory at {snap['memory']['percent']:.0f} percent, "
        f"storage at {snap['storage']['percent']:.0f} percent used."
    )
