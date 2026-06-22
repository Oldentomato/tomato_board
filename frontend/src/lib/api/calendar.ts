import { isMockMode } from "@/lib/config/env";
import {
  mockCreateEvent,
  mockDeleteEvent,
  mockGetEvents,
  mockUpdateEvent,
} from "@/lib/mock/handlers";
import { apiClient } from "./client";
import type {
  CalendarEvent,
  CalendarEventsResponse,
  CreateEventInput,
  UpdateEventInput,
} from "@/lib/types/calendar";

export function getEvents(from: string, to: string) {
  if (isMockMode()) return mockGetEvents(from, to);
  return apiClient<CalendarEventsResponse>("/calendar/events", {
    params: { from, to },
  });
}

export function createEvent(input: CreateEventInput) {
  if (isMockMode()) return mockCreateEvent(input);
  return apiClient<CalendarEvent>("/calendar/events", {
    method: "POST",
    body: input,
  });
}

export function updateEvent(id: string, input: UpdateEventInput) {
  if (isMockMode()) return mockUpdateEvent(id, input);
  return apiClient<CalendarEvent>(`/calendar/events/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteEvent(id: string) {
  if (isMockMode()) return mockDeleteEvent(id);
  return apiClient<void>(`/calendar/events/${id}`, {
    method: "DELETE",
  });
}
