"""Shared pytest fixtures: point every test at an isolated temp project root."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture(autouse=True)
def isolated_singletons(tmp_path, monkeypatch):
    """
    Reset module-level singletons between tests and point config/db
    at a temp directory so tests never touch the real data/ folder.
    """
    monkeypatch.chdir(tmp_path)

    import shutil
    project_root = Path(__file__).resolve().parent.parent
    shutil.copy(project_root / "config.yaml", tmp_path / "config.yaml")

    from core import config_loader
    config_loader.Config._instance = None

    yield

    config_loader.Config._instance = None
