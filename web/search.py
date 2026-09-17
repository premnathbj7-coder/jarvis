"""
Web search for current-information queries.

Distinguishes "let the AI answer from its own knowledge" (handled
by ai/) from "this needs a live lookup" (handled here). Uses
SerpAPI if SEARCH_API_KEY is configured; otherwise falls back to
just opening a browser search (see automation/browser.py), which
the command router does for WEB_SEARCH intent.
"""
from __future__ import annotations

from typing import List, Optional

import requests

from core.config_loader import get_config
from core.logger import get_logger

log = get_logger("web_search")


def search_snippets(query: str, limit: int = 5) -> Optional[List[str]]:
    """
    Return a list of short result snippets for `query`, or None if no
    search API key is configured / the request fails.
    """
    cfg = get_config()
    api_key = cfg.get_secret("SEARCH_API_KEY")
    if not api_key:
        log.debug("SEARCH_API_KEY not set; skipping API search")
        return None

    try:
        resp = requests.get(
            "https://serpapi.com/search",
            params={"q": query, "api_key": api_key, "num": limit},
            timeout=8,
        )
        resp.raise_for_status()
        data = resp.json()
        results = []
        for item in data.get("organic_results", [])[:limit]:
            snippet = item.get("snippet") or item.get("title")
            if snippet:
                results.append(snippet)
        return results or None
    except requests.RequestException:
        log.warning("Web search API request failed", exc_info=True)
        return None
