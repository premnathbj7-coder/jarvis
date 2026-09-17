"""Speech-to-text using SpeechRecognition (Google Web Speech API by default)."""
from __future__ import annotations

from typing import Optional

from core.logger import get_logger
from voice.microphone import MicrophoneUnavailableError, get_microphone_manager

log = get_logger("stt")


class SpeechToText:
    def __init__(self) -> None:
        self._mic_mgr = get_microphone_manager()

    @property
    def is_available(self) -> bool:
        return self._mic_mgr.is_available

    def listen_and_transcribe(self) -> Optional[str]:
        """Capture one utterance from the microphone and return recognized text, or None."""
        if not self.is_available:
            log.debug("STT unavailable: no microphone")
            return None

        try:
            audio = self._mic_mgr.listen_raw()
        except MicrophoneUnavailableError:
            return None

        if audio is None:
            return None

        sr = self._mic_mgr._sr  # module reference, already imported successfully
        try:
            text = self._mic_mgr.recognizer.recognize_google(audio)
            log.info("Recognized speech: %s", text)
            return text
        except sr.UnknownValueError:
            log.debug("Speech was not understood")
            return None
        except sr.RequestError as e:
            log.warning("STT service unavailable: %s", e)
            return None
        except Exception:
            log.exception("Unexpected STT failure")
            return None


_stt: "SpeechToText | None" = None


def get_speech_to_text() -> SpeechToText:
    global _stt
    if _stt is None:
        _stt = SpeechToText()
    return _stt
