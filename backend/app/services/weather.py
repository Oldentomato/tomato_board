from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

import httpx

from app.schemas import DayForecast, TodayWeather, WeekWeather

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
NOMINATIM_USER_AGENT = "TomatoBoard/1.0"

WEATHER_TIMEOUT = httpx.Timeout(connect=20.0, read=20.0, write=10.0, pool=10.0)
NOMINATIM_TIMEOUT = httpx.Timeout(connect=10.0, read=10.0, write=5.0, pool=5.0)
CACHE_TTL_SECONDS = 300
MAX_RETRIES = 3

RETRYABLE = (
    httpx.ConnectTimeout,
    httpx.ReadTimeout,
    httpx.ConnectError,
    httpx.PoolTimeout,
    httpx.RemoteProtocolError,
)

# WMO weather interpretation codes
_CONDITION_MAP: dict[int, tuple[str, str]] = {
    0: ("맑음", "sun"),
    1: ("대체로 맑음", "partly-cloudy"),
    2: ("구름 많음", "cloudy"),
    3: ("흐림", "cloudy"),
    45: ("안개", "cloudy"),
    48: ("짙은 안개", "cloudy"),
    51: ("이슬비", "drizzle"),
    53: ("이슬비", "drizzle"),
    55: ("이슬비", "drizzle"),
    61: ("비", "rain"),
    63: ("비", "rain"),
    65: ("폭우", "rain"),
    66: ("진눈깨비", "rain"),
    67: ("진눈깨비", "rain"),
    71: ("눈", "cloudy"),
    73: ("눈", "cloudy"),
    75: ("폭설", "cloudy"),
    80: ("소나기", "drizzle"),
    81: ("소나기", "rain"),
    82: ("강한 소나기", "rain"),
    95: ("뇌우", "rain"),
}

_client: httpx.AsyncClient | None = None
_cache: dict[str, tuple[float, Any]] = {}

T = TypeVar("T")


class WeatherFetchError(Exception):
    """외부 날씨 API 호출 실패."""


def _cache_key(prefix: str, lat: float, lon: float) -> str:
    return f"{prefix}:{round(lat, 2)}:{round(lon, 2)}"


def _get_cached(key: str) -> Any | None:
    entry = _cache.get(key)
    if entry and time.monotonic() - entry[0] < CACHE_TTL_SECONDS:
        return entry[1]
    return None


def _set_cache(key: str, value: Any) -> None:
    _cache[key] = (time.monotonic(), value)


async def _ensure_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=WEATHER_TIMEOUT,
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _client


async def close_weather_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def _with_retry(request: Callable[[], Awaitable[T]]) -> T:
    last_exc: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            return await request()
        except RETRYABLE as exc:
            last_exc = exc
            logger.warning(
                "Weather API request failed (attempt %s/%s): %s",
                attempt + 1,
                MAX_RETRIES,
                exc,
            )
            if attempt + 1 == MAX_RETRIES:
                break
            await asyncio.sleep(0.5 * (2**attempt))
    raise WeatherFetchError("Weather service unavailable") from last_exc


def _map_weather_code(code: int | None) -> tuple[str, str]:
    if code is None:
        return ("알 수 없음", "cloudy")
    return _CONDITION_MAP.get(code, ("흐림", "cloudy"))


def _format_nominatim_address(address: dict) -> str | None:
    borough = address.get("borough")
    suburb = (
        address.get("suburb")
        or address.get("quarter")
        or address.get("neighbourhood")
        or address.get("city_district")
    )
    city = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("municipality")
        or address.get("county")
    )
    state = address.get("state") or address.get("province") or address.get("region")
    country = address.get("country")

    if borough and city and borough != city:
        return f"{borough}, {city}"
    if suburb and city and suburb != city:
        return f"{suburb}, {city}"
    if city and state and city != state:
        return f"{city}, {state}"
    if city:
        return city
    if state:
        return state
    if country:
        return country
    return None


async def _fetch_open_meteo(params: dict[str, Any]) -> dict[str, Any]:
    async def _request() -> dict[str, Any]:
        client = await _ensure_client()
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        return response.json()

    return await _with_retry(_request)


async def _resolve_location_name(lat: float, lon: float) -> str:
    params = {
        "lat": lat,
        "lon": lon,
        "format": "json",
        "addressdetails": 1,
        "accept-language": "ko",
    }
    headers = {"User-Agent": NOMINATIM_USER_AGENT}
    fallback = f"{lat:.4f}, {lon:.4f}"

    async def _request() -> str:
        client = await _ensure_client()
        response = await client.get(
            NOMINATIM_REVERSE_URL,
            params=params,
            headers=headers,
            timeout=NOMINATIM_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()

        address = data.get("address") or {}
        location = _format_nominatim_address(address)
        if location:
            return location

        display_name = data.get("display_name")
        if display_name:
            parts = [part.strip() for part in display_name.split(",")]
            if len(parts) >= 2:
                return f"{parts[-3] if len(parts) >= 3 else parts[0]}, {parts[-2]}"
            return parts[0]

        return fallback

    try:
        return await _with_retry(_request)
    except WeatherFetchError:
        logger.warning("Nominatim lookup failed for lat=%s lon=%s; using coordinates", lat, lon)
        return fallback


async def fetch_today_weather(lat: float, lon: float) -> TodayWeather:
    cache_key = _cache_key("today", lat, lon)
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,apparent_temperature,weather_code",
        "timezone": "auto",
        "forecast_days": 1,
    }

    data, location = await asyncio.gather(
        _fetch_open_meteo(params),
        _resolve_location_name(lat, lon),
    )

    current = data["current"]
    condition, icon = _map_weather_code(current.get("weather_code"))

    result = TodayWeather(
        date=current["time"][:10],
        temp=round(current["temperature_2m"], 1),
        feelsLike=round(current["apparent_temperature"], 1),
        condition=condition,
        icon=icon,
        humidity=int(current["relative_humidity_2m"]),
        windSpeed=round(current["wind_speed_10m"], 1),
        location=location,
    )
    _set_cache(cache_key, result)
    return result


async def fetch_week_weather(lat: float, lon: float) -> WeekWeather:
    cache_key = _cache_key("week", lat, lon)
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        "timezone": "auto",
        "forecast_days": 7,
    }

    data = await _fetch_open_meteo(params)
    daily = data["daily"]
    days: list[DayForecast] = []

    for i in range(len(daily["time"])):
        condition, icon = _map_weather_code(daily["weather_code"][i])
        precipitation = daily["precipitation_probability_max"][i]
        days.append(
            DayForecast(
                date=daily["time"][i],
                tempMin=round(daily["temperature_2m_min"][i], 1),
                tempMax=round(daily["temperature_2m_max"][i], 1),
                condition=condition,
                icon=icon,
                precipitation=int(precipitation) if precipitation is not None else 0,
            )
        )

    result = WeekWeather(days=days)
    _set_cache(cache_key, result)
    return result
