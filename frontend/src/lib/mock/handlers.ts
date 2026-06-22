import { ApiError } from "@/lib/api/client";
import type { User } from "@/lib/types/auth";
import type {
  CalendarEvent,
  CalendarEventsResponse,
  CreateEventInput,
  UpdateEventInput,
} from "@/lib/types/calendar";
import type { MailMessagesResponse, MailSummary } from "@/lib/types/mail";
import type { CreateMemoInput, Memo, MemoPositionInput, MemosResponse, UpdateMemoInput } from "@/lib/types/memo";
import type { TodayWeather, WeekWeather } from "@/lib/types/weather";
import {
  MOCK_MAIL_MESSAGES,
  MOCK_TODAY_WEATHER,
  MOCK_USER,
  getMockWeekDays,
} from "./data";
import { hasMockSession, clearMockSession } from "./session";
import {
  createMockMemo,
  deleteMockMemo,
  getMockMemos,
  moveMockMemo,
  updateMockMemo,
} from "./memoStore";
import {
  createMockEvent,
  deleteMockEvent,
  getMockEvents,
  updateMockEvent,
} from "./store";

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireSession() {
  if (!hasMockSession()) {
    throw new ApiError(401, "Unauthorized");
  }
}

export async function mockGetMe(): Promise<User> {
  await delay();
  requireSession();
  return MOCK_USER;
}

export async function mockLogout(): Promise<void> {
  await delay(150);
  clearMockSession();
}

export async function mockGetTodayWeather(): Promise<TodayWeather> {
  await delay();
  requireSession();
  return MOCK_TODAY_WEATHER;
}

export async function mockGetWeekWeather(): Promise<WeekWeather> {
  await delay();
  requireSession();
  return { days: getMockWeekDays() };
}

export async function mockGetMailSummary(): Promise<MailSummary> {
  await delay();
  requireSession();
  const unreadCount = MOCK_MAIL_MESSAGES.filter((m) => !m.isRead).length;
  return { unreadCount, recent: MOCK_MAIL_MESSAGES.slice(0, 5) };
}

export async function mockGetMailMessages(
  page = 1,
  limit = 10,
): Promise<MailMessagesResponse> {
  await delay();
  requireSession();
  const start = (page - 1) * limit;
  return {
    messages: MOCK_MAIL_MESSAGES.slice(start, start + limit),
    total: MOCK_MAIL_MESSAGES.length,
  };
}

export async function mockGetEvents(from: string, to: string): Promise<CalendarEventsResponse> {
  await delay();
  requireSession();
  return { events: getMockEvents(from, to) };
}

export async function mockCreateEvent(input: CreateEventInput): Promise<CalendarEvent> {
  await delay();
  requireSession();
  return createMockEvent(input);
}

export async function mockUpdateEvent(
  id: string,
  input: UpdateEventInput,
): Promise<CalendarEvent> {
  await delay();
  requireSession();
  return updateMockEvent(id, input);
}

export async function mockDeleteEvent(id: string): Promise<void> {
  await delay();
  requireSession();
  deleteMockEvent(id);
}

export async function mockGetMemos(): Promise<MemosResponse> {
  await delay();
  requireSession();
  return { memos: getMockMemos() };
}

export async function mockCreateMemo(input: CreateMemoInput): Promise<Memo> {
  await delay();
  requireSession();
  return createMockMemo(input);
}

export async function mockUpdateMemo(id: string, input: UpdateMemoInput): Promise<Memo> {
  await delay();
  requireSession();
  return updateMockMemo(id, input);
}

export async function mockDeleteMemo(id: string): Promise<void> {
  await delay();
  requireSession();
  deleteMockMemo(id);
}

export async function mockMoveMemo(id: string, input: MemoPositionInput): Promise<Memo> {
  await delay(150);
  requireSession();
  return moveMockMemo(id, input);
}
