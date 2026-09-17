"""Scrollable conversation display + text input row."""
from __future__ import annotations

from PySide6.QtCore import Signal
from PySide6.QtWidgets import (
    QHBoxLayout, QLineEdit, QPushButton, QTextEdit, QVBoxLayout, QWidget,
)


class ChatPanel(QWidget):
    message_submitted = Signal(str)

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)

        self.history = QTextEdit()
        self.history.setReadOnly(True)
        self.history.setObjectName("chatHistory")
        layout.addWidget(self.history)

        input_row = QHBoxLayout()
        self.input_line = QLineEdit()
        self.input_line.setPlaceholderText("Type a command or question…")
        self.input_line.returnPressed.connect(self._on_submit)
        input_row.addWidget(self.input_line)

        self.send_button = QPushButton("Send")
        self.send_button.clicked.connect(self._on_submit)
        input_row.addWidget(self.send_button)

        layout.addLayout(input_row)

    def _on_submit(self) -> None:
        text = self.input_line.text().strip()
        if not text:
            return
        self.input_line.clear()
        self.message_submitted.emit(text)

    def append_user(self, text: str) -> None:
        self.history.append(f'<div style="color:#8fd6ff;"><b>You:</b> {_escape(text)}</div>')

    def append_assistant(self, text: str) -> None:
        self.history.append(f'<div style="color:#e6f7ff; margin-bottom:8px;"><b>JARVIS:</b> {_escape(text)}</div>')


def _escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
