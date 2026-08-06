"use client";

import type { ReactNode } from "react";
import { CountUp } from "@/components/ui/count-up";
import { plural } from "@/lib/format";

/**
 * The totals across every mission the owner has run, counted up on mount.
 *
 * The countdown that used to live here has moved to `NextReveal`, where
 * it gets the size it deserves; these three are the cumulative numbers —
 * the "what have I done, in total" of the page, which is a different
 * question from "what happens next".
 *
 * Client leaf on purpose: everything around it stays a Server Component.
 */
export function DashboardStats({
  lives,
  contributors,
  missions,
}: {
  lives: number;
  contributors: number;
  missions: number;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      <Tile icon="🌱" label="Lives touched">
        <CountUp value={lives} />
      </Tile>
      <Tile icon="🤝" label={plural(contributors, "Person who joined in", "People who joined in")}>
        <CountUp value={contributors} />
      </Tile>
      <Tile icon="🎂" label={plural(missions, "Mission started", "Missions started")}>
        <CountUp value={missions} />
      </Tile>
    </dl>
  );
}

function Tile({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5 transition hover:border-primary-500/40">
      <span
        aria-hidden
        className="grid h-9 w-9 place-items-center rounded-full bg-primary-100 text-base"
      >
        {icon}
      </span>
      <dd className="nums mt-3 font-display text-3xl text-ink">{children}</dd>
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
          <div className="h-9 w-9 rounded-full bg-surface-2" />
          <div className="mt-3 h-9 w-20 rounded bg-surface-2" />
          <div className="mt-2 h-4 w-28 rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}
