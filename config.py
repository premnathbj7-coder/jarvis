"""
Central configuration exports for JARVIS.

Provides direct access to key local AI model settings and system defaults.
Backed by core.config_loader.
"""
from __future__ import annotations

from core.config_loader import get_config

_cfg = get_config()

# Ollama Local AI Models
OLLAMA_BASE_URL: str = str(_cfg.get("ai.ollama_base_url", "http://localhost:11434"))
ROUTER_MODEL: str = str(_cfg.get("ai.router_model", "phi3:mini"))
BRAIN_MODEL: str = str(_cfg.get("ai.brain_model", "gemma3:12b-it-q4_K_M"))
EMBEDDING_MODEL: str = str(_cfg.get("ai.embedding_model", "nomic-embed-text"))

# Parameters
MAX_TOKENS: int = int(_cfg.get("ai.max_tokens", 1024))
TEMPERATURE: float = float(_cfg.get("ai.temperature", 0.6))
HISTORY_TURNS: int = int(_cfg.get("ai.history_turns", 12))

# System & Assistant Settings
ASSISTANT_NAME: str = str(_cfg.get("assistant.name", "JARVIS"))
WAKE_WORD: str = str(_cfg.get("assistant.wake_word", "hey jarvis"))
DB_PATH: str = str(_cfg.get("memory.db_path", "data/database/jarvis.db"))
