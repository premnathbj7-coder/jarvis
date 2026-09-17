"""Browser control: open default browser, search, known sites, URL validation."""
from __future__ import annotations

import re
import webbrowser
from urllib.parse import quote_plus

from core.logger import get_logger

log = get_logger("browser")

_KNOWN_SITES = {
    "youtube": "https://www.youtube.com",
    "github": "https://github.com",
    "gmail": "https://mail.google.com",
    "google": "https://www.google.com",
}

_SAFE_URL_PATTERN = re.compile(r"^https://[a-zA-Z0-9.\-]+(/.*)?$")


def _is_safe_url(url: str) -> bool:
    """Only allow well-formed https URLs — no local files, no arbitrary schemes."""
    return bool(_SAFE_URL_PATTERN.match(url))


def open_site(name: str) -> str:
    url = _KNOWN_SITES.get(name.lower())
    if not url:
        return f"I don't have {name} registered as a known site."
    webbrowser.open(url)
    log.info("Opened site: %s", name)
    return f"Opening {name.title()}."


def open_url(url: str) -> str:
    if not _is_safe_url(url):
        log.warning("Blocked unsafe URL open request: %s", url)
        return "I can't open that link — it doesn't look like a valid, safe web address."
    webbrowser.open(url)
    return f"Opening {url}."


def search_web(query: str) -> str:
    if not query.strip():
        return "What would you like me to search for?"
    url = f"https://www.google.com/search?q={quote_plus(query)}"
    webbrowser.open(url)
    log.info("Web search opened for: %s", query)
    return f"Searching for {query}."
