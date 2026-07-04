from fastapi import APIRouter, HTTPException, Query

from app.schemas import TodayWeather, WeekWeather
from app.services.weather import WeatherFetchError, fetch_today_weather, fetch_week_weather

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/today", response_model=TodayWeather)
async def today_weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    try:
        return await fetch_today_weather(lat, lon)
    except WeatherFetchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/week", response_model=WeekWeather)
async def week_weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    try:
        return await fetch_week_weather(lat, lon)
    except WeatherFetchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
