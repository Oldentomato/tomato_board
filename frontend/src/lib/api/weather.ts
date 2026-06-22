import { isMockMode } from "@/lib/config/env";
import { mockGetTodayWeather, mockGetWeekWeather } from "@/lib/mock/handlers";
import type { GeoCoords } from "@/lib/types/geo";
import { apiClient } from "./client";
import type { TodayWeather, WeekWeather } from "@/lib/types/weather";

function weatherParams(coords: GeoCoords) {
  return { lat: coords.lat, lon: coords.lon };
}

export function getTodayWeather(coords: GeoCoords) {
  if (isMockMode()) return mockGetTodayWeather();
  return apiClient<TodayWeather>("/weather/today", {
    params: weatherParams(coords),
  });
}

export function getWeekWeather(coords: GeoCoords) {
  if (isMockMode()) return mockGetWeekWeather();
  return apiClient<WeekWeather>("/weather/week", {
    params: weatherParams(coords),
  });
}
