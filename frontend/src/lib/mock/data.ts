import { addDays, format, startOfDay } from "date-fns";
import type { User } from "@/lib/types/auth";
import type { CalendarEvent } from "@/lib/types/calendar";
import type { Memo } from "@/lib/types/memo";
import type { DayForecast, TodayWeather } from "@/lib/types/weather";

export const MOCK_USER: User = {
  id: "mock-user-1",
  email: "demo@tomato.board",
  name: "토마토 사용자",
  picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=tomato",
};

const today = startOfDay(new Date());

export const MOCK_TODAY_WEATHER: TodayWeather = {
  date: format(today, "yyyy-MM-dd"),
  temp: 22,
  feelsLike: 24,
  condition: "맑음",
  icon: "sun",
  humidity: 45,
  windSpeed: 2.8,
  location: "서울특별시",
};

const weekConditions: Array<{
  condition: string;
  icon: string;
  tempMin: number;
  tempMax: number;
  precipitation: number;
}> = [
  { condition: "맑음", icon: "sun", tempMin: 15, tempMax: 24, precipitation: 0 },
  { condition: "구름 많음", icon: "cloudy", tempMin: 16, tempMax: 23, precipitation: 10 },
  { condition: "흐림", icon: "partly-cloudy", tempMin: 14, tempMax: 20, precipitation: 30 },
  { condition: "비", icon: "rain", tempMin: 13, tempMax: 18, precipitation: 80 },
  { condition: "소나기", icon: "drizzle", tempMin: 14, tempMax: 19, precipitation: 60 },
  { condition: "맑음", icon: "sun", tempMin: 16, tempMax: 25, precipitation: 5 },
  { condition: "구름 많음", icon: "partly-cloudy", tempMin: 17, tempMax: 26, precipitation: 15 },
];

export function getMockWeekDays(): DayForecast[] {
  return weekConditions.map((item, index) => ({
    date: format(addDays(today, index), "yyyy-MM-dd"),
    ...item,
  }));
}

export function getInitialMockEvents(): CalendarEvent[] {
  const day = startOfDay(new Date());
  return [
    {
      id: "evt-1",
      title: "스프린트 회고",
      start: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 14, 0).toISOString(),
      end: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 15, 0).toISOString(),
      description: "이번 스프린트 회고 및 다음 계획",
      color: "#E74C3C",
    },
    {
      id: "evt-2",
      title: "점심 약속",
      start: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 3, 12, 0).toISOString(),
      end: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 3, 13, 30).toISOString(),
      description: "강남역 근처",
    },
    {
      id: "evt-3",
      title: "코드 리뷰",
      start: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 5, 10, 0).toISOString(),
      end: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 5, 11, 0).toISOString(),
    },
  ];
}

export function getInitialMockMemos(): Memo[] {
  const now = new Date().toISOString();
  return [
    {
      id: "memo-1",
      content: "우유 사기 🥛",
      color: "#FFF9C4",
      side: "left",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "memo-2",
      content: "PR 리뷰 요청 보내기",
      color: "#BBDEFB",
      side: "right",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "memo-3",
      content: "주말에 산책하기",
      color: "#C8E6C9",
      side: "left",
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
