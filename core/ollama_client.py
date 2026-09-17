"""
Client wrapper for local Ollama server communication using official ollama package.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
import ollama

from core.config_loader import get_config
from core.logger import get_logger

log = get_logger("ollama_client")


class OllamaClient:
    """Thread-safe client wrapper for Ollama interactions."""

    def __init__(self) -> None:
        cfg = get_config()
        self.host = str(cfg.get("ai.ollama_base_url", "http://localhost:11434"))

    def _get_client(self) -> ollama.Client:
        return ollama.Client(host=self.host, timeout=180.0)

    def is_available(self) -> bool:
        """Check if local Ollama daemon is reachable."""
        try:
            client = self._get_client()
            client.list()
            return True
        except Exception:
            log.debug("Ollama is not reachable at %s", self.host)
            return False

    def list_models(self) -> List[str]:
        """Return list of installed local model names."""
        try:
            client = self._get_client()
            models_res = client.list()
            # ollama-python models can be objects with .model or dicts
            names = []
            for m in getattr(models_res, "models", []) or []:
                name = getattr(m, "model", None) or (m.get("name") if isinstance(m, dict) else str(m))
                if name:
                    names.append(name)
            return names
        except Exception as e:
            log.warning("Failed to list Ollama models: %s", e)
            return []

    def model_available(self, model_name: str) -> bool:
        """Check if specific model is downloaded and ready."""
        installed = self.list_models()
        model_name_clean = model_name.strip().lower()
        for m in installed:
            m_clean = m.strip().lower()
            if m_clean == model_name_clean or m_clean.startswith(model_name_clean + ":") or model_name_clean.startswith(m_clean + ":"):
                return True
        return False

    def generate(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        fmt: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Execute completion prompt against model."""
        try:
            client = self._get_client()
            kwargs: Dict[str, Any] = {"model": model, "prompt": prompt}
            if system:
                kwargs["system"] = system
            if fmt:
                kwargs["format"] = fmt
            if options:
                kwargs["options"] = options
            res = client.generate(**kwargs)
            return res.get("response", "").strip() if isinstance(res, dict) else getattr(res, "response", "").strip()
        except Exception as e:
            log.error("Ollama generate failed for model %s: %s", model, e)
            return None

    def chat(
        self,
        model: str,
        messages: List[Dict[str, str]],
        fmt: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Execute chat turn against model."""
        try:
            client = self._get_client()
            kwargs: Dict[str, Any] = {"model": model, "messages": messages}
            if fmt:
                kwargs["format"] = fmt
            if options:
                kwargs["options"] = options
            res = client.chat(**kwargs)

            # extract message content
            if isinstance(res, dict):
                msg = res.get("message", {})
                return msg.get("content", "").strip() if isinstance(msg, dict) else getattr(msg, "content", "").strip()
            else:
                msg = getattr(res, "message", None)
                if msg:
                    return getattr(msg, "content", "").strip() if hasattr(msg, "content") else str(msg)
            return None
        except Exception as e:
            log.error("Ollama chat failed for model %s: %s", model, e)
            return None

    def embed(self, model: str, prompt: str) -> Optional[List[float]]:
        """Generate float vector embeddings for text."""
        try:
            client = self._get_client()
            res = client.embeddings(model=model, prompt=prompt)
            if isinstance(res, dict):
                return res.get("embedding", None)
            return getattr(res, "embedding", None)
        except Exception as e:
            log.error("Ollama embed failed for model %s: %s", model, e)
            return None


_ollama_client: Optional[OllamaClient] = None


def get_ollama_client() -> OllamaClient:
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = OllamaClient()
    return _ollama_client
