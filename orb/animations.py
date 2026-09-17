"""Easing helpers and per-state animation parameter presets for the Orb."""
from __future__ import annotations

import math
from dataclasses import dataclass


def ease_in_out_sine(t: float) -> float:
    return -(math.cos(math.pi * t) - 1) / 2


def pulse(t: float, speed: float = 1.0) -> float:
    """Returns a smooth 0..1..0 breathing value."""
    return (math.sin(t * speed) + 1) / 2


@dataclass
class OrbStyleParams:
    base_radius_ratio: float   # fraction of widget min-dimension
    glow_intensity: float      # 0..1
    ring_speed: float          # radians/sec
    pulse_speed: float         # radians/sec
    color_primary: str
    color_secondary: str


# Per-state visual presets. Tuned to be readable at a glance and cheap to render.
STATE_STYLES = {
    "IDLE": OrbStyleParams(0.30, 0.35, 0.25, 1.2, "#00d4ff", "#0077aa"),
    "LISTENING": OrbStyleParams(0.34, 0.65, 0.55, 2.2, "#00ffcc", "#00aa88"),
    "THINKING": OrbStyleParams(0.30, 0.55, 1.6, 1.8, "#a855f7", "#6b21a8"),
    "PROCESSING": OrbStyleParams(0.30, 0.55, 1.6, 1.8, "#a855f7", "#6b21a8"),
    "SPEAKING": OrbStyleParams(0.32, 0.75, 0.7, 3.0, "#00d4ff", "#0099cc"),
    "ERROR": OrbStyleParams(0.30, 0.6, 0.4, 2.5, "#ff4444", "#aa0000"),
}
