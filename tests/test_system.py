"""Tests for system monitoring — should never raise even on odd hardware."""
from __future__ import annotations

from system import cpu, memory, storage
from system.system_info import describe, full_snapshot


def test_cpu_info_shape():
    info = cpu.cpu_info()
    assert "usage_percent" in info
    assert info["logical_cores"] >= 1


def test_memory_usage_shape():
    info = memory.memory_usage()
    assert 0 <= info["percent"] <= 100


def test_full_snapshot_does_not_raise():
    snap = full_snapshot()
    assert "cpu" in snap and "memory" in snap


def test_describe_cpu_returns_text():
    text = describe("cpu usage")
    assert "CPU" in text or "percent" in text.lower()
