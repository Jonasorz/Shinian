import type { RecurrenceRule } from "./types";

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

function shiftedDate(value: string): Date {
  return new Date(new Date(value).getTime() + SHANGHAI_OFFSET_MS);
}

function unshift(date: Date): string {
  return new Date(date.getTime() - SHANGHAI_OFFSET_MS).toISOString();
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function nextOccurrence(
  value: string | null,
  rule: RecurrenceRule,
): string | null {
  if (!value || rule === "none") return value;

  const date = shiftedDate(value);

  if (rule === "daily" || rule === "weekly") {
    date.setUTCDate(date.getUTCDate() + (rule === "daily" ? 1 : 7));
    return unshift(date);
  }

  if (rule === "workday") {
    do {
      date.setUTCDate(date.getUTCDate() + 1);
    } while (date.getUTCDay() === 0 || date.getUTCDay() === 6);
    return unshift(date);
  }

  const originalDay = date.getUTCDate();
  date.setUTCDate(1);

  if (rule === "monthly") {
    date.setUTCMonth(date.getUTCMonth() + 1);
  } else {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  }

  date.setUTCDate(
    Math.min(originalDay, daysInUtcMonth(date.getUTCFullYear(), date.getUTCMonth())),
  );
  return unshift(date);
}
