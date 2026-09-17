"""
Wake-word detection ("Hey JARVIS") using Porcupine, with the ability
to run fully disabled if no engine/key is configured. Runs in its
own background thread and emits WAKE_WORD_DETECTED on the event bus,
so the UI/command loop stays decoupled from the detection engine.
"""
from __future__ import annotations

import struct
import threading
from typing import Optional

from core.config_loader import get_config
from core.events import Events, get_event_bus
from core.logger import get_logger

log = get_logger("wake_word")


class WakeWordDetector:
    def __init__(self) -> None:
        self._cfg = get_config()
        self._bus = get_event_bus()
        self._porcupine = None
        self._pa = None
        self._stream = None
        self._thread: Optional[threading.Thread] = None
        self._running = threading.Event()
        self._enabled = bool(self._cfg.get("assistant.wake_word_enabled", True))
        self._init()

    def _init(self) -> None:
        if not self._enabled:
            log.info("Wake word disabled via config")
            return

        access_key = self._cfg.get_secret("PORCUPINE_ACCESS_KEY")
        if not access_key:
            log.info("PORCUPINE_ACCESS_KEY not set; wake word detection disabled")
            self._enabled = False
            return

        try:
            import pvporcupine
            import pyaudio

            keyword = self._cfg.get("wake_word.keyword", "jarvis")
            sensitivity = float(self._cfg.get("wake_word.sensitivity", 0.6))

            self._porcupine = pvporcupine.create(
                access_key=access_key,
                keywords=[keyword] if keyword in pvporcupine.KEYWORDS else ["jarvis"],
                sensitivities=[sensitivity],
            )
            self._pa = pyaudio.PyAudio()
        except ImportError:
            log.warning("pvporcupine/pyaudio not installed; wake word disabled")
            self._enabled = False
        except Exception:
            log.exception("Failed to initialize wake word engine")
            self._enabled = False

    @property
    def is_available(self) -> bool:
        return self._enabled and self._porcupine is not None

    def start(self) -> None:
        if not self.is_available or self._running.is_set():
            return

        self._stream = self._pa.open(
            rate=self._porcupine.sample_rate,
            channels=1,
            format=self._pa.get_format_from_width(2),
            input=True,
            frames_per_buffer=self._porcupine.frame_length,
        )
        self._running.set()
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        log.info("Wake word detection started")

    def _loop(self) -> None:
        try:
            while self._running.is_set():
                pcm = self._stream.read(self._porcupine.frame_length, exception_on_overflow=False)
                pcm = struct.unpack_from("h" * self._porcupine.frame_length, pcm)
                result = self._porcupine.process(pcm)
                if result >= 0:
                    log.info("Wake word detected")
                    self._bus.emit(Events.WAKE_WORD_DETECTED)
        except Exception:
            log.exception("Wake word loop crashed")
        finally:
            self._running.clear()

    def stop(self) -> None:
        self._running.clear()
        if self._thread:
            self._thread.join(timeout=2)
        if self._stream:
            self._stream.close()
        if self._pa:
            self._pa.terminate()
        if self._porcupine:
            self._porcupine.delete()
        log.info("Wake word detection stopped")


_detector: Optional[WakeWordDetector] = None


def get_wake_word_detector() -> WakeWordDetector:
    global _detector
    if _detector is None:
        _detector = WakeWordDetector()
    return _detector
