"""
Safe file/folder operations.

Destructive operations (delete/move/overwrite/bulk-rename) are NOT
executed directly here — callers must route them through the
security.confirmations flow before invoking the underlying methods
marked _destructive.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from typing import List

from core.logger import get_logger

log = get_logger("files")

_KNOWN_FOLDERS = {
    "downloads": Path.home() / "Downloads",
    "documents": Path.home() / "Documents",
    "desktop": Path.home() / "Desktop",
}


def open_known_folder(name: str) -> str:
    folder = _KNOWN_FOLDERS.get(name.lower())
    if not folder or not folder.exists():
        return f"I couldn't find your {name} folder."
    _reveal(folder)
    return f"Opening your {name.title()} folder."


def _reveal(path: Path) -> None:
    if sys.platform == "win32":
        os.startfile(str(path))  # noqa: S606 - explorer open, not shell exec
    else:
        subprocess.Popen(["xdg-open", str(path)])


def create_folder(name: str, parent: Path | None = None) -> str:
    base = parent or (Path.home() / "Desktop")
    target = base / name
    try:
        target.mkdir(parents=True, exist_ok=False)
        log.info("Created folder: %s", target)
        return f"Created a folder called {name}."
    except FileExistsError:
        return f"A folder called {name} already exists there."
    except Exception:
        log.exception("Failed to create folder %s", target)
        return f"I couldn't create that folder."


def find_files_by_type(filetype: str, search_root: Path | None = None, limit: int = 20) -> List[Path]:
    root = search_root or Path.home()
    ext = filetype.lower().lstrip(".")
    results: List[Path] = []
    try:
        for p in root.rglob(f"*.{ext}"):
            results.append(p)
            if len(results) >= limit:
                break
    except PermissionError:
        pass
    return results


def delete_path_destructive(path: Path) -> str:
    """
    DESTRUCTIVE. Must only be called after explicit user confirmation via
    security.confirmations.ConfirmationManager. Uses the recycle bin rather
    than a permanent delete where possible.
    """
    try:
        from send2trash import send2trash
        send2trash(str(path))
        log.info("Sent to recycle bin: %s", path)
        return f"Moved {path.name} to the recycle bin."
    except ImportError:
        log.warning("send2trash not installed; refusing permanent delete")
        return "I can't safely delete that without the send2trash package installed."
    except Exception:
        log.exception("Failed to delete %s", path)
        return f"I couldn't delete {path.name}."
