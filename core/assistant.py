"""
Top-level Assistant facade.

This is what main.py / the UI layer talks to. It owns startup and
shutdown sequencing for every subsystem and exposes a small surface:
    assistant.handle_text(text) -> str
    assistant.start_voice() / stop_voice()
    assistant.shutdown()
"""
from __future__ import annotations

from typing import List, Optional

from config import BRAIN_MODEL, EMBEDDING_MODEL, ROUTER_MODEL
from core.command_router import get_command_router
from core.config_loader import get_config
from core.logger import get_logger, setup_logging
from core.ollama_client import get_ollama_client
from core.state import AssistantState, get_state_machine
from plugins.plugin_manager import get_plugin_manager
from productivity.reminders import get_reminder_manager
from voice.audio_manager import AudioManager

log = get_logger("assistant")


class Assistant:
    def __init__(self) -> None:
        setup_logging()
        self._cfg = get_config()
        self._state = get_state_machine()
        self._router = get_command_router()
        self._plugins = get_plugin_manager()
        self._reminders = get_reminder_manager()
        self._ollama = get_ollama_client()
        self._audio: Optional[AudioManager] = None
        self._voice_enabled = bool(self._cfg.get("voice.enabled", True))

    def startup(self) -> str:
        log.info("JARVIS starting up")
        self._plugins.discover_and_load()

        if self._voice_enabled:
            self._audio = AudioManager(on_utterance=self._on_voice_utterance)
            self._audio.start()

        self._reminders.start_polling(on_due=self._on_reminder_due)

        greeting = str(self._cfg.get("assistant.greeting", "Good day. JARVIS is online."))

        # Check local Ollama status & models
        if not self._ollama.is_available():
            status_msg = "\n[Notice] Ollama is not running. Start Ollama (http://localhost:11434) to enable local AI features."
            log.warning(status_msg)
            greeting += status_msg
        else:
            missing_models: List[str] = []
            for m in (ROUTER_MODEL, BRAIN_MODEL, EMBEDDING_MODEL):
                if not self._ollama.model_available(m):
                    missing_models.append(m)

            if missing_models:
                cmds = " ".join([f"ollama pull {m}" for m in missing_models])
                status_msg = f"\n[Notice] Missing local model(s): {', '.join(missing_models)}. Run in terminal: {cmds}"
                log.warning(status_msg)
                greeting += status_msg
            else:
                log.info("All local Ollama models verified: %s, %s, %s", ROUTER_MODEL, BRAIN_MODEL, EMBEDDING_MODEL)

        if self._audio and self._audio.voice_available:
            self._audio.speak(greeting, blocking=False)

        log.info("JARVIS startup complete")
        return greeting

    def handle_text(self, text: str) -> str:
        """Process typed or transcribed input and return the response."""
        response = self._router.handle(text, on_speak=self._speak_async)
        if self._audio and self._audio.voice_available:
            self._audio.speak(response, blocking=False)
        return response

    def _on_voice_utterance(self, text: str) -> None:
        self.handle_text(text)

    def _on_reminder_due(self, task: str) -> None:
        message = f"Reminder: {task}."
        log.info(message)
        self._speak_async(message)

    def _speak_async(self, text: str) -> None:
        if self._audio and self._audio.voice_available:
            self._audio.speak(text, blocking=False)

    def listen_once(self) -> Optional[str]:
        """Trigger a manual (button-press) voice capture cycle."""
        if not self._audio:
            return None
        return self._audio.listen_once()

    @property
    def state(self) -> AssistantState:
        return self._state.state

    def shutdown(self) -> None:
        log.info("JARVIS shutting down")
        if self._audio:
            self._audio.stop()
        self._reminders.stop_polling()
        self._plugins.shutdown_all()
        log.info("JARVIS shutdown complete")
