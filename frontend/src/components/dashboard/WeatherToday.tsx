"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Droplets, MapPin, RefreshCw, Wind } from "lucide-react";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { useWeather } from "@/hooks/useWeather";
import { cn } from "@/lib/utils/cn";
import { WeatherIcon } from "./WeatherIcon";

function formatCoords(lat: number, lon: number) {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

export function WeatherToday() {
  const { today, coords, updatedAt, isLoading, isError, errorMessage, refetch } = useWeather();
  const theme = useSkyTheme();

  if (isLoading) {
    return (
      <section className="animate-pulse space-y-4 px-2 py-4">
        <div className={cn("h-4 w-32 rounded-full opacity-30", theme.text, "bg-current")} />
        <div className={cn("h-20 w-40 rounded-full opacity-20", theme.text, "bg-current")} />
      </section>
    );
  }

  if (isError || !today) {
    return (
      <section className="px-2 py-4">
        <p className={cn("text-sm", theme.muted)}>
          {errorMessage ?? "날씨 정보를 불러올 수 없습니다."}
        </p>
        <button
          type="button"
          onClick={refetch}
          className="mt-3 flex items-center gap-2 text-sm font-medium text-[#E74C3C]"
        >
          <RefreshCw className="h-4 w-4" />
          다시 시도
        </button>
      </section>
    );
  }

  const formattedDate = format(parseISO(today.date), "yyyy년 M월 d일 EEEE", {
    locale: ko,
  });

  return (
    <section className="px-2 py-3 sm:px-4 lg:py-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cn("text-sm font-medium", theme.muted)}>{formattedDate}</p>
          <div className={cn("mt-1 flex items-start gap-1.5 text-sm", theme.muted)}>
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <p>{today.location}</p>
              {coords && (
                <p className={cn("mt-0.5 text-xs lg:hidden", theme.faint)}>
                  {formatCoords(coords.lat, coords.lon)}
                </p>
              )}
            </div>
          </div>
        </div>
        <WeatherIcon icon={today.icon} className={cn("h-12 w-12 lg:h-11 lg:w-11", theme.icon)} />
      </div>

      <div className="mt-4 flex items-end gap-3 lg:mt-3">
        <span className={cn("text-6xl font-light tracking-tight sm:text-7xl lg:text-6xl", theme.text)}>
          {today.temp}°
        </span>
        <span className={cn("mb-2 text-lg font-medium lg:mb-1.5 lg:text-base", theme.muted)}>
          {today.condition}
        </span>
      </div>

      <p className={cn("mt-1 text-sm", theme.muted)}>체감 {today.feelsLike}°</p>

      <div className={cn("mt-4 flex flex-wrap gap-4 text-sm lg:mt-3 lg:gap-5", theme.muted)}>
        <span className="flex items-center gap-1.5">
          <Droplets className="h-4 w-4" />
          습도 {today.humidity}%
        </span>
        <span className="flex items-center gap-1.5">
          <Wind className="h-4 w-4" />
          풍속 {today.windSpeed} m/s
        </span>
      </div>

      {updatedAt && (
        <p className={cn("mt-3 text-xs lg:mt-2", theme.faint)}>
          {format(new Date(updatedAt), "HH:mm", { locale: ko })} 업데이트
        </p>
      )}
    </section>
  );
}
