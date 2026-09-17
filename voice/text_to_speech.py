"""
Text-to-speech abstraction over pyttsx3 (fully offline, CPU-only —
ideal for the target hardware). Swappable for another engine later
without touching call sites, since everything goes through speak().
"""
from __future__ import annotations

import threading
from typing import Optional

from core.config_loader import get_config
from core.events import Events, get_event_bus
from core.logger import get_logger

log = get_logger("tts")


class TextToSpeech:
    def __init__(self) -> None:
        self._cfg = get_config()
        self._engine = None
        self._lock = threading.RLock()
        self._speaking = False
        self._bus = get_event_bus()
        self._init()

    def _init(self) -> None:
        try:
            import pyttsx3
            self._engine = pyttsx3.init()
            rate = int(self._cfg.get("voice.tts_rate", 185))
            volume = float(self._cfg.get("voice.tts_volume", 1.0))
            self._engine.setProperty("rate", rate)
            self._engine.setProperty("volume", volume)

            voices = self._engine.getProperty("voices")
            idx = int(self._cfg.get("voice.tts_voice_index", 0))
            if voices and 0 <= idx < len(voices):
                self._engine.setProperty("voice", voices[idx].id)

            log.info("TTS engine initialized (pyttsx3)")
        except ImportError:
            log.warning("pyttsx3 not installed; TTS disabled (text-only mode)")
        except Exception:
            log.exception("Failed to initialize TTS engine")

    @property
    def is_available(self) -> bool:
        return self._engine is not None

    @property
    def is_speaking(self) -> bool:
        with self._lock:
            return self._speaking

    def speak(self, text: str, blocking: bool = True) -> None:
        if not text:
            return
        if not self.is_available:
            log.debug("TTS unavailable, skipping speech for: %s", text)
            return

        def _run():
            with self._lock:
                self._speaking = True
            try:
                self._engine.say(text)
                self._engine.runAndWait()
            except Exception:
                log.exception("TTS playback failed")
            finally:
                with self._lock:
                    self._speaking = False

        if blocking:
            _run()
        else:
            threading.Thread(target=_run, daemon=True).start()

    def stop(self) -> None:
        if self._engine:
            try:
                self._engine.stop()
            except Exception:
                log.exception("Failed to stop TTS engine")
            with self._lock:
                self._speaking = False

    def set_volume(self, volume: float) -> None:
        if self._engine:
            self._engine.setProperty("volume", max(0.0, min(1.0, volume)))


_tts: Optional[TextToSpeech] = None


def get_text_to_speech() -> TextToSpeech:
    global _tts
    if _tts is None:
        _tts = TextToSpeech()
    return _tts
