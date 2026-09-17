"""
Top-level coordinator for the voice pipeline:
wake word -> STT -> (command router) -> TTS

Keeps voice orchestration out of the UI and core layers.
"""
from __future__ import annotations

import threading
from typing import Callable, Optional

from core.events import Events, get_event_bus
from core.logger import get_logger
from voice.speech_to_text import get_speech_to_text
from voice.text_to_speech import get_text_to_speech
from voice.wake_word import get_wake_word_detector

log = get_logger("audio_manager")


class AudioManager:
    """
    Wires together wake word detection with speech capture and playback.
    The UI/router supplies `on_utterance` to receive recognized text.
    """

    def __init__(self, on_utterance: Callable[[str], None]) -> None:
        self._stt = get_speech_to_text()
        self._tts = get_text_to_speech()
        self._wake = get_wake_word_detector()
        self._bus = get_event_bus()
        self._on_utterance = on_utterance
        self._bus.subscribe(Events.WAKE_WORD_DETECTED, self._handle_wake_word)

    def start(self) -> None:
        if self._wake.is_available:
            self._wake.start()
        else:
            log.info("Wake word engine unavailable; use manual microphone trigger instead")

    def stop(self) -> None:
        self._wake.stop()
        self._tts.stop()

    def _handle_wake_word(self) -> None:
        threading.Thread(target=self.listen_once, daemon=True).start()

    def listen_once(self) -> Optional[str]:
        """Manually trigger one listen+transcribe cycle (e.g. mic button press)."""
        text = self._stt.listen_and_transcribe()
        if text:
            self._on_utterance(text)
        return text

    def speak(self, text: str, blocking: bool = False) -> None:
        self._tts.speak(text, blocking=blocking)

    @property
    def voice_available(self) -> bool:
        return self._stt.is_available and self._tts.is_available
