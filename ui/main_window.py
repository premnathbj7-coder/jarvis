"""
Main JARVIS application window: dark HUD-styled layout with the
animated Orb centered, conversation panel, status strip, and mic/
settings controls.
"""
from __future__ import annotations

import threading

from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtWidgets import (
    QHBoxLayout, QLabel, QMainWindow, QPushButton, QVBoxLayout, QWidget,
)

from core.assistant import Assistant
from core.config_loader import get_config
from core.events import Events, get_event_bus
from core.logger import get_logger
from orb.orb_engine import OrbWidget
from ui.chat_panel import ChatPanel
from ui.notifications import show_toast
from ui.settings import SettingsDialog
from ui.status_panel import StatusPanel

log = get_logger("main_window")

_DARK_STYLESHEET = """
QMainWindow { background-color: #0a0f16; }
QWidget { background-color: transparent; color: #d6f0ff; font-family: 'Segoe UI', sans-serif; }
#titleLabel { font-size: 22px; font-weight: 600; letter-spacing: 6px; color: #00d4ff; }
#stateLabel { font-size: 12px; letter-spacing: 3px; color: #7fd8ff; padding: 4px; }
#statLabel { font-size: 11px; color: #6fa8c9; padding: 2px 10px; }
#chatHistory {
    background-color: rgba(15, 25, 35, 160);
    border: 1px solid #123047;
    border-radius: 10px;
    padding: 10px;
    font-size: 13px;
}
QLineEdit {
    background-color: rgba(15, 25, 35, 200);
    border: 1px solid #1c4a63;
    border-radius: 8px;
    padding: 8px;
    color: #e6f7ff;
}
QPushButton {
    background-color: rgba(0, 212, 255, 30);
    border: 1px solid #00d4ff;
    border-radius: 8px;
    padding: 8px 16px;
    color: #00d4ff;
}
QPushButton:hover { background-color: rgba(0, 212, 255, 60); }
"""


class _AssistantWorker(QThread):
    """Runs a blocking assistant call off the UI thread."""
    finished_with_result = Signal(str, str)  # (kind, response_text)

    def __init__(self, fn, kind: str, *args) -> None:
        super().__init__()
        self._fn = fn
        self._args = args
        self._kind = kind

    def run(self) -> None:
        try:
            result = self._fn(*self._args)
        except Exception:
            log.exception("Assistant worker failed")
            result = "I ran into an unexpected error."
        self.finished_with_result.emit(self._kind, result or "")


class MainWindow(QMainWindow):
    def __init__(self, assistant: Assistant) -> None:
        super().__init__()
        self._assistant = assistant
        self._cfg = get_config()
        self._workers = []  # keep references so threads aren't garbage-collected mid-run

        self.setWindowTitle("J.A.R.V.I.S.")
        self.resize(int(self._cfg.get("ui.window_width", 900)), int(self._cfg.get("ui.window_height", 640)))
        if self._cfg.get("ui.always_on_top", False):
            self.setWindowFlag(Qt.WindowStaysOnTopHint, True)
        self.setStyleSheet(_DARK_STYLESHEET)

        self._build_ui()

        # Subscribe so voice-triggered turns (which bypass the UI thread's
        # worker callbacks) still appear in the chat log.
        bus = get_event_bus()
        bus.subscribe(Events.USER_UTTERANCE, lambda text: self.chat_panel.append_user(text))
        bus.subscribe(Events.AI_RESPONSE, lambda text: self.chat_panel.append_assistant(text))

    def _build_ui(self) -> None:
        central = QWidget()
        root = QVBoxLayout(central)
        root.setContentsMargins(24, 16, 24, 16)
        root.setSpacing(10)

        title = QLabel("J  A  R  V  I  S")
        title.setObjectName("titleLabel")
        title.setAlignment(Qt.AlignCenter)
        root.addWidget(title)

        self.orb = OrbWidget()
        orb_row = QHBoxLayout()
        orb_row.addStretch()
        orb_row.addWidget(self.orb)
        orb_row.addStretch()
        root.addLayout(orb_row, stretch=2)

        self.status_panel = StatusPanel()
        root.addWidget(self.status_panel)

        self.chat_panel = ChatPanel()
        self.chat_panel.message_submitted.connect(self._on_message_submitted)
        root.addWidget(self.chat_panel, stretch=3)

        controls_row = QHBoxLayout()
        self.mic_button = QPushButton("🎙  MICROPHONE")
        self.mic_button.clicked.connect(self._on_mic_clicked)
        controls_row.addWidget(self.mic_button)

        self.settings_button = QPushButton("⚙  SETTINGS")
        self.settings_button.clicked.connect(self._on_settings_clicked)
        controls_row.addWidget(self.settings_button)
        root.addLayout(controls_row)

        self.setCentralWidget(central)

    # ---- interaction handlers ----
    def _on_message_submitted(self, text: str) -> None:
        # Chat log entries are appended via the USER_UTTERANCE/AI_RESPONSE
        # event subscriptions above, so both typed and voice input render
        # through the same path.
        worker = _AssistantWorker(self._assistant.handle_text, "text", text)
        worker.finished_with_result.connect(self._on_worker_result)
        self._workers.append(worker)
        worker.start()

    def _on_mic_clicked(self) -> None:
        if not self._assistant._audio or not self._assistant._audio.voice_available:
            show_toast(self, "Voice input isn't available on this system.")
            return
        worker = _AssistantWorker(self._listen_and_handle, "voice")
        worker.finished_with_result.connect(self._on_worker_result)
        self._workers.append(worker)
        worker.start()

    def _listen_and_handle(self) -> str:
        text = self._assistant.listen_once()
        return text or ""

    def _on_worker_result(self, kind: str, result: str) -> None:
        # Response text is already rendered via event subscriptions;
        # this just lets us clean up finished worker threads.
        self._workers = [w for w in self._workers if w.isRunning()]

    def _on_settings_clicked(self) -> None:
        dialog = SettingsDialog(self)
        dialog.exec()

    def closeEvent(self, event) -> None:  # noqa: N802
        self._assistant.shutdown()
        super().closeEvent(event)
