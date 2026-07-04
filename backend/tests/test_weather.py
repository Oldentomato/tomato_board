from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.schemas import TodayWeather, WeekWeather
from app.services import weather


@pytest.fixture(autouse=True)
def clear_weather_cache():
    weather._cache.clear()
    yield
    weather._cache.clear()


@pytest.mark.asyncio
async def test_fetch_today_weather_uses_cache():
    cached = TodayWeather(
        date="2026-07-04",
        temp=25.0,
        feelsLike=26.0,
        condition="맑음",
        icon="sun",
        humidity=60,
        windSpeed=3.0,
        location="Seoul",
    )
    weather._set_cache(weather._cache_key("today", 37.5, 127.0), cached)

    with patch.object(weather, "_fetch_open_meteo", new=AsyncMock()) as mock_fetch:
        result = await weather.fetch_today_weather(37.5, 127.0)

    assert result == cached
    mock_fetch.assert_not_called()


@pytest.mark.asyncio
async def test_with_retry_succeeds_after_transient_failure():
    attempts = {"count": 0}

    async def flaky_request() -> str:
        attempts["count"] += 1
        if attempts["count"] < 2:
            raise httpx.ConnectTimeout("connect timed out")
        return "ok"

    result = await weather._with_retry(flaky_request)

    assert result == "ok"
    assert attempts["count"] == 2


@pytest.mark.asyncio
async def test_with_retry_raises_weather_fetch_error():
    async def always_fail() -> str:
        raise httpx.ConnectTimeout("connect timed out")

    with pytest.raises(weather.WeatherFetchError, match="Weather service unavailable"):
        await weather._with_retry(always_fail)


@pytest.mark.asyncio
async def test_fetch_week_weather_parses_response():
    mock_data = {
        "daily": {
            "time": ["2026-07-04"],
            "weather_code": [0],
            "temperature_2m_min": [20.0],
            "temperature_2m_max": [28.0],
            "precipitation_probability_max": [10],
        }
    }

    with patch.object(weather, "_fetch_open_meteo", new=AsyncMock(return_value=mock_data)):
        result = await weather.fetch_week_weather(37.5, 127.0)

    assert isinstance(result, WeekWeather)
    assert len(result.days) == 1
    assert result.days[0].tempMin == 20.0
    assert result.days[0].tempMax == 28.0
    assert result.days[0].condition == "맑음"


@pytest.mark.asyncio
async def test_resolve_location_name_falls_back_to_coordinates():
    with patch.object(
        weather,
        "_with_retry",
        new=AsyncMock(side_effect=weather.WeatherFetchError("Weather service unavailable")),
    ):
        location = await weather._resolve_location_name(37.5665, 126.9780)

    assert location == "37.5665, 126.9780"
