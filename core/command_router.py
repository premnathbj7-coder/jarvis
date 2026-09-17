"""
Central Command Router tying together the local Ollama AI architecture:
- Phi-3 Mini Router (phi3:mini)
- Gemma 3 12B Core Brain (gemma3:12b-it-q4_K_M)
- Nomic Local Vector Memory (nomic-embed-text)
- Deterministic Python Actions + Security Validator + Plugins
"""
from __future__ import annotations

from typing import List, Optional, Tuple

from core.brain import get_brain
from core.commands import get_command_executor
from core.context import get_session_context
from core.events import Events, get_event_bus
from core.logger import get_logger
from core.router import get_router
from core.state import AssistantState, get_state_machine
from memory.memory_manager import get_memory_manager
from memory.store import get_vector_store
from plugins.plugin_manager import get_plugin_manager
from security.command_validator import get_command_validator
from security.confirmations import get_confirmation_manager

log = get_logger("command_router")


class CommandRouter:
    """Central Orchestrator for local AI assistant processing."""

    def __init__(self) -> None:
        self._ctx = get_session_context()
        self._state = get_state_machine()
        self._bus = get_event_bus()
        self._router = get_router()
        self._brain = get_brain()
        self._executor = get_command_executor()
        self._vector_store = get_vector_store()
        self._memory_mgr = get_memory_manager()
        self._plugins = get_plugin_manager()
        self._validator = get_command_validator()
        self._confirmations = get_confirmation_manager()

    def handle(self, text: str, on_speak: Optional[callable] = None) -> str:
        """
        Process user input end-to-end through the local AI architecture.
        """
        text = (text or "").strip()
        if not text:
            return ""

        self._bus.emit(Events.USER_UTTERANCE, text=text)

        # Handle pending confirmation prompts first
        if self._confirmations.has_pending():
            text_l = text.lower()
            if text_l in ("yes", "yep", "confirm", "proceed", "go ahead", "do it"):
                self._state.transition(AssistantState.PROCESSING, "confirmation yes")
                result = self._confirmations.confirm()
                response = str(result) if result else "Done."
                self._finish(response)
                return response
            if text_l in ("no", "nope", "cancel", "stop", "don't", "never mind"):
                response = self._confirmations.cancel()
                self._finish(response)
                return response
            self._confirmations.cancel()

        self._state.transition(AssistantState.THINKING, "classifying intent with Phi-3")

        # Check plugins first if word matches a plugin trigger
        first_word = text.split(" ", 1)[0] if text else ""
        plugin_result = self._plugins.dispatch(first_word, text)
        if plugin_result is not None:
            self._finish(plugin_result)
            return plugin_result

        # Step 1: Classify intent with Phi-3 Mini
        decision = self._router.classify(text)

        # Step 2: Dispatch based on router decision
        if decision.intent_type == "command" and decision.command:
            self._state.transition(AssistantState.PROCESSING, f"executing command: {decision.command}")
            response = self._executor.execute(
                command_name=decision.command,
                params=decision.parameters,
                raw_text=text,
                on_speak=on_speak,
            )

        elif decision.intent_type == "memory":
            self._state.transition(AssistantState.PROCESSING, f"updating local vector memory")
            cmd = (decision.command or "").lower()
            params = decision.parameters
            mem_text = params.get("text") or params.get("fact") or text

            if cmd == "forget_memory":
                response = self._vector_store.forget_memory(mem_text)
                self._memory_mgr.forget_fact(mem_text)
            elif cmd == "recall_memory":
                memories = self._vector_store.search_memories(mem_text)
                if memories:
                    response = "Here is what I remember: " + "; ".join(memories)
                else:
                    response = self._memory_mgr.recall(mem_text)
            else:
                # store memory
                response = self._vector_store.store_memory(mem_text)
                self._memory_mgr.remember_fact(mem_text)

        else:
            # Conversation mode -> Gemma 3 12B
            self._state.transition(AssistantState.PROCESSING, "reasoning with Gemma 3 12B")

            # Retrieve relevant memories using Nomic vector embeddings
            recalled_list = self._vector_store.search_memories(text, limit=3)
            recalled_str = "\n".join(f"- {m}" for m in recalled_list) if recalled_list else ""

            # Fetch recent turns from session context
            history: List[Tuple[str, str]] = [(t.role, t.text) for t in self._ctx.recent_turns()]

            self._ctx.add_turn("user", text)
            self._memory_mgr.log_turn("user", text)

            response = self._brain.generate_response(
                message=text,
                history=history,
                recalled_memories=recalled_str,
            )

            self._ctx.add_turn("assistant", response)
            self._memory_mgr.log_turn("assistant", response)

        self._finish(response)
        return response

    def _finish(self, response: str) -> None:
        self._state.transition(AssistantState.SPEAKING, "responding")
        self._bus.emit(Events.AI_RESPONSE, text=response)
        self._bus.emit(Events.COMMAND_EXECUTED)
        self._state.transition(AssistantState.IDLE, "response delivered")


_router: Optional[CommandRouter] = None


def get_command_router() -> CommandRouter:
    global _router
    if _router is None:
        _router = CommandRouter()
    return _router
