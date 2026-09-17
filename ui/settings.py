"""Settings dialog for runtime-adjustable configuration."""
from __future__ import annotations

from PySide6.QtWidgets import (
    QCheckBox, QDialog, QDialogButtonBox, QDoubleSpinBox, QFormLayout, QLineEdit,
)

from core.config_loader import get_config


class SettingsDialog(QDialog):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setWindowTitle("JARVIS Settings")
        self._cfg = get_config()

        layout = QFormLayout(self)

        self.wake_word_input = QLineEdit(str(self._cfg.get("assistant.wake_word", "hey jarvis")))
        layout.addRow("Wake word:", self.wake_word_input)

        self.wake_enabled = QCheckBox()
        self.wake_enabled.setChecked(bool(self._cfg.get("assistant.wake_word_enabled", True)))
        layout.addRow("Wake word enabled:", self.wake_enabled)

        self.tts_volume = QDoubleSpinBox()
        self.tts_volume.setRange(0.0, 1.0)
        self.tts_volume.setSingleStep(0.1)
        self.tts_volume.setValue(float(self._cfg.get("voice.tts_volume", 1.0)))
        layout.addRow("Voice volume:", self.tts_volume)

        self.always_on_top = QCheckBox()
        self.always_on_top.setChecked(bool(self._cfg.get("ui.always_on_top", False)))
        layout.addRow("Always on top:", self.always_on_top)

        buttons = QDialogButtonBox(QDialogButtonBox.Save | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self._save)
        buttons.rejected.connect(self.reject)
        layout.addRow(buttons)

    def _save(self) -> None:
        self._cfg.set("assistant.wake_word", self.wake_word_input.text())
        self._cfg.set("assistant.wake_word_enabled", self.wake_enabled.isChecked())
        self._cfg.set("voice.tts_volume", self.tts_volume.value())
        self._cfg.set("ui.always_on_top", self.always_on_top.isChecked())
        self.accept()
