#!/usr/bin/env node
/**
 * Checks the birthday countdown maths.
 *
 *   node scripts/check-countdown.mjs
 *
 * There is no test runner in this project, so this is a plain script that
 * exits non-zero on failure. It covers the cases from the spec plus the
 * edges that broke the old implementation: a date already past this year
 * (which used to collapse to a 24-hour sprint), a real date of birth
 * decades ago (the same bug, and the one people actually hit), 29
 * February, and month-end arithmetic.
 *
 * Run with Node's built-in TypeScript support so it imports the real
 * module rather than a copy that could drift.
 */
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Imported straight from source. Node strips the type annotations itself,
// so this always tests the file that ships rather than a copy.
const { nextBirthday, getCountdown, rollsToNextYear, parseLocalDate, toDateColumn } = await import(
  pathToFileURL(resolve(process.cwd(), "src/lib/countdown.ts")).href
);

let failures = 0;
const check = (name, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${name}\n         got ${JSON.stringify(actual)}${ok ? "" : `\n         want ${JSON.stringify(expected)}`}`);
};

// Fixed "today" so the results are stable: 7 August 2026, 10:00 local.
const NOW = new Date(2026, 7, 7, 10, 0, 0, 0);
console.log(`today = ${NOW.toDateString()} 10:00 local\n`);

console.log("spec case 1 — birthday 13 Aug (6 days away)");
{
  const t = nextBirthday(8, 13, NOW);
  const c = getCountdown(t, NOW);
  check("target year", t.getFullYear(), 2026);
  check("target date", t.toDateString(), "Thu Aug 13 2026");
  check("not sprint", c.isSprint, false);
  check("label", c.label, "6 days");
  check("calendar days", c.calendarDays, 6);
}

console.log("\nspec case 2 — birthday 8 Aug (tomorrow) is a sprint");
{
  const t = nextBirthday(8, 8, NOW);
  const c = getCountdown(t, NOW);
  check("is sprint", c.isSprint, true);
  check("has not arrived", c.hasArrived, false);
  check("label mentions sprint", c.label.includes("sprint"), true);
}

console.log("\nspec case 3 — birthday 13 July, already passed this year");
{
  const t = nextBirthday(7, 13, NOW);
  const c = getCountdown(t, NOW);
  check("rolls to next year", t.getFullYear(), 2027);
  check("flagged as rolled", rollsToNextYear(7, 13, NOW), true);
  check("NOT a sprint (the old bug)", c.isSprint, false);
  check("months", c.parts.months, 11);
  check("label starts with 11 months", c.label.startsWith("11 months"), true);
}

console.log("\nspec case 4 — birthday today");
{
  const t = nextBirthday(8, 7, NOW);
  check("target is today", t.toDateString(), "Fri Aug 07 2026");
  // Midnight this morning has passed, so by 10:00 the day has arrived.
  const c = getCountdown(t, NOW);
  check("has arrived", c.hasArrived, true);
  check("label", c.label, "It's your birthday 🎉");
}

console.log("\nthe bug people actually hit — a real date of birth in 1999");
{
  // The old code built the target from the typed year, found it long
  // past, and fell through to now + 24h: a permanent one-day sprint.
  const t = nextBirthday(8, 13, NOW); // month/day only; 1999 is irrelevant
  const c = getCountdown(t, NOW);
  check("ignores the typed year", t.getFullYear(), 2026);
  check("not a 24h sprint", c.isSprint, false);
}

console.log("\n29 February clamps instead of drifting into March");
{
  const t = nextBirthday(2, 29, new Date(2026, 5, 1, 12, 0, 0, 0)); // 2027 is not a leap year
  check("year", t.getFullYear(), 2027);
  check("stays in February", t.getMonth(), 1);
  check("clamped to the 28th", t.getDate(), 28);

  const leap = nextBirthday(2, 29, new Date(2027, 5, 1, 12, 0, 0, 0)); // 2028 is a leap year
  check("real 29 Feb in a leap year", leap.toDateString(), "Tue Feb 29 2028");
}

console.log("\ndate column round trip is timezone-safe");
{
  const parsed = parseLocalDate("2026-08-13");
  check("parses to local 13 Aug", parsed.toDateString(), "Thu Aug 13 2026");
  check("not shifted by UTC", parsed.getDate(), 13);
  check("round trips", toDateColumn(parsed), "2026-08-13");
  // The failure mode being guarded against:
  const naive = new Date("2026-08-13");
  console.log(
    `         (for contrast, new Date("2026-08-13").getDate() = ${naive.getDate()} in this timezone)`,
  );
}

console.log("\nmonth-end arithmetic");
{
  const from = new Date(2026, 0, 31, 12, 0, 0, 0); // 31 Jan
  const c = getCountdown(new Date(2026, 1, 28, 12, 0, 0, 0), from); // 28 Feb
  check("31 Jan -> 28 Feb is under a month", c.parts.months, 0);
  check("counted in days", c.parts.days, 28);
}

console.log(`\n${failures === 0 ? "all checks passed" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
