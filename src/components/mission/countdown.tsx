"use client";

import { breakdownDuration } from "@/lib/format";
import { useNow } from "@/lib/use-now";

/**
 * M-04 / D-03 — countdown to the birthday reveal.
 *
 * Deliberately calm: same ink as body text, no red, no flashing, no
 * "hurry" copy. Section 8 rules this out as a dark pattern, so the timer
 * is presented as information the visitor might like, not pressure.
 */
export function Countdown({
  target,
  lead,
  compact,
  sprint,
}: {
  target: string;
  lead?: string;
  compact?: boolean;
  sprint?: boolean;
}) {
  const now = useNow();

  // Render nothing time-dependent until mounted: server and client clocks
  // differ, and a hydration mismatch on the hero is very visible.
  if (now === null) {
    return <div className={compact ? "h-6" : "h-20"} aria-hidden />;
  }

  const left = breakdownDuration(new Date(target).getTime() - now);

  if (left.isOver) {
    return (
      <p className={compact ? "text-sm font-medium text-accent" : "font-display text-2xl text-accent"}>
        The day is here 🎂
      </p>
    );
  }

  // M-05: under two days the countdown switches to hours/minutes/seconds,
  // because "0 days" would read as if nothing were left.
  const units = sprint || left.days === 0
    ? ([
        ["hours", left.days * 24 + left.hours],
        ["minutes", left.minutes],
        ["seconds", left.seconds],
      ] as const)
    : ([
        ["days", left.days],
        ["hours", left.hours],
        ["minutes", left.minutes],
      ] as const);

  if (compact) {
    return (
      <span className="nums text-sm text-ink-2">
        {units.map(([label, value], i) => (
          <span key={label}>
            {i > 0 ? " " : ""}
            {value}
            {label[0]}
          </span>
        ))}{" "}
        to go
      </span>
    );
  }

  return (
    <div>
      {lead ? <p className="mb-2 text-sm text-ink-2">{lead}</p> : null}
      <div className="flex gap-2">
        {units.map(([label, value]) => (
          <div
            key={label}
            className="min-w-[4.25rem] rounded-lg border border-line bg-surface px-3 py-2 text-center"
          >
            <div className="nums font-display text-2xl leading-tight text-ink">
              {String(value).padStart(2, "0")}
            </div>
            <div className="text-[0.7rem] uppercase tracking-wide text-ink-3">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
