"""
Voice component tests — mock hardware-dependent pieces so these
pass in CI/headless environments without a real microphone.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

from voice.text_to_speech import TextToSpeech


def test_tts_unavailable_does_not_raise_when_speaking():
    with patch("voice.text_to_speech.TextToSpeech._init", lambda self: None):
        tts = TextToSpeech()
        tts._engine = None
        tts.speak("hello there")  # should silently no-op, not raise


def test_tts_speaks_when_engine_present():
    with patch("voice.text_to_speech.TextToSpeech._init", lambda self: None):
        tts = TextToSpeech()
        mock_engine = MagicMock()
        tts._engine = mock_engine
        tts.speak("hello", blocking=True)
        mock_engine.say.assert_called_once_with("hello")
        mock_engine.runAndWait.assert_called_once()
