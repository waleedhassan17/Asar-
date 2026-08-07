/**
 * Birthday countdown maths.
 *
 * A birthday is an annually recurring month/day, not a fixed date, and
 * that distinction is where the old code went wrong: `computeRevealAt`
 * built a date from the year the person typed and, when that date had
 * already passed, fell through to `now + 24h`. Anyone entering their
 * actual date of birth — which is what a field labelled "your birthday"
 * invites — got a mission that counted down 24 hours and called itself a
 * sprint.
 *
 * Two rules hold everything together:
 *
 *  1. Resolve to the NEXT occurrence of the month/day. The year the user
 *     picked is never used as the target.
 *  2. Never build a date from an ISO string. `new Date("2026-08-13")`
 *     parses as UTC midnight, which is the previous day for anyone west
 *     of Greenwich — an off-by-one that shows up as a countdown a day out
 *     and, on the day itself, as a mission that reveals early or late.
 *     Dates are always constructed from local year/month/day components.
 *
 * No date library: the whole surface is these few functions, and they are
 * covered by scripts/check-countdown.mjs against the exact cases in the
 * spec plus the leap-year and month-end edges.
 */

export interface CountdownParts {
  months: number;
  days: number;
  hours: number;
  minutes: number;
}

export interface Countdown {
  target: Date;
  totalHours: number;
  /**
   * Whole calendar days from today's date to the target's date.
   *
   * Distinct from `parts.days`, which is exact elapsed time. At 10:00 on
   * the 7th with a target of midnight on the 13th, the exact remainder is
   * 5 days 14 hours — but every person calling that "6 days" is right,
   * because they mean "on the 13th". The friendly label uses this; the
   * parts stay exact for anything that needs real arithmetic.
   */
  calendarDays: number;
  /** Genuinely imminent: 48 hours or less. Not "created late". */
  isSprint: boolean;
  /** The day has arrived — time to reveal. */
  hasArrived: boolean;
  parts: CountdownParts;
  label: string;
}

/** Days in a given month, 1-indexed month. */
function daysInMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate();
}

/**
 * Local midnight on a given month/day of a given year.
 *
 * Clamps rather than overflows: `new Date(2027, 1, 29)` silently becomes
 * 1 March, so a 29 February birthday would drift into March every
 * non-leap year. It resolves to 28 February instead.
 */
function localDate(year: number, month1to12: number, day: number) {
  const clamped = Math.min(day, daysInMonth(year, month1to12));
  return new Date(year, month1to12 - 1, clamped, 0, 0, 0, 0);
}

/** Midnight this morning, local time. */
export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * The next occurrence of a month/day, at local midnight.
 *
 * Today counts as the next occurrence — a birthday happening today has
 * not passed.
 */
export function nextBirthday(month1to12: number, day: number, from = new Date()): Date {
  const today = startOfLocalDay(from);
  const thisYear = localDate(from.getFullYear(), month1to12, day);
  return thisYear.getTime() >= today.getTime()
    ? thisYear
    : localDate(from.getFullYear() + 1, month1to12, day);
}

/** True when the month/day has already gone by this year. */
export function rollsToNextYear(month1to12: number, day: number, from = new Date()) {
  return nextBirthday(month1to12, day, from).getFullYear() > from.getFullYear();
}

/**
 * Parses a `YYYY-MM-DD` column value into a LOCAL date.
 *
 * `new Date(value)` would treat it as UTC. This is the function every
 * read of `birthday_date` has to go through.
 */
export function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return localDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** `YYYY-MM-DD` from local components — never `toISOString()`, which shifts. */
export function toDateColumn(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Calendar-aware split into months/days/hours/minutes.
 *
 * Counts whole months by stepping a cursor forward, so "1 month" means
 * the same date next month rather than a fixed 30 days.
 */
function splitDuration(now: Date, target: Date): CountdownParts {
  let months = 0;
  const cursor = new Date(now.getTime());

  for (;;) {
    const stepped = new Date(cursor.getTime());
    stepped.setMonth(stepped.getMonth() + 1);
    if (stepped.getTime() > target.getTime()) break;
    cursor.setTime(stepped.getTime());
    months += 1;
  }

  let remaining = Math.max(0, target.getTime() - cursor.getTime());
  const days = Math.floor(remaining / 86_400_000);
  remaining -= days * 86_400_000;
  const hours = Math.floor(remaining / 3_600_000);
  remaining -= hours * 3_600_000;
  const minutes = Math.floor(remaining / 60_000);

  return { months, days, hours, minutes };
}

/** Whole days between two local dates, ignoring the time of day. */
function calendarDaysBetween(from: Date, to: Date) {
  const a = startOfLocalDay(from).getTime();
  const b = startOfLocalDay(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function getCountdown(target: Date, now = new Date()): Countdown {
  const ms = target.getTime() - now.getTime();
  const totalHours = Math.floor(ms / 3_600_000);
  const hasArrived = ms <= 0;
  const isSprint = !hasArrived && ms <= 48 * 3_600_000;
  const calendarDays = Math.max(0, calendarDaysBetween(now, target));

  const parts = hasArrived
    ? { months: 0, days: 0, hours: 0, minutes: 0 }
    : splitDuration(now, target);

  let label: string;
  if (hasArrived) {
    label = "It's your birthday 🎉";
  } else if (isSprint) {
    const totalRemainingHours = Math.floor(ms / 3_600_000);
    label =
      totalRemainingHours > 0
        ? `${totalRemainingHours}h ${parts.minutes}m — sprint`
        : `${parts.minutes}m — sprint`;
  } else {
    const bits: string[] = [];
    if (parts.months) {
      bits.push(`${parts.months} month${parts.months > 1 ? "s" : ""}`);
      if (parts.days) bits.push(`${parts.days} day${parts.days > 1 ? "s" : ""}`);
    } else if (calendarDays > 0) {
      // Under a month, count the way people do: to the date, not to the hour.
      bits.push(`${calendarDays} day${calendarDays > 1 ? "s" : ""}`);
    }
    label = bits.join(", ") || "Today";
  }

  return { target, totalHours, calendarDays, isSprint, hasArrived, parts, label };
}

/**
 * When the mission opens: 9am local on the birthday, or the end of that
 * day if 9am has already gone (someone creating a mission on their own
 * birthday afternoon should still get a reveal that day).
 */
export function revealAtFor(target: Date, now = new Date()): Date {
  const morning = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 9, 0, 0, 0);
  if (morning.getTime() > now.getTime()) return morning;

  const endOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 0, 0);
  if (endOfDay.getTime() > now.getTime()) return endOfDay;

  // Only reachable in the last minute of the birthday itself.
  return new Date(now.getTime() + 60_000);
}
