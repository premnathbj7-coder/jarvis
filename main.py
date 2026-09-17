#!/usr/bin/env python3
"""
JARVIS entry point.

Boots the Assistant facade (which wires up config, logging, voice,
memory, plugins) and launches the PySide6 UI. Falls back to a
text-only console loop if PySide6 isn't available, so the assistant
is still usable on a fresh checkout before dependencies are fully
installed.
"""
from __future__ import annotations

import sys

from core.assistant import Assistant
from core.logger import get_logger, setup_logging

setup_logging()
log = get_logger("main")


def run_gui() -> int:
    from PySide6.QtWidgets import QApplication
    from ui.main_window import MainWindow

    app = QApplication(sys.argv)
    assistant = Assistant()
    window = MainWindow(assistant)
    window.show()

    greeting = assistant.startup()
    window.chat_panel.append_assistant(greeting)

    return app.exec()


def run_console() -> int:
    print("=" * 60)
    print(" J.A.R.V.I.S. — console mode (PySide6 not available)")
    print("=" * 60)
    assistant = Assistant()
    greeting = assistant.startup()
    print(f"JARVIS: {greeting}")
    try:
        while True:
            text = input("You: ").strip()
            if text.lower() in ("exit", "quit"):
                break
            if not text:
                continue
            response = assistant.handle_text(text)
            print(f"JARVIS: {response}")
    except (KeyboardInterrupt, EOFError):
        pass
    finally:
        assistant.shutdown()
    return 0


def main() -> int:
    try:
        return run_gui()
    except ImportError:
        log.warning("PySide6 not installed; falling back to console mode")
        return run_console()
    except Exception:
        log.exception("Fatal error during startup")
        print("JARVIS failed to start. Check data/logs/jarvis.log for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
