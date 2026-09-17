"""Convenience layer combining web.search results with automation.browser fallback."""
from __future__ import annotations

from automation.browser import search_web
from core.logger import get_logger
from web.search import search_snippets

log = get_logger("browser_search")


def answer_or_open(query: str) -> str:
    """
    Try to answer inline with search snippets; if unavailable, fall back
    to opening a browser search tab.
    """
    snippets = search_snippets(query)
    if snippets:
        joined = " ".join(snippets[:2])
        return f"Here's what I found: {joined}"
    return search_web(query)
