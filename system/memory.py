"""RAM usage."""
from __future__ import annotations

from typing import Dict

import psutil


def memory_usage() -> Dict[str, object]:
    vm = psutil.virtual_memory()
    return {
        "total_gb": round(vm.total / (1024 ** 3), 1),
        "used_gb": round(vm.used / (1024 ** 3), 1),
        "available_gb": round(vm.available / (1024 ** 3), 1),
        "percent": vm.percent,
    }
