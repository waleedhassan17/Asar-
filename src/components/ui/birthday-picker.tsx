"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { startOfLocalDay, toDateColumn } from "@/lib/countdown";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Birthday picker.
 *
 * Deliberately **not** a date-of-birth field, which is what the old
 * `<input type="date">` invited and what caused the countdown bug: people
 * typed the year they were born, the target landed decades in the past,
 * and every mission collapsed into a 24-hour sprint.
 *
 * Instead this navigates forward month by month from today across a
 * rolling twelve months, so every day it can offer is a real upcoming
 * date. The year is shown in the header rather than typed, which makes
 * the roll into next year something you watch happen rather than a
 * surprise you get afterwards. Twelve months of navigation reaches every
 * possible birthday exactly once.
 *
 * Built in-house rather than pulling in react-day-picker and the shadcn
 * stack: this project has neither, the grid below is the whole feature,
 * and owning it means the evergreen/gold theming needs no override layer.
 */
export function BirthdayPicker({
  value,
  onChange,
  id,
}: {
  /** The chosen date as `YYYY-MM-DD`, already resolved to a real upcoming day. */
  value: string | null;
  onChange: (isoDate: string) => void;
  id?: string;
}) {
  const generatedId = useId();
  const buttonId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = startOfLocalDay(new Date());
  const view = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const viewYear = view.getFullYear();
  const viewMonth = view.getMonth();

  // Close on outside click and on Escape, the two things a popover has to
  // do to not feel broken.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const daysInView = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Monday-first: JS getDay() is 0=Sunday.
  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const selectedLabel = value
    ? new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(
          Number(value.slice(0, 4)),
          Number(value.slice(5, 7)) - 1,
          Number(value.slice(8, 10)),
        ),
      )
    : "Pick your birthday";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={buttonId}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cx(
          "flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-left transition",
          "hover:border-primary-500/60 focus:border-transparent focus:ring-2 focus:ring-primary-500 focus:outline-none",
          value ? "text-ink" : "text-ink-3",
        )}
      >
        <span>{selectedLabel}</span>
        <span aria-hidden className="text-lg">
          📅
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose your birthday"
          className="absolute z-50 mt-2 w-full max-w-[22rem] rounded-card border border-line bg-surface p-4 shadow-lift"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setOffset((o) => Math.max(0, o - 1))}
              disabled={offset === 0}
              aria-label="Previous month"
              className="grid h-9 w-9 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ←
            </button>
            <p className="font-display text-lg text-ink" aria-live="polite">
              {MONTHS[viewMonth]} {viewYear}
            </p>
            <button
              type="button"
              onClick={() => setOffset((o) => Math.min(11, o + 1))}
              disabled={offset === 11}
              aria-label="Next month"
              className="grid h-9 w-9 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
            >
              →
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((label, i) => (
              <span key={i} className="py-1 text-xs font-medium text-ink-3">
                {label}
              </span>
            ))}

            {Array.from({ length: firstWeekday }, (_, i) => (
              <span key={`pad-${i}`} />
            ))}

            {Array.from({ length: daysInView }, (_, i) => {
              const day = i + 1;
              const date = new Date(viewYear, viewMonth, day);
              const iso = toDateColumn(date);
              // Days already gone this month aren't offered here — you
              // reach them by walking forward to the same month next year,
              // which is exactly what the countdown will do.
              const isPast = date.getTime() < today.getTime();
              const isToday = date.getTime() === today.getTime();
              const isSelected = value === iso;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  aria-pressed={isSelected}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={cx(
                    "nums grid h-9 place-items-center rounded-full text-sm transition",
                    isPast && "cursor-not-allowed text-ink-3/40",
                    !isPast && !isSelected && "text-ink hover:bg-primary-100",
                    isSelected && "bg-primary-500 font-semibold text-white",
                    isToday && !isSelected && "ring-2 ring-gold-500 ring-inset",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-3">
            Pick the birthday you&apos;re counting down to. Days already past this month live in
            next year&apos;s calendar — keep going forward to find them.
          </p>
        </div>
      ) : null}
    </div>
  );
}
