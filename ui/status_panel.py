"""Status indicator (current orb state) + live system stat strip."""
from __future__ import annotations

from PySide6.QtCore import QTimer, Qt
from PySide6.QtWidgets import QHBoxLayout, QLabel, QVBoxLayout, QWidget

from core.events import Events, get_event_bus
from system.system_info import full_snapshot


class StatusPanel(QWidget):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)

        self.state_label = QLabel("STATUS: IDLE")
        self.state_label.setObjectName("stateLabel")
        self.state_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.state_label)

        stats_row = QHBoxLayout()
        self.cpu_label = QLabel("CPU: --%")
        self.ram_label = QLabel("RAM: --%")
        self.battery_label = QLabel("BATT: --%")
        for lbl in (self.cpu_label, self.ram_label, self.battery_label):
            lbl.setObjectName("statLabel")
            stats_row.addWidget(lbl)
        layout.addLayout(stats_row)

        get_event_bus().subscribe(Events.STATE_CHANGED, self._on_state_changed)

        self._refresh_timer = QTimer(self)
        self._refresh_timer.timeout.connect(self._refresh_stats)
        self._refresh_timer.start(4000)  # every 4s — avoid unnecessary polling
        self._refresh_stats()

    def _on_state_changed(self, old, new, reason: str = "") -> None:
        name = new.value if hasattr(new, "value") else str(new)
        self.state_label.setText(f"STATUS: {name}")

    def _refresh_stats(self) -> None:
        try:
            snap = full_snapshot()
            self.cpu_label.setText(f"CPU: {snap['cpu']['usage_percent']:.0f}%")
            self.ram_label.setText(f"RAM: {snap['memory']['percent']:.0f}%")
            battery = snap["battery"]
            self.battery_label.setText(f"BATT: {battery['percent']:.0f}%" if battery else "BATT: N/A")
        except Exception:
            pass
