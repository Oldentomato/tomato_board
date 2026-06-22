import type { CalendarEvent, CreateEventInput, UpdateEventInput } from "@/lib/types/calendar";
import { getInitialMockEvents } from "./data";

const STORAGE_KEY = "tomato_board_mock_events";

function loadEvents(): CalendarEvent[] {
  if (typeof window === "undefined") {
    return getInitialMockEvents();
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as CalendarEvent[];
    } catch {
      return getInitialMockEvents();
    }
  }
  const initial = getInitialMockEvents();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveEvents(events: CalendarEvent[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }
}

export function getMockEvents(from: string, to: string): CalendarEvent[] {
  const fromTime = new Date(from).getTime();
  const toTime = new Date(to).getTime();
  return loadEvents().filter((event) => {
    const start = new Date(event.start).getTime();
    return start >= fromTime && start <= toTime + 86400000;
  });
}

export function createMockEvent(input: CreateEventInput): CalendarEvent {
  const events = loadEvents();
  const event: CalendarEvent = {
    id: `evt-${Date.now()}`,
    ...input,
  };
  events.push(event);
  saveEvents(events);
  return event;
}

export function updateMockEvent(id: string, input: UpdateEventInput): CalendarEvent {
  const events = loadEvents();
  const index = events.findIndex((e) => e.id === id);
  if (index === -1) throw new Error("Event not found");
  events[index] = { ...events[index], ...input };
  saveEvents(events);
  return events[index];
}

export function deleteMockEvent(id: string): void {
  const events = loadEvents().filter((e) => e.id !== id);
  saveEvents(events);
}
