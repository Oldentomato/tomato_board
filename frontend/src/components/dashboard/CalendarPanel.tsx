"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  DatesSetArg,
  EventApi,
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import koLocale from "@fullcalendar/core/locales/ko";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { useCalendar } from "@/hooks/useCalendar";
import {
  getKoreanHolidayEvents,
  getKoreanHolidaysInRange,
  toSeoulDateString,
} from "@/lib/calendar/koreanHolidays";
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

type DragGhostState = {
  el: HTMLDivElement;
  onMove: (event: PointerEvent) => void;
};

function createDragGhost(title: string, color: string, clientX: number, clientY: number): DragGhostState {
  const el = document.createElement("div");
  el.className = "tomato-event-drag-ghost";
  el.textContent = title;
  el.style.backgroundColor = color;
  el.style.left = `${clientX}px`;
  el.style.top = `${clientY}px`;
  document.body.appendChild(el);

  const onMove = (event: PointerEvent) => {
    el.style.left = `${event.clientX}px`;
    el.style.top = `${event.clientY}px`;
  };
  window.addEventListener("pointermove", onMove);
  return { el, onMove };
}

function destroyDragGhost(ghost: DragGhostState | null) {
  if (!ghost) return;
  window.removeEventListener("pointermove", ghost.onMove);
  ghost.el.remove();
}

export function CalendarPanel({ className }: { className?: string }) {
  const theme = useSkyTheme();
  const calendarRef = useRef<FullCalendar>(null);
  const dragGhostRef = useRef<DragGhostState | null>(null);
  const [monthLabel, setMonthLabel] = useState(() =>
    format(new Date(), "yyyy.M", { locale: ko }),
  );
  const [rangeFrom, setRangeFrom] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [rangeTo, setRangeTo] = useState(() =>
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const fcEvents: EventInput[] = useMemo(() => {
    const holidayEvents = getKoreanHolidayEvents(rangeFrom, rangeTo);
    const userEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      editable: true,
      startEditable: true,
      durationEditable: false,
      backgroundColor: event.color || "#E74C3C",
      borderColor: event.color || "#E74C3C",
      extendedProps: { description: event.description, color: event.color },
    }));
    return [...holidayEvents, ...userEvents];
  }, [events, rangeFrom, rangeTo]);

  const holidayDates = useMemo(
    () => new Set(getKoreanHolidaysInRange(rangeFrom, rangeTo).map((h) => h.date)),
    [rangeFrom, rangeTo],
  );

  useEffect(() => {
    return () => {
      destroyDragGhost(dragGhostRef.current);
      dragGhostRef.current = null;
    };
  }, []);

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

  const handleDatesSet = (arg: DatesSetArg) => {
    const endInclusive = new Date(arg.end.getTime() - 1);
    setRangeFrom(format(arg.start, "yyyy-MM-dd"));
    setRangeTo(format(endInclusive, "yyyy-MM-dd"));
    setMonthLabel(format(arg.view.currentStart, "yyyy.M", { locale: ko }));
  };

  const handleDateClick = (arg: DateClickArg) => {
    openCreateModal(arg.date);
  };

  const handleEventClick = (arg: EventClickArg) => {
    arg.jsEvent.preventDefault();
    arg.jsEvent.stopPropagation();
    if (arg.event.extendedProps.isHoliday) return;

    const found = events.find((event) => event.id === arg.event.id);
    if (found) {
      openEditModal(found);
      return;
    }
    openEditModal({
      id: arg.event.id,
      title: arg.event.title,
      start: arg.event.start?.toISOString() ?? new Date().toISOString(),
      end: arg.event.end?.toISOString() ?? arg.event.start?.toISOString() ?? new Date().toISOString(),
      description: arg.event.extendedProps.description,
      color: arg.event.extendedProps.color,
    });
  };

  const persistEventDates = async (arg: EventDropArg) => {
    if (arg.event.extendedProps.isHoliday) {
      arg.revert();
      return;
    }

    const start = arg.event.start;
    if (!start) {
      arg.revert();
      return;
    }

    const end = arg.event.end ?? new Date(start.getTime() + 60 * 60 * 1000);

    try {
      await updateEvent({
        id: arg.event.id,
        input: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      });
    } catch {
      arg.revert();
    }
  };

  const handleEventDrop = (arg: EventDropArg) => {
    void persistEventDates(arg);
  };

  const handleEventDragStart = (arg: { event: EventApi; jsEvent: UIEvent }) => {
    if (arg.event.extendedProps.isHoliday) return;
    destroyDragGhost(dragGhostRef.current);
    const jsEvent = arg.jsEvent as MouseEvent;
    dragGhostRef.current = createDragGhost(
      arg.event.title,
      arg.event.backgroundColor || arg.event.extendedProps.color || "#E74C3C",
      jsEvent.clientX,
      jsEvent.clientY,
    );
  };

  const handleEventDragStop = () => {
    destroyDragGhost(dragGhostRef.current);
    dragGhostRef.current = null;
  };

  const upcomingEvents = useMemo(
    () =>
      [...events]
        .filter((event) => new Date(event.end).getTime() >= Date.now())
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 2),
    [events],
  );

  const goPrev = () => calendarRef.current?.getApi().prev();
  const goNext = () => calendarRef.current?.getApi().next();

  return (
    <>
      <section
        className={cn(
          "tomato-calendar flex flex-col rounded-2xl border px-4 pt-3 pb-4 sm:px-4 lg-tight:pt-2 lg-tight:pb-3",
          theme.isDark ? "tomato-calendar--dark" : "tomato-calendar--light",
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
              onClick={goPrev}
              className={cn("p-0.5 transition hover:opacity-70", theme.muted)}
              aria-label="이전 달"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className={cn("min-w-[5.5rem] text-center text-sm font-medium", theme.text)}>
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={goNext}
              className={cn("p-0.5 transition hover:opacity-70", theme.muted)}
              aria-label="다음 달"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => openCreateModal(new Date())}
              className={cn(
                "ml-1 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-70",
                theme.muted,
              )}
            >
              <Plus className="h-3 w-3" />
              추가
            </button>
          </div>
        </div>

        <div className="tomato-calendar__body min-h-0 shrink-0">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={koLocale}
            timeZone="Asia/Seoul"
            headerToolbar={false}
            height="auto"
            contentHeight="auto"
            fixedWeekCount={false}
            showNonCurrentDates
            dayMaxEvents={2}
            moreLinkClick="popover"
            dayCellContent={(arg) => ({
              html: String(arg.date.getDate()),
            })}
            dayCellClassNames={(arg) => {
              const dateKey = toSeoulDateString(arg.date);
              const classes: string[] = [];
              if (arg.date.getDay() === 0) classes.push("fc-day-sunday");
              if (holidayDates.has(dateKey)) classes.push("fc-day-holiday");
              return classes;
            }}
            events={fcEvents}
            editable
            eventStartEditable
            eventDurationEditable={false}
            dragScroll
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventDragStart={handleEventDragStart}
            eventDragStop={handleEventDragStop}
            datesSet={handleDatesSet}
            eventDisplay="block"
            displayEventTime={false}
          />
        </div>

        {isLoading && (
          <p className={cn("mt-1 shrink-0 text-center text-xs", theme.faint)}>불러오는 중...</p>
        )}

        <div className={cn("mt-2 shrink-0 border-t pt-2 lg-tight:hidden", theme.sidebarBorder)}>
          <p className={cn("mb-1.5 text-xs font-semibold", theme.text)}>다가오는 일정</p>
          {upcomingEvents.length === 0 ? (
            <p className={cn("text-xs", theme.faint)}>등록된 일정이 없습니다.</p>
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
                    className="flex w-full items-center gap-1.5 text-left text-xs transition-opacity hover:opacity-80"
                  >
                    <span
                      className="h-1 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: event.color || "#E74C3C" }}
                    />
                    <span className={cn("min-w-0 truncate font-medium", theme.text)}>
                      {event.title}
                    </span>
                    <span className={cn("ml-auto shrink-0 text-[11px]", theme.faint)}>
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
        key={`${editingEvent?.id ?? selectedDate?.toISOString() ?? "new"}-${isModalOpen ? "open" : "closed"}`}
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
