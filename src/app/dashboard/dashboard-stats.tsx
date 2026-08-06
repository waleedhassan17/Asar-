"use client";

import { CountUp } from "@/components/ui/count-up";
import { plural } from "@/lib/format";
import { useNow } from "@/lib/use-now";

/**
 * The three numbers a mission owner actually cares about, counted up on
 * mount. Client leaf on purpose — everything around it stays a Server
 * Component.
 */
export function DashboardStats({
  lives,
  contributors,
  nextBirthday,
}: {
  lives: number;
  contributors: number;
  /** ISO date of the soonest upcoming reveal, or null if none are pending. */
  nextBirthday: string | null;
}) {
  // useNow is a subscription, so this renders identically on the server
  // (null -> a dash) and then fills in once mounted.
  const now = useNow();
  const days =
    nextBirthday === null || now === null
      ? null
      : Math.max(0, Math.ceil((new Date(nextBirthday).getTime() - now) / 86_400_000));

  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      <Tile label="Lives touched">
        <CountUp value={lives} />
      </Tile>
      <Tile label={plural(contributors, "Person who joined in", "People who joined in")}>
        <CountUp value={contributors} />
      </Tile>
      <Tile label={nextBirthday === null ? "No countdown running" : "Until the next reveal"}>
        {days === null ? (
          <span className="text-ink-3">—</span>
        ) : days === 0 ? (
          <span className="text-gold-700">Today</span>
        ) : (
          <>
            <CountUp value={days} />
            <span className="ml-1.5 font-sans text-base font-medium text-ink-2">
              {plural(days, "day", "days")}
            </span>
          </>
        )}
      </Tile>
    </dl>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <dd className="nums font-display text-3xl text-ink">{children}</dd>
      <dt className="mt-1 text-sm text-ink-2">{label}</dt>
    </div>
  );
}

/** Matches the tile grid's height so the strip doesn't reflow on load. */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-card border border-line bg-surface p-5">
          <div className="h-9 w-20 rounded bg-surface-2" />
          <div className="mt-2 h-4 w-28 rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}
