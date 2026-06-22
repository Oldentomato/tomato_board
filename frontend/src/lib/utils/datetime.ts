import { parseISO } from "date-fns";

const HAS_TIMEZONE = /(?:[zZ]|[+-]\d{2}:\d{2})$/;

/** API UTC ISO 문자열을 Date로 변환 (timezone 없는 legacy 값도 UTC로 처리) */
export function parseUtcIso(value: string): Date {
  return parseISO(HAS_TIMEZONE.test(value) ? value : `${value}Z`);
}
