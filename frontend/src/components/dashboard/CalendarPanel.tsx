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

export function CalendarPanel({ className }: { className?: string }) {
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
        .slice(0, 2),
    [events],
  );

  return (
    <>
      <section
        className={cn(
          "flex flex-col rounded-2xl border px-4 py-3 sm:px-4",
          theme.sidebarBorder,
          className,
        )}
      >
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Calendar className={cn("h-4 w-4 shrink-0", theme.text)} />
            <h2 className={cn("truncate text-sm font-semibold", theme.text)}>캘린더</h2>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className={cn("p-0.5 transition hover:opacity-70", theme.muted)}
              aria-label="이전 달"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className={cn("min-w-[5.5rem] text-center text-xs font-medium", theme.text)}>
              {format(currentMonth, "yyyy.M", { locale: ko })}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className={cn("p-0.5 transition hover:opacity-70", theme.muted)}
              aria-label="다음 달"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => openCreateModal(new Date())}
              className={cn(
                "ml-1 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-70",
                theme.muted,
              )}
            >
              <Plus className="h-3 w-3" />
              추가
            </button>
          </div>
        </div>

        <div className={cn("grid shrink-0 grid-cols-7 text-center text-[10px] font-medium", theme.muted)}>
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="py-0.5">
              {d}
            </div>
          ))}
        </div>

        <div className="grid shrink-0 grid-cols-7">
          {calendarDays.map((day) => {
            const dayEvents = eventsForDay(day).sort(
              (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
            );
            const isToday = isSameDay(day, new Date());
            const inMonth = isSameMonth(day, currentMonth);
            const dayOfWeek = day.getDay();

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => openCreateModal(day)}
                className={cn(
                  "group relative flex h-6 items-center justify-center text-[11px] transition-opacity hover:opacity-80",
                  !inMonth ? theme.faint : isToday ? "font-bold text-[#E74C3C]" : theme.muted,
                )}
              >
                {format(day, "d")}
                {dayEvents.length > 0 && (
                  <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#E74C3C]" />
                )}
                {dayEvents.length > 0 && (
                  <div
                    role="tooltip"
                    className={cn(
                      "pointer-events-none invisible absolute bottom-full z-20 mb-1.5 w-48 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-slate-900 opacity-0 shadow-xl transition-opacity duration-150",
                      "group-hover:visible group-hover:opacity-100",
                      dayOfWeek === 0 && "left-0 translate-x-0",
                      dayOfWeek === 6 && "right-0 left-auto translate-x-0",
                      dayOfWeek !== 0 && dayOfWeek !== 6 && "left-1/2 -translate-x-1/2",
                    )}
                  >
                    <p className="mb-2 text-xs font-bold text-slate-900">
                      {format(day, "M월 d일 (EEE)", { locale: ko })}
                    </p>
                    <ul className="max-h-28 space-y-1.5 overflow-y-auto">
                      {dayEvents.map((event) => (
                        <li key={event.id} className="flex items-start gap-2">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#E74C3C]" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800">
                              {event.title}
                            </p>
                            <p className="text-xs text-slate-600">
                              {format(parseISO(event.start), "HH:mm")}
                              {event.end && ` – ${format(parseISO(event.end), "HH:mm")}`}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {isLoading && (
          <p className={cn("mt-1 shrink-0 text-center text-[10px]", theme.faint)}>불러오는 중...</p>
        )}

        <div className={cn("mt-2 shrink-0 border-t pt-2", theme.sidebarBorder)}>
          <p className={cn("mb-1.5 text-[10px] font-semibold", theme.text)}>다가오는 일정</p>
          {upcomingEvents.length === 0 ? (
            <p className={cn("text-[10px]", theme.faint)}>등록된 일정이 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {upcomingEvents.map((event, index) => (
                <li
                  key={event.id}
                  className="enter-item"
                  style={{ animationDelay: `${520 + index * 55}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => openEditModal(event)}
                    className="flex w-full items-center gap-1.5 text-left text-[11px] transition-opacity hover:opacity-80"
                  >
                    <span className="h-1 w-1 shrink-0 rounded-full bg-[#E74C3C]" />
                    <span className={cn("min-w-0 truncate font-medium", theme.text)}>
                      {event.title}
                    </span>
                    <span className={cn("ml-auto shrink-0 text-[10px]", theme.faint)}>
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
