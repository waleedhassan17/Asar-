import Link from "next/link";
import { Badge, LinkButton, Progress } from "@/components/ui";
import { Countdown } from "@/components/mission/countdown";
import { plural, tidyNumber } from "@/lib/format";
import type { MissionSummary } from "@/lib/types";

/**
 * The one mission whose day comes first, given the room it deserves.
 *
 * The dashboard's whole promise is a countdown to a birthday, and that
 * was previously reduced to a number in a small tile among three. Here it
 * is the first thing on the page: the mission, the live clock, and how
 * close the goal is — the three things an owner opens the dashboard to
 * check.
 *
 * A Server Component: only the clock inside `Countdown` is a client leaf.
 */
export function NextReveal({ mission, origin }: { mission: MissionSummary; origin: string }) {
  const stats = mission.stats;
  const confirmed = stats?.confirmed_units ?? 0;
  const contributors = stats?.contributor_count ?? 0;
  const percent = stats?.goal_percent ?? 0;

  const href = `/m/${mission.slug}${mission.visibility === "public" ? "" : `?t=${mission.share_token}`}`;

  return (
    <section
      data-accent={mission.accent}
      className="relative overflow-hidden rounded-card border border-line bg-surface p-6 shadow-soft sm:p-7"
    >
      {/* A breath of the mission's own colour, kept well under the text. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-accent-wash blur-2xl"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Badge tone="accent">Next reveal</Badge>
          <h2 className="mt-3 flex items-center gap-2.5 font-display text-2xl text-ink">
            <span aria-hidden className="text-[1.6rem]">
              {mission.icon}
            </span>
            <Link href={href} className="rounded-md transition hover:text-primary-600">
              {mission.title}
            </Link>
          </h2>
        </div>

        <Countdown target={mission.reveal_at} />
      </div>

      <div className="relative mt-6">
        <Progress percent={percent} label={`${Math.round(percent)}% of the goal`} />
        <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="nums text-sm text-ink-2">
            <span className="font-semibold text-ink">{tidyNumber(confirmed)}</span> of{" "}
            {tidyNumber(mission.goal_amount)} {mission.unit_plural} ·{" "}
            {tidyNumber(contributors)} {plural(contributors, "person", "people")} joined in
          </p>
          <p className="nums text-sm font-semibold text-accent">{Math.round(percent)}%</p>
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap gap-2">
        <LinkButton href={href} size="sm">
          Open mission
        </LinkButton>
        <LinkButton href={`/dashboard/${mission.slug}`} variant="outline" size="sm">
          Manage
        </LinkButton>
      </div>

      <p className="relative mt-4 truncate text-xs text-ink-3" title={`${origin}${href}`}>
        Share link · {origin.replace(/^https?:\/\//, "")}/m/{mission.slug}
      </p>
    </section>
  );
}
