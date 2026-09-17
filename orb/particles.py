"""Lightweight particle system orbiting the orb core."""
from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import List


@dataclass
class Particle:
    angle: float        # radians
    radius_ratio: float  # relative distance from center (0..1.5)
    speed: float         # radians/sec
    size: float          # px
    phase: float          # for twinkle offset


class ParticleField:
    def __init__(self, count: int = 40) -> None:
        self._particles: List[Particle] = [self._spawn() for _ in range(count)]

    def _spawn(self) -> Particle:
        return Particle(
            angle=random.uniform(0, 2 * math.pi),
            radius_ratio=random.uniform(1.05, 1.45),
            speed=random.uniform(0.15, 0.5) * random.choice([-1, 1]),
            size=random.uniform(1.0, 2.6),
            phase=random.uniform(0, 2 * math.pi),
        )

    def resize(self, count: int) -> None:
        current = len(self._particles)
        if count > current:
            self._particles.extend(self._spawn() for _ in range(count - current))
        elif count < current:
            self._particles = self._particles[:count]

    def step(self, dt: float) -> None:
        for p in self._particles:
            p.angle += p.speed * dt

    @property
    def particles(self) -> List[Particle]:
        return self._particles
