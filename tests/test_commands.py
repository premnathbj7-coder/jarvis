"""Tests for intent detection and the command validator."""
from __future__ import annotations

from core.intent import IntentCategory, detect_intent
from security.command_validator import CommandValidator
from security.permissions import PermissionLevel


def test_detect_app_open():
    match = detect_intent("open Chrome")
    assert match.category == IntentCategory.APP_OPEN
    assert match.slots["app"] == "Chrome"


def test_detect_calculator():
    match = detect_intent("what is 5 + 3")
    assert match.category == IntentCategory.CALCULATOR


def test_detect_conversation_fallback():
    match = detect_intent("tell me a joke")
    assert match.category == IntentCategory.CONVERSATION


def test_forbidden_command_blocked():
    validator = CommandValidator()
    match = detect_intent("open chrome and then rm -rf /")
    result = validator.validate(match)
    assert result.allowed is False


def test_destructive_requires_confirmation():
    validator = CommandValidator()
    match = detect_intent("delete my downloads folder")
    result = validator.validate(match)
    assert result.needs_confirmation is True
    assert result.level == PermissionLevel.DESTRUCTIVE


def test_safe_command_no_confirmation():
    validator = CommandValidator()
    match = detect_intent("open Chrome")
    result = validator.validate(match)
    assert result.needs_confirmation is False
