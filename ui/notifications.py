"""Lightweight in-app toast notifications (no external notifier dependency)."""
from __future__ import annotations

from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import QLabel, QWidget


class Toast(QLabel):
    def __init__(self, parent: QWidget, text: str, duration_ms: int = 3500) -> None:
        super().__init__(text, parent)
        self.setStyleSheet(
            "background-color: rgba(20, 30, 40, 220); color: #00d4ff; "
            "border: 1px solid #00d4ff; border-radius: 8px; padding: 10px 16px; "
            "font-size: 13px;"
        )
        self.setAlignment(Qt.AlignCenter)
        self.adjustSize()
        self._position(parent)
        self.show()
        QTimer.singleShot(duration_ms, self.close)

    def _position(self, parent: QWidget) -> None:
        x = (parent.width() - self.width()) // 2
        y = parent.height() - self.height() - 30
        self.move(max(0, x), max(0, y))


def show_toast(parent: QWidget, text: str) -> None:
    Toast(parent, text)
