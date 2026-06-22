"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { useCalendar } from "@/hooks/useCalendar";
import type { CalendarEvent } from "@/lib/types/calendar";
import { cn } from "@/lib/utils/cn";
import { EventModal } from "./EventModal";

function toDayStartIso(date: Date) {
  const d = new Date(date);
  d.setHours(9, 0, 0, 0);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function CalendarPanel() {
  const theme = useSkyTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const rangeFrom = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const rangeTo = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const {
    events,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCalendar(rangeFrom, rangeTo);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const eventsForDay = (day: Date) =>
    events.filter((event) => isSameDay(parseISO(event.start), day));

  const openCreateModal = (day: Date) => {
    setSelectedDate(day);
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setSelectedDate(parseISO(event.start));
    setIsModalOpen(true);
  };

  const upcomingEvents = useMemo(
    () =>
      [...events]
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 5),
    [events],
  );

  return (
    <>
      <section
        className={cn(
          "flex flex-col rounded-2xl border px-4 py-5 sm:px-5",
          theme.sidebarBorder,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className={cn("h-5 w-5", theme.text)} />
            <h2 className={cn("font-semibold", theme.text)}>캘린더</h2>
          </div>
          <button
            type="button"
            onClick={() => openCreateModal(new Date())}
            className={cn(
              "flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70",
              theme.muted,
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            추가
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className={cn("p-1 transition hover:opacity-70", theme.muted)}
            aria-label="이전 달"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className={cn("font-medium", theme.text)}>
            {format(currentMonth, "yyyy년 M월", { locale: ko })}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className={cn("p-1 transition hover:opacity-70", theme.muted)}
            aria-label="다음 달"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className={cn("mb-1 grid grid-cols-7 text-center text-xs font-medium", theme.muted)}>
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const dayEvents = eventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const inMonth = isSameMonth(day, currentMonth);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => openCreateModal(day)}
                className={cn(
                  "relative flex h-9 items-center justify-center text-sm transition-opacity hover:opacity-80",
                  !inMonth ? theme.faint : isToday ? "font-bold text-[#E74C3C]" : theme.muted,
                )}
              >
                {format(day, "d")}
                {dayEvents.length > 0 && (
                  <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#E74C3C]" />
                )}
              </button>
            );
          })}
        </div>

        {isLoading && (
          <p className={cn("mt-3 text-center text-xs", theme.faint)}>불러오는 중...</p>
        )}

        <div className="mt-6">
          <p className={cn("mb-3 text-xs font-semibold", theme.text)}>다가오는 일정</p>
          {upcomingEvents.length === 0 ? (
            <p className={cn("text-xs", theme.faint)}>등록된 일정이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingEvents.map((event, index) => (
                <li
                  key={event.id}
                  className="enter-item"
                  style={{ animationDelay: `${520 + index * 55}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => openEditModal(event)}
                    className="flex w-full items-center gap-2 text-left text-sm transition-opacity hover:opacity-80"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E74C3C]" />
                    <span className={cn("truncate font-medium", theme.text)}>{event.title}</span>
                    <span className={cn("ml-auto shrink-0 text-xs", theme.faint)}>
                      {format(parseISO(event.start), "M/d HH:mm")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <EventModal
        key={editingEvent?.id ?? selectedDate?.toISOString() ?? "new"}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
          setSelectedDate(null);
        }}
        initialDate={selectedDate ? toDayStartIso(selectedDate) : undefined}
        event={editingEvent ?? undefined}
        isSaving={isCreating || isUpdating}
        isDeleting={isDeleting}
        onSave={async (input) => {
          if (editingEvent) {
            await updateEvent({ id: editingEvent.id, input });
          } else {
            await createEvent(input);
          }
        }}
        onDelete={
          editingEvent
            ? async () => {
                await deleteEvent(editingEvent.id);
              }
            : undefined
        }
      />
    </>
  );
}
