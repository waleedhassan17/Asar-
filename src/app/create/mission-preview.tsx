"use client";

import { Badge, Card, Progress } from "@/components/ui";
import { ProgressRing } from "@/components/ui/progress-ring";
import { formatDate, plural, tidyNumber } from "@/lib/format";
import type { Accent } from "@/lib/types";

/**
 * What the mission page will look like, updating as the form is filled in.
 *
 * Shown at nothing-yet on purpose rather than hidden until valid: the
 * point is to watch it fill up. Placeholders are greyed and phrased as
 * prompts ("Your mission") so nobody mistakes them for saved values.
 *
 * The ring sits at zero because a brand-new mission has no contributions
 * — this previews the frame, not a fake tally.
 */
export function MissionPreview({
  icon,
  title,
  headline,
  impactLine,
  goal,
  unitSingular,
  unitPlural,
  accent,
  birthday,
  ownerName,
}: {
  icon: string;
  title: string;
  headline: string;
  impactLine: string;
  goal: number;
  unitSingular: string;
  unitPlural: string;
  accent: Accent;
  birthday: string;
  ownerName: string;
}) {
  const units = plural(goal, unitSingular || "action", unitPlural || "actions");

  return (
    <div data-accent={accent} className="lg:sticky lg:top-24">
      <p className="mb-2 text-xs font-medium tracking-wide text-ink-3 uppercase">Live preview</p>

      <Card className="overflow-hidden p-0">
        <div className="relative bg-accent-wash px-6 pt-7 pb-6">
          <span className="text-3xl" aria-hidden>
            {icon}
          </span>
          <p className="mt-3 text-sm font-medium text-accent">
            {headline.trim() || "Join my purpose"}
          </p>
          <h3
            className={
              "mt-1 font-display text-2xl leading-snug " + (title.trim() ? "text-ink" : "text-ink-3")
            }
          >
            {title.trim() || "Your mission"}
          </h3>
          <p className="mt-1.5 text-sm text-ink-2">
            {ownerName}&apos;s birthday
            {birthday ? ` · ${formatDate(birthday)}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-5 px-6 py-6">
          <ProgressRing percent={0} size={84} label="No contributions yet">
            <span className="nums font-display text-lg font-semibold text-ink">0</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="nums font-display text-2xl text-ink">
              0 <span className="text-ink-3">/ {tidyNumber(goal || 0)}</span>
            </p>
            <p className="text-sm text-ink-2">{units}</p>
            <Badge tone="neutral" className="mt-2">
              Nobody has joined yet
            </Badge>
          </div>
        </div>

        {impactLine.trim() ? (
          <p className="border-t border-line px-6 py-4 text-sm text-ink-2 italic">
            “{impactLine.trim()}”
          </p>
        ) : null}

        <div className="border-t border-line px-6 py-4">
          <Progress percent={0} label="Mission progress preview" />
        </div>
      </Card>

      <p className="mt-3 text-xs leading-relaxed text-ink-3">
        This is the page your friends will open. They won&apos;t need an account to join.
      </p>
    </div>
  );
}
