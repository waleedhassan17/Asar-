"use client";

import { useState } from "react";
import { Avatar, Badge, Card, Progress } from "@/components/ui";
import { CountUp } from "@/components/ui/count-up";
import { Confetti } from "@/components/ui/confetti";
import { plural, tidyNumber } from "@/lib/format";
import type { ActionBreakdown, Contribution, Mission, MissionStats } from "@/lib/types";

const MILESTONES = [25, 50, 75, 100];

/** The highest milestone a percentage has passed, or null. */
function milestoneOf(percent: number) {
  return MILESTONES.filter((m) => percent >= m).pop() ?? null;
}

/**
 * D-01 + D-04. The headline number is lives touched, not money raised,
 * and the framing is always additive ("73 and counting") rather than a
 * deficit ("73 of 100") — §8 rules out the shaming version.
 */
export function LiveTally({
  mission,
  stats,
  celebrate = true,
}: {
  mission: Mission;
  stats: MissionStats;
  celebrate?: boolean;
}) {
  // Adjusting state during render (React's documented pattern for
  // "something changed in props"): a milestone crossed while someone is
  // watching sets off the burst. Nothing fires on first paint, because
  // the previous percentage starts equal to the current one.
  const [seenPercent, setSeenPercent] = useState(stats.goal_percent);
  const [burst, setBurst] = useState(0);

  if (stats.goal_percent !== seenPercent) {
    const before = milestoneOf(seenPercent);
    const after = milestoneOf(stats.goal_percent);
    setSeenPercent(stats.goal_percent);
    if (after !== null && after !== before) setBurst((n) => n + 1);
  }

  const unitsLabel = plural(stats.confirmed_units, mission.unit_singular, mission.unit_plural);

  return (
    <>
      <Confetti fire={celebrate ? burst : 0} />

      {/* Keyed on the burst so crossing a milestone remounts the card and
          replays the ring animation without a timer to clear it. */}
      <Card
        key={burst}
        className={`relative overflow-hidden p-6 sm:p-8 ${burst > 0 ? "animate-pulse-ring" : ""}`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent-wash opacity-70 blur-2xl"
        />

        <div className="relative">
          <p className="text-sm font-medium text-ink-2">
            {stats.lives_impacted > 0 ? "So far, together" : "Nothing yet — be the first"}
          </p>

          <p className="mt-2 font-display text-[2.75rem] leading-none text-ink sm:text-6xl">
            <CountUp value={stats.lives_impacted} className="nums text-accent" />{" "}
            <span className="text-ink">
              {plural(stats.lives_impacted, "life", "lives")} touched
            </span>
          </p>

          <p className="mt-3 text-ink-2">
            <strong className="nums text-ink">{tidyNumber(stats.confirmed_units)}</strong>{" "}
            {unitsLabel} confirmed
            {stats.promised_units > 0 ? (
              <>
                {" "}
                · <span className="nums">{tidyNumber(stats.promised_units)}</span> more pledged
              </>
            ) : null}
          </p>

          <Progress
            percent={stats.goal_percent}
            className="mt-5"
            label={`${stats.goal_percent}% of the ${mission.goal_amount} ${mission.unit_plural} goal`}
          />

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2">
            <span className="nums">
              {stats.goal_percent}% of {tidyNumber(mission.goal_amount)} {mission.unit_plural}
            </span>
            {/* D-06 momentum, phrased as arrivals not as a countdown of what's missing */}
            {stats.joined_last_24h > 0 ? (
              <Badge tone="success">
                {stats.joined_last_24h} {plural(stats.joined_last_24h, "person", "people")} joined in
                the last 24 hours
              </Badge>
            ) : null}
          </div>
        </div>
      </Card>
    </>
  );
}

/** D-02 — separate mini-counters, one per kind of action. */
export function CategoryBreakdown({
  stats,
  breakdown,
  mission,
}: {
  stats: MissionStats;
  breakdown: ActionBreakdown[];
  mission: Mission;
}) {
  const tiles = [
    {
      icon: "🤝",
      value: tidyNumber(
        breakdown
          .filter((b) => b.track === "pledge")
          .reduce((sum, b) => sum + Number(b.confirmed_units ?? 0), 0),
      ),
      label: `${mission.unit_plural} pledged & done`,
      accent: "ember",
    },
    {
      icon: "↗",
      value: String(stats.external_give_count),
      label: `gave directly · ${stats.give_link_clicks} clicked through`,
      accent: "gold",
    },
    {
      icon: "⏳",
      value: tidyNumber(stats.volunteer_hours),
      label: "volunteer hours pledged",
      accent: "sage",
    },
    {
      icon: "📣",
      value: String(stats.share_count),
      label: "shares",
      accent: "violet",
    },
    {
      icon: "💌",
      value: String(stats.wish_count),
      label: "wishes",
      accent: "rose",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {tiles.map((tile) => (
        <Card key={tile.label} data-accent={tile.accent} className="p-4">
          <span className="text-lg">{tile.icon}</span>
          <p className="nums mt-1 font-display text-2xl text-ink">{tile.value}</p>
          <p className="mt-0.5 text-xs leading-snug text-ink-2">{tile.label}</p>
        </Card>
      ))}
    </div>
  );
}

/** D-05 — who has joined, as a live avatar stack. Never who hasn't. */
export function ContributorStack({
  contributions,
  total,
}: {
  contributions: Contribution[];
  total: number;
}) {
  const people = contributions.slice(0, 9);
  if (people.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {people.map((c) => (
          <Avatar key={c.id} name={c.contributor_name} size={34} />
        ))}
      </div>
      <p className="text-sm text-ink-2">
        {total > people.length ? (
          <>
            <span className="nums font-semibold text-ink">{total}</span> people have joined
          </>
        ) : (
          <>
            <span className="nums font-semibold text-ink">{total}</span>{" "}
            {plural(total, "person has", "people have")} joined
          </>
        )}
      </p>
    </div>
  );
}
