"""
Deterministic Command Handler for JARVIS.

Maps structured actions from the intent router to safe, whitelisted Python handlers.
No arbitrary shell execution or dynamic code execution.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from automation import browser, files, media, screenshot
from automation.applications import get_application_registry
from core.logger import get_logger
from productivity.calculator import evaluate as calc_evaluate
from productivity.notes import get_notes_manager
from productivity.reminders import get_reminder_manager
from productivity.tasks import get_task_manager
from productivity.timers import get_timer_manager
from system.system_info import describe as describe_system
from web.browser_search import answer_or_open
from web.weather import get_weather

log = get_logger("commands")


class CommandExecutor:
    """Whitelisted action executor."""

    def __init__(self) -> None:
        self._apps = get_application_registry()
        self._timers = get_timer_manager()
        self._reminders = get_reminder_manager()
        self._notes = get_notes_manager()
        self._tasks = get_task_manager()

    def execute(
        self,
        command_name: str,
        params: Dict[str, Any],
        raw_text: str = "",
        on_speak: Optional[callable] = None,
    ) -> str:
        log.info("Executing deterministic command: %s with params: %s", command_name, params)
        cmd = (command_name or "").lower().strip()

        try:
            if cmd == "take_screenshot":
                return screenshot.take_screenshot()

            if cmd == "open_application":
                app_name = params.get("application") or raw_text
                return self._apps.open(app_name)

            if cmd == "close_application":
                app_name = params.get("application") or raw_text
                return self._apps.close(app_name)

            if cmd == "open_folder":
                folder_name = params.get("folder") or "downloads"
                return files.open_known_folder(folder_name)

            if cmd == "open_website":
                site_name = params.get("site") or "google"
                return browser.open_site(site_name)

            if cmd == "web_search":
                query = params.get("query") or raw_text
                return answer_or_open(query)

            if cmd == "get_time":
                now = datetime.now()
                return f"The current time is {now.strftime('%I:%M %p')}."

            if cmd == "get_date":
                now = datetime.now()
                return f"Today is {now.strftime('%A, %B %d, %Y')}."

            if cmd == "system_info":
                return describe_system(raw_text)

            if cmd == "set_timer":
                duration = params.get("duration") or raw_text
                return self._timers.start(
                    duration,
                    lambda label: on_speak(f"Your {label} timer is up.") if on_speak else None,
                )

            if cmd == "set_reminder":
                task = params.get("task") or raw_text
                time_str = params.get("time") or ""
                return self._reminders.add(task, time_str)

            if cmd == "create_note":
                title = params.get("title") or "Note"
                content = params.get("content") or raw_text
                return self._notes.create(title=title, content=content)

            if cmd == "add_task":
                task_desc = params.get("task") or raw_text
                return self._tasks.add(task_desc)

            if cmd == "calculator":
                expr = params.get("expression") or raw_text
                return calc_evaluate(expr)

            if cmd == "weather":
                loc = params.get("location") or "your area"
                return get_weather(loc)

            if cmd == "media_control":
                action = params.get("action") or raw_text
                return media.control(action)

            if cmd in ("list_files", "search_files"):
                filetype = params.get("filetype") or params.get("query")
                if filetype:
                    found = files.find_files_by_type(filetype)
                    return f"Found {len(found)} matching file(s)." if found else "No matching files found."
                return files.open_known_folder("documents")

            log.warning("Unknown command requested: %s", command_name)
            return f"I recognized the action '{command_name}', but I don't have a handler registered for it."

        except Exception as e:
            log.exception("Error executing command %s: %s", command_name, e)
            return f"An error occurred while executing {command_name}: {e}"


_executor: Optional[CommandExecutor] = None


def get_command_executor() -> CommandExecutor:
    global _executor
    if _executor is None:
        _executor = CommandExecutor()
    return _executor
