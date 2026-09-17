"""Rotating HUD ring definitions for the orb."""
from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass
class Ring:
    radius_ratio: float   # relative to core radius
    thickness: float
    rotation: float        # current angle, radians
    speed_multiplier: float
    dash: bool = False


def build_rings(count: int) -> List[Ring]:
    rings: List[Ring] = []
    for i in range(count):
        rings.append(
            Ring(
                radius_ratio=1.5 + i * 0.35,
                thickness=2.0 - (i * 0.3),
                rotation=0.0,
                speed_multiplier=1.0 - (i * 0.25) if i % 2 == 0 else -(0.7 + i * 0.15),
                dash=(i % 2 == 1),
            )
        )
    return rings


def step_rings(rings: List[Ring], base_speed: float, dt: float) -> None:
    for ring in rings:
        ring.rotation += base_speed * ring.speed_multiplier * dt
