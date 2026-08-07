"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Badge, Button, Card, cx } from "@/components/ui";
import { Confetti } from "@/components/ui/confetti";
import { CountUp } from "@/components/ui/count-up";
import { Countdown } from "@/components/mission/countdown";
import { ShareCard } from "@/components/reveal/share-card";
import { ImpactClip } from "@/components/reveal/impact-clip";
import { AsarWish } from "@/components/reveal/asar-wish";
import { describeContribution, formatDate, plural, tidyNumber, toneCopy } from "@/lib/format";
import type { RevealPayload } from "@/lib/types";

const SLIDE_MS = 5200;

/**
 * R-01 … R-06.
 *
 * The reveal is a story player (R-02/R-05): slides advance on their own
 * like an Instagram story so it can simply be watched, but every slide is
 * also a real section further down the page for anyone who'd rather read
 * at their own pace. Nothing here is behind the player.
 */
export function RevealView({ reveal, url }: { reveal: RevealPayload; url: string }) {
  const { mission, stats, headline, owner, proofs, wishes, breakdown } = reveal;
  const copy = toneCopy(mission.tone);
  const ownerName = owner?.display_name ?? "the birthday person";

  const slides = useMemo(() => {
    const list: { key: string; render: () => React.ReactNode }[] = [
      {
        key: "headline",
        render: () => (
          <>
            <p className="text-sm uppercase tracking-[0.25em] text-ink-2">{copy.revealLead}</p>
            <p className="mt-6 font-display text-7xl leading-none text-accent sm:text-8xl">
              <CountUp value={headline.unit_value > 0 ? headline.unit_value : headline.value} />
            </p>
            <p className="mt-3 font-display text-3xl text-ink sm:text-4xl">{headline.unit}</p>
            <p className="mt-6 max-w-md text-ink-2">
              {headline.people} {plural(headline.people, "person", "people")} showed up for{" "}
              {ownerName}&apos;s birthday.
            </p>
          </>
        ),
      },
    ];

    if (stats.lives_impacted > 0 && stats.lives_impacted !== headline.unit_value) {
      list.push({
        key: "lives",
        render: () => (
          <>
            <p className="text-sm uppercase tracking-[0.25em] text-ink-2">Which means</p>
            <p className="mt-6 font-display text-7xl leading-none text-accent sm:text-8xl">
              <CountUp value={stats.lives_impacted} />
            </p>
            <p className="mt-3 font-display text-3xl text-ink sm:text-4xl">
              {plural(stats.lives_impacted, "life", "lives")} touched
            </p>
          </>
        ),
      });
    }

    if (breakdown.length > 0) {
      list.push({
        key: "breakdown",
        render: () => (
          <>
            <p className="text-sm uppercase tracking-[0.25em] text-ink-2">What people did</p>
            <ul className="mt-6 w-full max-w-sm space-y-2">
              {breakdown.slice(0, 5).map((b) => (
                <li
                  key={`${b.track}-${b.action_label}`}
                  className="flex items-center justify-between rounded-lg bg-surface px-4 py-3 text-left"
                >
                  <span className="text-ink">{b.action_label}</span>
                  <span className="nums font-semibold text-accent">{b.entries}</span>
                </li>
              ))}
            </ul>
          </>
        ),
      });
    }

    if (proofs.length > 0) {
      list.push({
        key: "proofs",
        render: () => (
          <>
            <p className="text-sm uppercase tracking-[0.25em] text-ink-2">They sent proof</p>
            <div className="mt-6 grid max-w-md grid-cols-3 gap-2">
              {proofs.slice(0, 9).map((proof, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${proof.url}-${i}`}
                  src={proof.url}
                  alt={proof.note ?? `Proof from ${proof.name}`}
                  className="aspect-square w-full rounded-md object-cover"
                />
              ))}
            </div>
          </>
        ),
      });
    }

    if (wishes.length > 0) {
      list.push({
        key: "wishes",
        render: () => (
          <>
            <p className="text-sm uppercase tracking-[0.25em] text-ink-2">And they said</p>
            <div className="mt-6 w-full max-w-md space-y-2">
              {wishes.slice(0, 3).map((w) => (
                <div key={w.id} className="rounded-lg bg-surface px-4 py-3 text-left">
                  <p className="text-ink">{w.message}</p>
                  <p className="mt-1 text-xs text-ink-3">— {w.contributor_name}</p>
                </div>
              ))}
            </div>
          </>
        ),
      });
    }

    list.push({
      key: "thanks",
      render: () => (
        <>
          <span className="text-5xl">{mission.icon}</span>
          <p className="mt-6 max-w-md font-display text-3xl leading-snug text-ink">
            Happy birthday, {ownerName}.
          </p>
          <p className="mt-4 max-w-sm text-ink-2">{copy.thanks}</p>
        </>
      ),
    });

    return list;
  }, [breakdown, copy, headline, mission.icon, ownerName, proofs, stats.lives_impacted, wishes]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A playful reveal opens with a burst; an understated one never does.
  const burst = mission.tone === "playful" ? 1 : 0;

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= slides.length - 1) {
        setPlaying(false);
        return i;
      }
      return i + 1;
    });
  }, [slides.length]);

  useEffect(() => {
    if (!playing) return;
    timerRef.current = setTimeout(next, SLIDE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, index, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next]);

  const touchStart = useRef<number | null>(null);

  return (
    <div data-accent={mission.accent}>
      <Confetti fire={burst} pieces={80} />

      {/* ------------------------------------------------------------ */}
      {/* R-02 / R-05 — the story player                                */}
      {/* ------------------------------------------------------------ */}
      <section
        className="relative overflow-hidden border-b border-line"
        onTouchStart={(e) => {
          touchStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStart.current === null) return;
          const delta = e.changedTouches[0].clientX - touchStart.current;
          if (delta < -40) next();
          if (delta > 40) setIndex((i) => Math.max(0, i - 1));
          touchStart.current = null;
        }}
      >
        <div
          aria-hidden
          className="animate-drift pointer-events-none absolute left-1/2 top-0 h-[40rem] w-[52rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--accent-wash), transparent)" }}
        />

        <div className="relative mx-auto w-full max-w-3xl px-5 pb-12 pt-6">
          {/* progress bars */}
          <div className="flex gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.key}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => {
                  setIndex(i);
                  setPlaying(false);
                }}
                className="h-1 flex-1 overflow-hidden rounded-pill bg-line"
              >
                <span
                  className={cx(
                    "block h-full rounded-pill bg-accent transition-all",
                    i < index && "w-full",
                    i > index && "w-0",
                  )}
                  style={
                    i === index
                      ? {
                          width: "100%",
                          animation: playing
                            ? `grow ${SLIDE_MS}ms linear forwards`
                            : undefined,
                        }
                      : undefined
                  }
                />
              </button>
            ))}
          </div>

          <div
            className="flex min-h-[26rem] flex-col items-center justify-center py-10 text-center"
            key={slides[index].key}
          >
            <div className="animate-rise flex flex-col items-center">{slides[index].render()}</div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              ← Back
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : index === slides.length - 1 ? "Replay" : "Play"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={next}
              disabled={index === slides.length - 1}
            >
              Next →
            </Button>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-4xl space-y-10 px-5 py-12">
        {/* ---------------------------------------------------------- */}
        {/* R-01 — the summary, in plain sight                          */}
        {/* ---------------------------------------------------------- */}
        <Card className="p-7 text-center sm:p-10">
          <p className="text-sm uppercase tracking-[0.25em] text-ink-2">{copy.revealLead}</p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-ink sm:text-5xl">
            {ownerName} asked for a mission instead of gifts —
            <br />
            <span className="text-accent">
              and {headline.people} {plural(headline.people, "person", "people")} said yes.
            </span>
          </h1>

          <dl className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              [tidyNumber(headline.unit_value), headline.unit],
              [tidyNumber(stats.lives_impacted), plural(stats.lives_impacted, "life", "lives") + " touched"],
              [tidyNumber(headline.people), plural(headline.people, "person", "people")],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="nums font-display text-4xl text-ink">{value}</dt>
                <dd className="mt-1 text-sm text-ink-2">{label}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 text-sm text-ink-3">
            {formatDate(mission.birthday_date, { day: "numeric", month: "long", year: "numeric" })}
            {" · "}
            {stats.proof_count} of {stats.contribution_count} entries carry a photo. Everything
            here is self-reported.
          </p>
        </Card>

        {/* ---------------------------------------------------------- */}
        {/* R-04 — shareable card                                        */}
        {/* ---------------------------------------------------------- */}
        {/* Asar's own wish, before the sharing tools. The page has just
            told this person what everyone did; the next thing they read
            should be addressed to them, not a row of share buttons. */}
        <div className="mb-4">
          <AsarWish name={ownerName.split(/\s+/)[0]} />
        </div>

        {/* The clip first, the card underneath it: the clip is the thing
            worth watching, the card is the thing that always works. */}
        <div className="mb-4">
          <ImpactClip reveal={reveal} />
        </div>

        <Card className="p-7">
          <h2 className="text-center font-display text-2xl text-ink">Share what happened</h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-ink-2">
            This is the part that recruits the next person&apos;s birthday.
          </p>
          <div className="mt-6">
            <ShareCard reveal={reveal} url={url} />
          </div>
        </Card>

        {/* ---------------------------------------------------------- */}
        {/* R-03 — proof collage                                         */}
        {/* ---------------------------------------------------------- */}
        {proofs.length > 0 ? (
          <section>
            <h2 className="font-display text-2xl text-ink">Proof people sent</h2>
            <p className="mt-1 text-sm text-ink-2">
              Submitted by contributors themselves. Not independently checked — just shared.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {proofs.map((proof, i) => (
                <a
                  key={`${proof.url}-${i}`}
                  href={proof.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden rounded-lg border border-line"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proof.url}
                    alt={proof.note ?? `Proof from ${proof.name}`}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-2 text-xs text-white">
                    {proof.name}
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Every wish, kept                                             */}
        {/* ---------------------------------------------------------- */}
        {wishes.length > 0 ? (
          <section>
            <h2 className="font-display text-2xl text-ink">Everything people said</h2>
            <ul className="mt-4 space-y-3">
              {wishes.map((w) => (
                <li key={w.id}>
                  <Card className="flex gap-3 p-5">
                    <Avatar name={w.contributor_name} size={38} />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {w.contributor_name}{" "}
                        <span className="font-normal text-ink-2">{describeContribution(w)}</span>
                      </p>
                      <p className="mt-1 whitespace-pre-line text-ink">{w.message}</p>
                      {w.owner_reaction ? (
                        <span className="mt-2 inline-block rounded-full bg-accent-wash px-2 py-0.5">
                          {w.owner_reaction}
                        </span>
                      ) : null}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* R-06 — this page is the permanent replay link                */}
        {/* ---------------------------------------------------------- */}
        <Card className="p-7 text-center">
          <Badge tone="neutral" className="mx-auto">
            Permanent link
          </Badge>
          <p className="mt-3 text-ink-2">
            This page stays here. Come back on any birthday and it&apos;ll still be exactly as it
            was.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href={`/m/${mission.slug}`}>
              <Button variant="outline">See the mission page</Button>
            </Link>
            <Link href="/create">
              <Button>Start my own mission</Button>
            </Link>
          </div>
        </Card>
      </main>

      <style>{`@keyframes grow { from { width: 0 } to { width: 100% } }`}</style>
    </div>
  );
}

/** Shown when someone opens the reveal before the birthday. */
export function RevealLocked({
  reveal,
  isOwner,
  previewHref,
}: {
  reveal: RevealPayload;
  isOwner: boolean;
  previewHref: string;
}) {
  const { mission, owner, stats } = reveal;

  return (
    <main
      data-accent={mission.accent}
      className="relative mx-auto flex w-full max-w-lg flex-col items-center px-5 py-20 text-center"
    >
      <span className="text-5xl">{mission.icon}</span>
      <h1 className="mt-5 font-display text-3xl text-ink">Not yet 🤫</h1>
      <p className="mt-3 text-ink-2">
        The “because of you” summary unlocks on{" "}
        {owner?.display_name ? `${owner.display_name}'s` : "the"} birthday —{" "}
        {formatDate(mission.birthday_date, { day: "numeric", month: "long" })}.
      </p>

      <div className="mt-8">
        <Countdown target={mission.reveal_at} lead="Unlocks in" />
      </div>

      <Card className="mt-8 w-full p-6">
        <p className="text-sm text-ink-2">Meanwhile, the mission is very much alive.</p>
        <p className="nums mt-2 font-display text-3xl text-ink">
          {tidyNumber(stats.confirmed_units)} {mission.unit_plural}
        </p>
        <Link href={`/m/${mission.slug}`} className="mt-4 inline-block">
          <Button variant="accent">Open the mission</Button>
        </Link>
      </Card>

      {isOwner ? (
        <Link href={previewHref} className="mt-6 text-sm text-primary-600 underline">
          Preview your reveal (only you can see this)
        </Link>
      ) : null}
    </main>
  );
}
