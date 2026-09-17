"""Weather lookup via OpenWeatherMap."""
from __future__ import annotations

from typing import Optional

import requests

from core.config_loader import get_config
from core.logger import get_logger

log = get_logger("weather")


def get_weather(location: str) -> str:
    cfg = get_config()
    api_key = cfg.get_secret("WEATHER_API_KEY")
    if not api_key:
        return "Weather lookups require a WEATHER_API_KEY in your .env file."

    units = cfg.get("web.weather_units", "metric")
    try:
        resp = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": location, "appid": api_key, "units": units},
            timeout=8,
        )
        if resp.status_code == 404:
            return f"I couldn't find weather data for {location}."
        resp.raise_for_status()
        data = resp.json()
        temp = data["main"]["temp"]
        desc = data["weather"][0]["description"]
        unit_symbol = "C" if units == "metric" else "F"
        return f"It's currently {temp:.0f} degrees {unit_symbol} with {desc} in {location.title()}."
    except requests.RequestException:
        log.warning("Weather API request failed", exc_info=True)
        return "I couldn't reach the weather service right now."
    except (KeyError, IndexError):
        return "I received an unexpected response from the weather service."
