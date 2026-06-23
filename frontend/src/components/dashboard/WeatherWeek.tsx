"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { useWeather } from "@/hooks/useWeather";
import type { DayForecast } from "@/lib/types/weather";
import { cn } from "@/lib/utils/cn";
import { WeatherIcon } from "./WeatherIcon";

function DayCard({
  day,
  isSelected,
  onSelect,
  index,
}: {
  day: DayForecast;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const theme = useSkyTheme();
  const dayLabel = format(parseISO(day.date), "EEE", { locale: ko });
  const dateLabel = format(parseISO(day.date), "M/d");

  return (
    <button
      type="button"
      onClick={onSelect}
      className="enter-item flex min-w-[4.5rem] shrink-0 snap-center flex-col items-center gap-1.5 px-3 py-2 focus:outline-none sm:min-w-0 sm:flex-1"
      style={{ animationDelay: `${280 + index * 55}ms` }}
    >
      <span className={cn("text-xs font-medium", theme.muted)}>{dayLabel}</span>
      <span className={cn("text-sm font-semibold", isSelected ? theme.text : theme.muted)}>
        {dateLabel}
      </span>
      <WeatherIcon icon={day.icon} className={cn("h-5 w-5", theme.icon)} />
      <div className={cn("text-xs", theme.muted)}>
        <span>{day.tempMax}°</span>
        <span className="mx-0.5">/</span>
        <span>{day.tempMin}°</span>
      </div>
      {isSelected && <span className="mt-0.5 h-0.5 w-5 rounded-full bg-[#E74C3C]" />}
    </button>
  );
}

export function WeatherWeek() {
  const { week, isLoading, isError, errorMessage, refetch } = useWeather();
  const theme = useSkyTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (isLoading) {
    return (
      <section className="px-2 py-4 sm:px-4">
        <div className="mb-4 h-6 w-32 animate-pulse rounded-full bg-current opacity-20" />
        <div className="scrollbar-subtle scroll-fade-x -mx-2 flex gap-2 overflow-x-auto px-2 pb-1 sm:mx-0 sm:px-0 lg:justify-between lg:overflow-x-visible">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-24 min-w-[4.5rem] shrink-0 animate-pulse rounded-2xl opacity-20 sm:min-w-0 sm:flex-1",
                theme.text,
                "bg-current",
              )}
            />
          ))}
        </div>
      </section>
    );
  }

  if (isError || !week?.days.length) {
    return (
      <section className="px-2 py-4">
        <p className={cn("text-sm", theme.muted)}>
          {errorMessage ?? "주간 날씨를 불러올 수 없습니다."}
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

  const selected = week.days[selectedIndex] ?? week.days[0];
  const selectedDateLabel = format(parseISO(selected.date), "M월 d일 (EEEE)", {
    locale: ko,
  });

  return (
    <section className="px-2 py-3 sm:px-4 lg:py-2">
      <h2 className={cn("mb-3 text-base font-semibold lg:mb-2 lg:text-sm", theme.text)}>이번 주 날씨</h2>

      <div className="scrollbar-subtle scroll-fade-x -mx-2 flex snap-x snap-mandatory gap-1 overflow-x-auto px-2 pb-1 sm:mx-0 sm:gap-2 sm:px-0 lg:justify-between lg:overflow-x-visible lg:pb-0">
        {week.days.map((day, index) => (
          <DayCard
            key={day.date}
            day={day}
            index={index}
            isSelected={index === selectedIndex}
            onSelect={() => setSelectedIndex(index)}
          />
        ))}
      </div>

      <div className="enter-item mt-3 lg:mt-2" style={{ animationDelay: "680ms" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("truncate text-sm font-medium lg:text-xs", theme.text)}>
              {selectedDateLabel}
            </p>
            <p className={cn("mt-0.5 text-sm lg:text-xs", theme.muted)}>{selected.condition}</p>
          </div>
          <WeatherIcon icon={selected.icon} className={cn("h-8 w-8 shrink-0 lg:h-7 lg:w-7", theme.icon)} />
        </div>
        <div className={cn("mt-2 flex flex-wrap gap-4 text-sm lg:gap-3 lg:text-xs", theme.muted)}>
          <span>
            최저 <strong className={theme.text}>{selected.tempMin}°</strong>
          </span>
          <span>
            최고 <strong className={theme.text}>{selected.tempMax}°</strong>
          </span>
          <span>
            강수 <strong className={theme.text}>{selected.precipitation}%</strong>
          </span>
        </div>
      </div>
    </section>
  );
}
