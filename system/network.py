"""Network status."""
from __future__ import annotations

from typing import Dict

import psutil


def network_status() -> Dict[str, object]:
    stats = psutil.net_if_stats()
    counters = psutil.net_io_counters()
    connected = any(s.isup for s in stats.values())
    return {
        "connected": connected,
        "bytes_sent": counters.bytes_sent,
        "bytes_recv": counters.bytes_recv,
        "interfaces_up": [name for name, s in stats.items() if s.isup],
    }


def is_internet_available(timeout: float = 2.0) -> bool:
    import socket
    try:
        socket.setdefaulttimeout(timeout)
        socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect(("8.8.8.8", 53))
        return True
    except OSError:
        return False
