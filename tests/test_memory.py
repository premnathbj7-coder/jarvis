"""Tests for memory (SQLite-backed) — runs against a temp DB per test."""
from __future__ import annotations

from memory.database import Database
from memory.user_memory import UserMemory


def test_remember_and_recall(tmp_path):
    db = Database(db_path=str(tmp_path / "test.db"))
    mem = UserMemory()
    mem._db = db
    mem.remember("my project is called JARVIS")
    facts = mem.recall_all()
    assert any("JARVIS" in f for f in facts)


def test_forget_removes_fact(tmp_path):
    db = Database(db_path=str(tmp_path / "test2.db"))
    mem = UserMemory()
    mem._db = db
    mem.remember("the sky is blue")
    deleted = mem.forget("sky")
    assert deleted == 1
    assert mem.recall_all() == []
