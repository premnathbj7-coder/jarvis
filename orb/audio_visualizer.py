"""
Smooths raw microphone/TTS amplitude samples into a single reactive
value the Orb can use to scale its glow, so short spikes don't make
the animation jittery.
"""
from __future__ import annotations

import threading


class AudioLevelSmoother:
    def __init__(self, smoothing: float = 0.25) -> None:
        self._level = 0.0
        self._smoothing = smoothing
        self._lock = threading.Lock()

    def update(self, raw_level: float) -> None:
        raw_level = max(0.0, min(1.0, raw_level))
        with self._lock:
            self._level += (raw_level - self._level) * self._smoothing

    @property
    def level(self) -> float:
        with self._lock:
            return self._level
