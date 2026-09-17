"""
Microphone access wrapper around SpeechRecognition's Microphone class.

Isolated here so the rest of the app never touches PyAudio directly,
and so missing/broken audio hardware degrades gracefully instead of
crashing the app.
"""
from __future__ import annotations

from typing import Optional

from core.config_loader import get_config
from core.logger import get_logger

log = get_logger("microphone")


class MicrophoneUnavailableError(Exception):
    pass


class MicrophoneManager:
    def __init__(self) -> None:
        self._cfg = get_config()
        self._sr = None
        self._mic = None
        self._recognizer = None
        self._available = False
        self._init()

    def _init(self) -> None:
        try:
            import speech_recognition as sr
            self._sr = sr
            device_index = self._cfg.get("voice.input_device_index", None)
            self._mic = sr.Microphone(device_index=device_index)
            self._recognizer = sr.Recognizer()
            with self._mic as source:
                self._recognizer.adjust_for_ambient_noise(source, duration=0.5)
            self._available = True
            log.info("Microphone initialized successfully")
        except ImportError:
            log.warning("SpeechRecognition/PyAudio not installed; microphone disabled")
        except OSError as e:
            log.warning("No microphone hardware detected: %s", e)
        except Exception:
            log.exception("Failed to initialize microphone")

    @property
    def is_available(self) -> bool:
        return self._available

    def listen_raw(self):
        """Capture one utterance and return the raw SR AudioData, or None on failure."""
        if not self._available:
            raise MicrophoneUnavailableError("Microphone is not available")

        timeout = float(self._cfg.get("voice.listen_timeout_seconds", 6))
        phrase_limit = float(self._cfg.get("voice.phrase_time_limit_seconds", 12))

        try:
            with self._mic as source:
                audio = self._recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_limit)
            return audio
        except Exception as e:
            log.debug("Listen attempt failed/timed out: %s", e)
            return None

    @property
    def recognizer(self):
        return self._recognizer


_mic_manager: Optional[MicrophoneManager] = None


def get_microphone_manager() -> MicrophoneManager:
    global _mic_manager
    if _mic_manager is None:
        _mic_manager = MicrophoneManager()
    return _mic_manager
