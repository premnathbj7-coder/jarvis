"""
OrbWidget: the animated JARVIS orb, rendered with QPainter.

Deliberately avoids OpenGL/3D — a timer-driven 2D paint loop capped
at a configurable FPS is smooth and cheap enough for integrated
Radeon graphics while still looking like a "glowing energy sphere
with rotating rings and particles."
"""
from __future__ import annotations

import math
import time

from PySide6.QtCore import QRectF, Qt, QTimer
from PySide6.QtGui import QColor, QPainter, QPen, QRadialGradient
from PySide6.QtWidgets import QWidget

from core.config_loader import get_config
from core.events import Events, get_event_bus
from core.state import AssistantState
from orb.animations import STATE_STYLES, pulse
from orb.audio_visualizer import AudioLevelSmoother
from orb.particles import ParticleField
from orb.rings import build_rings, step_rings


class OrbWidget(QWidget):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        cfg = get_config()
        self._fps = int(cfg.get("orb.animation_fps", 30))
        self._intensity = float(cfg.get("orb.intensity", 0.8))
        self._particles = ParticleField(int(cfg.get("orb.particle_count", 40)))
        self._rings = build_rings(int(cfg.get("orb.ring_count", 3)))
        self._audio_reactive = bool(cfg.get("orb.audio_reactive", True))
        self._level = AudioLevelSmoother()

        self._state_name = AssistantState.IDLE.value
        self._t0 = time.monotonic()
        self._last_frame = self._t0

        self.setMinimumSize(240, 240)
        self.setAttribute(Qt.WA_TranslucentBackground)

        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._timer.start(max(16, int(1000 / max(self._fps, 1))))

        bus = get_event_bus()
        bus.subscribe(Events.STATE_CHANGED, self._on_state_changed)
        bus.subscribe(Events.MIC_LEVEL, self._on_audio_level)
        bus.subscribe(Events.TTS_LEVEL, self._on_audio_level)

    # ---- event handlers ----
    def _on_state_changed(self, old, new, reason: str = "") -> None:
        self._state_name = new.value if hasattr(new, "value") else str(new)

    def _on_audio_level(self, level: float = 0.0) -> None:
        if self._audio_reactive:
            self._level.update(level)

    # ---- animation loop ----
    def _tick(self) -> None:
        now = time.monotonic()
        dt = now - self._last_frame
        self._last_frame = now

        style = STATE_STYLES.get(self._state_name, STATE_STYLES["IDLE"])
        step_rings(self._rings, style.ring_speed, dt)
        self._particles.step(dt)
        self.update()

    # ---- paint ----
    def paintEvent(self, event) -> None:  # noqa: N802 (Qt override)
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing, True)

        w, h = self.width(), self.height()
        cx, cy = w / 2, h / 2
        min_dim = min(w, h)

        style = STATE_STYLES.get(self._state_name, STATE_STYLES["IDLE"])
        elapsed = time.monotonic() - self._t0

        breathing = pulse(elapsed, style.pulse_speed)
        audio_boost = self._level.level if self._audio_reactive else 0.0
        energy = min(1.0, (breathing * 0.6 + 0.4) * self._intensity + audio_boost * 0.5)

        core_radius = min_dim * style.base_radius_ratio * (0.9 + 0.1 * energy)

        self._draw_glow(painter, cx, cy, core_radius, style, energy)
        self._draw_core(painter, cx, cy, core_radius, style, energy)
        self._draw_rings(painter, cx, cy, core_radius, style, energy)
        self._draw_particles(painter, cx, cy, core_radius, style, energy)

        painter.end()

    def _draw_glow(self, painter: QPainter, cx: float, cy: float, radius: float, style, energy: float) -> None:
        gradient = QRadialGradient(cx, cy, radius * 2.2)
        color = QColor(style.color_primary)
        color.setAlphaF(0.35 * style.glow_intensity * (0.5 + 0.5 * energy))
        gradient.setColorAt(0.0, color)
        transparent = QColor(style.color_primary)
        transparent.setAlphaF(0.0)
        gradient.setColorAt(1.0, transparent)
        painter.setBrush(gradient)
        painter.setPen(Qt.NoPen)
        painter.drawEllipse(QRectF(cx - radius * 2.2, cy - radius * 2.2, radius * 4.4, radius * 4.4))

    def _draw_core(self, painter: QPainter, cx: float, cy: float, radius: float, style, energy: float) -> None:
        gradient = QRadialGradient(cx, cy, radius)
        c1 = QColor(style.color_primary)
        c2 = QColor(style.color_secondary)
        gradient.setColorAt(0.0, c1.lighter(130))
        gradient.setColorAt(0.6, c1)
        gradient.setColorAt(1.0, c2)
        painter.setBrush(gradient)
        painter.setPen(Qt.NoPen)
        painter.drawEllipse(QRectF(cx - radius, cy - radius, radius * 2, radius * 2))

    def _draw_rings(self, painter: QPainter, cx: float, cy: float, core_radius: float, style, energy: float) -> None:
        for ring in self._rings:
            r = core_radius * ring.radius_ratio
            color = QColor(style.color_primary)
            color.setAlphaF(0.3 + 0.3 * energy)
            pen = QPen(color, ring.thickness)
            if ring.dash:
                pen.setStyle(Qt.DashLine)
            painter.setPen(pen)
            painter.setBrush(Qt.NoBrush)
            span = 300 * 16  # degrees * 16 (Qt angle units), leave a visible gap
            start_angle = int(math.degrees(ring.rotation) * 16)
            painter.drawArc(QRectF(cx - r, cy - r, r * 2, r * 2), start_angle, span)

    def _draw_particles(self, painter: QPainter, cx: float, cy: float, core_radius: float, style, energy: float) -> None:
        color = QColor(style.color_primary)
        for p in self._particles.particles:
            r = core_radius * p.radius_ratio
            x = cx + r * math.cos(p.angle)
            y = cy + r * math.sin(p.angle)
            twinkle = 0.4 + 0.6 * ((math.sin(p.phase + time.monotonic() * 2) + 1) / 2)
            color.setAlphaF(min(1.0, 0.5 * twinkle + 0.2 * energy))
            painter.setBrush(color)
            painter.setPen(Qt.NoPen)
            painter.drawEllipse(QRectF(x - p.size / 2, y - p.size / 2, p.size, p.size))

    def closeEvent(self, event) -> None:  # noqa: N802
        self._timer.stop()
        super().closeEvent(event)
