import type { EventInput } from "@fullcalendar/core";
import { getHolidays } from "korean-holidays";

export type KoreanHoliday = {
  date: string;
  name: string;
};

const seoulDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `YYYY-MM-DD` in Asia/Seoul */
export function toSeoulDateString(date: Date): string {
  return seoulDateFormatter.format(date);
}

function yearsInRange(from: string, to: string): number[] {
  const startYear = Number(from.slice(0, 4));
  const endYear = Number(to.slice(0, 4));
  const years: number[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    years.push(year);
  }
  return years;
}

export function getKoreanHolidaysInRange(from: string, to: string): KoreanHoliday[] {
  const holidays: KoreanHoliday[] = [];

  for (const year of yearsInRange(from, to)) {
    for (const holiday of getHolidays(year)) {
      const date = toSeoulDateString(holiday.date);
      if (date < from || date > to) continue;
      holidays.push({ date, name: holiday.nameKo });
    }
  }

  return holidays;
}

export function getKoreanHolidayEvents(from: string, to: string): EventInput[] {
  return getKoreanHolidaysInRange(from, to).map((holiday) => ({
    id: `holiday-${holiday.date}-${holiday.name}`,
    title: holiday.name,
    start: holiday.date,
    allDay: true,
    editable: false,
    overlap: true,
    classNames: ["fc-holiday-event"],
    backgroundColor: "transparent",
    borderColor: "transparent",
    textColor: "#E74C3C",
    extendedProps: { isHoliday: true },
  }));
}
