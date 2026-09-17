#!/usr/bin/env python3
"""
Convenience launcher: verifies the virtual environment / dependencies
look sane before handing off to main.py, and prints a friendlier
error than a raw traceback if something critical is missing.
"""
from __future__ import annotations

import sys
from pathlib import Path

_REQUIRED_CORE_PACKAGES = ["yaml", "dotenv", "psutil"]


def check_dependencies() -> list[str]:
    missing = []
    for pkg in _REQUIRED_CORE_PACKAGES:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    return missing


def main() -> int:
    project_root = Path(__file__).resolve().parent
    sys.path.insert(0, str(project_root))

    missing = check_dependencies()
    if missing:
        print("JARVIS cannot start — missing required packages:", ", ".join(missing))
        print("Run scripts\\install.bat (or `pip install -r requirements.txt`) first.")
        return 1

    if not (project_root / ".env").exists():
        print("Note: no .env file found. Copy .env.example to .env and add your API key")
        print("for full AI reasoning — JARVIS will still start in limited offline mode.")

    from main import main as jarvis_main
    return jarvis_main()


if __name__ == "__main__":
    sys.exit(main())
