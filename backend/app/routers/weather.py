from fastapi import APIRouter, Query

from app.schemas import TodayWeather, WeekWeather
from app.services.weather import fetch_today_weather, fetch_week_weather

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/today", response_model=TodayWeather)
async def today_weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    return await fetch_today_weather(lat, lon)


@router.get("/week", response_model=WeekWeather)
async def week_weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    return await fetch_week_weather(lat, lon)
