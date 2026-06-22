"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTodayWeather, getWeekWeather } from "@/lib/api/weather";
import { isMockMode } from "@/lib/config/env";
import { clearGeoCoordsCache, useGeolocation } from "@/hooks/useGeolocation";
import type { GeoCoords } from "@/lib/types/geo";
import type { TodayWeather, WeekWeather } from "@/lib/types/weather";

const WEATHER_REFETCH_INTERVAL_MS = 5 * 60 * 1000;

type WeatherContextValue = {
  today: TodayWeather | undefined;
  week: WeekWeather | undefined;
  coords: GeoCoords | undefined;
  updatedAt: number | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | undefined;
  refetch: () => void;
};

const WeatherContext = createContext<WeatherContextValue | null>(null);

export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const mock = isMockMode();
  const geoQuery = useGeolocation(!mock);
  const coords = geoQuery.data;

  const todayQuery = useQuery({
    queryKey: ["weather", "today", coords?.lat, coords?.lon],
    queryFn: () => getTodayWeather(coords!),
    enabled: mock || !!coords,
    staleTime: WEATHER_REFETCH_INTERVAL_MS,
    refetchInterval: WEATHER_REFETCH_INTERVAL_MS,
  });

  const weekQuery = useQuery({
    queryKey: ["weather", "week", coords?.lat, coords?.lon],
    queryFn: () => getWeekWeather(coords!),
    enabled: mock || !!coords,
    staleTime: WEATHER_REFETCH_INTERVAL_MS,
    refetchInterval: WEATHER_REFETCH_INTERVAL_MS,
  });

  const value: WeatherContextValue = {
    today: todayQuery.data,
    week: weekQuery.data,
    coords,
    updatedAt: todayQuery.dataUpdatedAt || undefined,
    isLoading: geoQuery.isLoading || todayQuery.isLoading || weekQuery.isLoading,
    isError: geoQuery.isError || todayQuery.isError || weekQuery.isError,
    errorMessage:
      (geoQuery.error as Error | undefined)?.message ??
      (todayQuery.error as Error | undefined)?.message ??
      (weekQuery.error as Error | undefined)?.message,
    refetch: () => {
      clearGeoCoordsCache();
      geoQuery.refetch();
      todayQuery.refetch();
      weekQuery.refetch();
    },
  };

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}

export function useWeather() {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error("useWeather must be used within WeatherProvider");
  }
  return context;
}
