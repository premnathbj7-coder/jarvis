"""
Phi-3 Mini Intent Router (model: phi3:mini).

Classifies user input into structured JSON intent (command, memory, conversation).
Does NOT answer user questions; only routes intent.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from config import ROUTER_MODEL
from core.logger import get_logger
from core.ollama_client import get_ollama_client

log = get_logger("router")

_ROUTER_SYSTEM_PROMPT = """You are an intent routing classifier for the JARVIS AI assistant.
Your ONLY job is to analyze user input and return a STRICT JSON object representing the user's intent. Do not answer questions or converse.

Schema:
{
    "type": "command" | "memory" | "conversation",
    "command": string or null,
    "parameters": object
}

Rule Breakdown:

1. TYPE: "command"
   Commands map to specific desktop/system/utility operations.
   Supported commands and required parameters:
   - "take_screenshot": {}
   - "open_application": {"application": "chrome" | "notepad" | "calculator" | "vscode" | "explorer" | string}
   - "close_application": {"application": string}
   - "open_folder": {"folder": "downloads" | "documents" | "desktop"}
   - "open_website": {"site": "youtube" | "github" | "gmail" | "google" | string}
   - "web_search": {"query": string}
   - "get_time": {}
   - "get_date": {}
   - "system_info": {}
   - "set_timer": {"duration": string}
   - "set_reminder": {"task": string, "time": string}
   - "create_note": {"title": string, "content": string}
   - "add_task": {"task": string}
   - "calculator": {"expression": string}
   - "weather": {"location": string}
   - "media_control": {"action": "play" | "pause" | "next" | "previous" | "volume_up" | "volume_down"}
   - "system_power": {"action": "shutdown" | "restart"}

2. TYPE: "memory"
   For explicit requests to remember, recall, or forget information.
   - "store_memory": {"text": string}
   - "recall_memory": {"topic": string}
   - "forget_memory": {"text": string}

3. TYPE: "conversation"
   For general questions, explanations, greetings, chat, coding assistance, or anything not matching a command/memory.
   command must be null and parameters must be {}.

Output MUST be a single raw JSON object. No explanation text, no markdown backticks.
"""


@dataclass
class RouterDecision:
    intent_type: str  # "command", "memory", "conversation"
    command: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    raw_text: str = ""


class Phi3Router:
    """Phi-3 Mini Intent Classifier."""

    def __init__(self) -> None:
        self._client = get_ollama_client()
        self._model = ROUTER_MODEL

    def classify(self, user_input: str) -> RouterDecision:
        user_input_clean = user_input.strip()
        if not user_input_clean:
            return RouterDecision(intent_type="conversation", raw_text=user_input)

        # Fast rule fallback for explicit system confirmations or empty inputs
        if user_input_clean.lower() in ("yes", "yep", "confirm", "proceed", "no", "cancel"):
            return RouterDecision(
                intent_type="command",
                command="confirmation",
                parameters={"value": user_input_clean.lower()},
                raw_text=user_input_clean,
            )

        # First attempt with Phi-3 Mini using format="json"
        messages = [
            {"role": "system", "content": _ROUTER_SYSTEM_PROMPT},
            {"role": "user", "content": user_input_clean},
        ]

        raw_response = self._client.chat(model=self._model, messages=messages, fmt="json")
        decision = self._parse_response(raw_response, user_input_clean)

        if decision is not None:
            log.info("Phi-3 Router decision: type=%s, cmd=%s", decision.intent_type, decision.command)
            return decision

        # Retry once with stricter prompt if parsing failed
        log.warning("Phi-3 Router JSON parse failed on first attempt. Retrying with strict prompt...")
        retry_messages = [
            {"role": "system", "content": _ROUTER_SYSTEM_PROMPT + "\nIMPORTANT: OUTPUT ONLY VALID JSON!"},
            {"role": "user", "content": user_input_clean},
        ]
        raw_response_retry = self._client.chat(model=self._model, messages=retry_messages, fmt="json")
        decision_retry = self._parse_response(raw_response_retry, user_input_clean)

        if decision_retry is not None:
            log.info("Phi-3 Router retry decision: type=%s, cmd=%s", decision_retry.intent_type, decision_retry.command)
            return decision_retry

        # Safe fallback to conversation mode
        log.warning("Phi-3 Router parsing failed after retry. Falling back to conversation mode.")
        return RouterDecision(intent_type="conversation", raw_text=user_input_clean)

    def _parse_response(self, raw_text: Optional[str], original_text: str) -> Optional[RouterDecision]:
        if not raw_text:
            return None

        # Clean markdown code blocks if present
        text = raw_text.strip()
        text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"^```\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()

        try:
            data = json.loads(text)
            if not isinstance(data, dict):
                return None

            intent_type = str(data.get("type", "conversation")).lower()
            if intent_type not in ("command", "memory", "conversation"):
                intent_type = "conversation"

            command = data.get("command")
            if command:
                command = str(command).strip()

            params = data.get("parameters", {})
            if not isinstance(params, dict):
                params = {}

            return RouterDecision(
                intent_type=intent_type,
                command=command,
                parameters=params,
                raw_text=original_text,
            )
        except Exception:
            return None


_router: Optional[Phi3Router] = None


def get_router() -> Phi3Router:
    global _router
    if _router is None:
        _router = Phi3Router()
    return _router
