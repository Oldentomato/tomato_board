import httpx

from app.schemas import DayForecast, TodayWeather, WeekWeather

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
NOMINATIM_USER_AGENT = "TomatoBoard/1.0"

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


async def _resolve_location_name(lat: float, lon: float) -> str:
    params = {
        "lat": lat,
        "lon": lon,
        "format": "json",
        "addressdetails": 1,
        "accept-language": "ko",
    }
    headers = {"User-Agent": NOMINATIM_USER_AGENT}

    try:
        async with httpx.AsyncClient(timeout=5.0, headers=headers) as client:
            response = await client.get(NOMINATIM_REVERSE_URL, params=params)
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

        return f"{lat:.4f}, {lon:.4f}"
    except httpx.HTTPError:
        return f"{lat:.4f}, {lon:.4f}"


async def fetch_today_weather(lat: float, lon: float) -> TodayWeather:
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,apparent_temperature,weather_code",
        "timezone": "auto",
        "forecast_days": 1,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        data = response.json()

    current = data["current"]
    condition, icon = _map_weather_code(current.get("weather_code"))
    location = await _resolve_location_name(lat, lon)

    return TodayWeather(
        date=current["time"][:10],
        temp=round(current["temperature_2m"], 1),
        feelsLike=round(current["apparent_temperature"], 1),
        condition=condition,
        icon=icon,
        humidity=int(current["relative_humidity_2m"]),
        windSpeed=round(current["wind_speed_10m"], 1),
        location=location,
    )


async def fetch_week_weather(lat: float, lon: float) -> WeekWeather:
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        "timezone": "auto",
        "forecast_days": 7,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        data = response.json()

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

    return WeekWeather(days=days)
