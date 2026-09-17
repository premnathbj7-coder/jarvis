"""
Application registry + safe launch/close.

Applications are configured in config.yaml under `applications:` —
never hard-coded, per the project's registry principle. Discovery
attempts a PATH lookup before reporting "not installed".
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from typing import Dict, Optional

from core.config_loader import get_config
from core.logger import get_logger
from system.processes import is_process_running

log = get_logger("applications")


class ApplicationRegistry:
    def __init__(self) -> None:
        self._cfg = get_config()

    def _registry(self) -> Dict[str, str]:
        return {k.lower(): v for k, v in (self._cfg.get("applications", {}) or {}).items()}

    def resolve(self, name: str) -> Optional[str]:
        """Resolve a friendly app name to its executable/command, fuzzy-matching."""
        reg = self._registry()
        name_l = name.strip().lower()
        if name_l in reg:
            return reg[name_l]
        # loose match e.g. "vs code" -> "vscode"
        for key, exe in reg.items():
            if key in name_l or name_l in key:
                return exe
        return None

    def is_installed(self, executable: str) -> bool:
        if executable.startswith("ms-settings:") or executable.endswith(":"):
            return True  # Windows URI scheme, always "available" on Windows
        return shutil.which(executable) is not None

    def open(self, name: str) -> str:
        executable = self.resolve(name)
        if not executable:
            log.info("App not found in registry: %s", name)
            return f"I don't have '{name}' registered as an application. You can add it to config.yaml."

        if sys.platform != "win32":
            log.warning("Application launch requested on non-Windows platform")
            return "Application launching is only supported on Windows."

        if not self.is_installed(executable):
            log.info("App not installed: %s (%s)", name, executable)
            return f"That application does not appear to be installed."

        try:
            if executable.startswith("ms-settings:") or ":" in executable and not executable.endswith(".exe"):
                subprocess.Popen(["cmd", "/c", "start", "", executable], shell=False)
            else:
                subprocess.Popen([executable])
            log.info("Launched application: %s (%s)", name, executable)
            return f"Certainly. Opening {name.title()}."
        except FileNotFoundError:
            return f"I couldn't find {name} on this system."
        except Exception:
            log.exception("Failed to launch %s", name)
            return f"Something went wrong trying to open {name}."

    def close(self, name: str) -> str:
        executable = self.resolve(name)
        proc_name = executable or name

        if sys.platform != "win32":
            return "Application control is only supported on Windows."

        try:
            base = proc_name.split("\\")[-1]
            if not base.endswith(".exe"):
                return f"I can only close applications I recognize by their executable name."
            if not is_process_running(base):
                return f"{name.title()} doesn't appear to be running."
            subprocess.run(["taskkill", "/IM", base, "/F"], check=False, capture_output=True)
            log.info("Closed application: %s", name)
            return f"Closed {name.title()}."
        except Exception:
            log.exception("Failed to close %s", name)
            return f"I ran into a problem trying to close {name}."


_registry: "ApplicationRegistry | None" = None


def get_application_registry() -> ApplicationRegistry:
    global _registry
    if _registry is None:
        _registry = ApplicationRegistry()
    return _registry
