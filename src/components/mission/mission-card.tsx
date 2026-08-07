"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Card, cx } from "@/components/ui";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useToast } from "@/components/ui/toast";
import { formatDate, plural, tidyNumber } from "@/lib/format";
import { clipForMission } from "@/lib/mission-clips";
import { ReelVideo } from "@/components/marketing/reel-video";
import { useNow } from "@/lib/use-now";
import type { MissionSummary } from "@/lib/types";

const DAY = 86_400_000;
const HOUR = 3_600_000;

function VisibilityIcon({ visibility }: { visibility: MissionSummary["visibility"] }) {
  const meta = {
    public: { icon: "🌍", label: "Public — anyone with the link, and it can be indexed" },
    link: { icon: "🔗", label: "Link only — needs the secret link" },
    friends: { icon: "👥", label: "Friends only — needs the secret link" },
  }[visibility];

  return (
    <span className="text-sm" title={meta.label} aria-label={meta.label} role="img">
      {meta.icon}
    </span>
  );
}

/**
 * One mission on the owner's dashboard.
 *
 * The whole card is a link to the mission page; the action row underneath
 * is deliberately outside that link (nested interactive elements are a
 * screen-reader trap), so Manage / Copy / Share sit in their own row.
 */
export function MissionCard({
  mission,
  origin,
  variant = "active",
}: {
  mission: MissionSummary;
  origin: string;
  variant?: "active" | "completed";
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const clip = clipForMission(mission.icon);

  // The clock is a subscription, not a render-time read: identical markup
  // on the server, then the real countdown once mounted.
  const now = useNow();
  const stats = mission.stats;
  const percent = stats?.goal_percent ?? 0;
  const confirmed = stats?.confirmed_units ?? 0;
  const contributors = stats?.contributor_count ?? 0;
  const remaining = now === null ? null : new Date(mission.reveal_at).getTime() - now;

  const url =
    mission.visibility === "public"
      ? `${origin}/m/${mission.slug}`
      : `${origin}/m/${mission.slug}?t=${mission.share_token}`;

  const countdown = mission.is_revealed
    ? { label: "Completed", tone: "neutral" as const }
    : remaining === null
      ? { label: "Counting down", tone: "neutral" as const }
      : remaining < 48 * HOUR
        ? { label: "Sprint", tone: "gold" as const }
        : {
            label: (() => {
              const days = Math.ceil(remaining / DAY);
              return `${days} ${plural(days, "day", "days")} to go`;
            })(),
            tone: "neutral" as const,
          };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast("Link copied.", "success");
    } catch {
      toast("Couldn't copy — long-press the link instead.", "warn");
    }
  }

  async function share() {
    const text = `I'm turning my birthday into ${mission.goal_amount} ${mission.unit_plural}. Join me:`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: mission.title, text, url });
        return;
      } catch {
        return; // dismissed — not an error
      }
    }
    await copyLink();
  }

  return (
    <Card data-accent={mission.accent} className="flex h-full flex-col overflow-hidden p-0">
      <Link
        href={`/m/${mission.slug}${mission.visibility === "public" ? "" : `?t=${mission.share_token}`}`}
        className="group flex flex-1 flex-col rounded-md"
      >
        {/* A strip of the mission's own subject. Matched on its icon, so a
            mission about meals shows a meal — the card is recognisable at
            a glance instead of being another white rectangle. */}
        <div className="relative h-24 shrink-0 overflow-hidden">
          <ReelVideo src={clip.src} poster={clip.poster} />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-surface via-surface/25 to-transparent"
          />
          <span
            aria-hidden
            className="absolute bottom-2 left-4 text-2xl drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
          >
            {mission.icon}
          </span>
        </div>

        <div className="flex flex-1 gap-4 p-5 pt-3">
        <ProgressRing percent={percent} size={78} label={`${Math.round(percent)}% of the goal`}>
          <span className="nums font-display text-lg font-semibold text-ink">
            {tidyNumber(confirmed)}
          </span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-end gap-2">
            <div className="flex items-center gap-1.5">
              <VisibilityIcon visibility={mission.visibility} />
              {mission.is_revealed ? (
                <Badge tone="success">Completed</Badge>
              ) : (
                <Badge tone="primary">Active</Badge>
              )}
            </div>
          </div>

          <h3 className="mt-2 line-clamp-2 font-semibold text-ink transition group-hover:text-primary-600">
            {mission.title}
          </h3>

          <p className="nums mt-1 text-sm text-ink-2">
            {tidyNumber(confirmed)} of {tidyNumber(mission.goal_amount)} {mission.unit_plural} ·{" "}
            {contributors} {plural(contributors, "person", "people")}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={countdown.tone}>{countdown.label}</Badge>
            <span className="text-xs text-ink-3">{formatDate(mission.birthday_date)}</span>
          </div>
        </div>
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-5 py-3 text-sm">
        <Link href={`/m/${mission.slug}`} className="text-ink-2 transition hover:text-primary-600">
          View
        </Link>
        <Link
          href={`/dashboard/${mission.slug}`}
          className="text-ink-2 transition hover:text-primary-600"
        >
          Manage
        </Link>
        <button
          type="button"
          onClick={copyLink}
          className={cx("transition hover:text-primary-600", copied ? "text-success" : "text-ink-2")}
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <button type="button" onClick={share} className="text-ink-2 transition hover:text-primary-600">
          Share
        </button>
        {variant === "completed" ? (
          <Link
            href={`/r/${mission.slug}`}
            className="ml-auto font-medium text-primary-600 transition hover:text-primary-500"
          >
            View reveal →
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

/** Dimension-matched placeholder so the grid doesn't jump when data lands. */
export function MissionCardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-soft" aria-hidden>
      <div className="flex gap-4">
        <div className="h-[78px] w-[78px] shrink-0 rounded-full bg-surface-2" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-6 rounded bg-surface-2" />
          <div className="h-4 w-4/5 rounded bg-surface-2" />
          <div className="h-3 w-3/5 rounded bg-surface-2" />
          <div className="h-5 w-24 rounded-pill bg-surface-2" />
        </div>
      </div>
      <div className="mt-4 h-4 w-2/3 rounded border-t border-line bg-surface-2" />
    </div>
  );
}
