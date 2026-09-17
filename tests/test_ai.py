"""Tests for the AI provider abstraction. No real API keys required."""
from __future__ import annotations

from ai.provider import AnthropicProvider, NullProvider, get_ai_provider
from ai.response import AIResponse


def test_null_provider_always_available():
    provider = NullProvider()
    assert provider.is_available is True


def test_null_provider_returns_response():
    provider = NullProvider()
    response = provider.generate("hello", [])
    assert isinstance(response, AIResponse)
    assert response.success is True
    assert response.text


def test_anthropic_provider_unavailable_without_key(monkeypatch):
    monkeypatch.delenv("AI_API_KEY", raising=False)
    provider = AnthropicProvider()
    assert provider.is_available is False
    response = provider.generate("hello", [])
    assert response.success is False


def test_get_ai_provider_falls_back_to_null(monkeypatch):
    monkeypatch.delenv("AI_API_KEY", raising=False)
    import ai.provider as provider_mod
    provider_mod._provider = None
    provider = get_ai_provider()
    assert provider.is_available is True
