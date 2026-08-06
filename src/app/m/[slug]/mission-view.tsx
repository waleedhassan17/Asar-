"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Badge, Button, Card, cx } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { Countdown } from "@/components/mission/countdown";
import { ContributeSheet } from "@/components/mission/contribute-sheet";
import { WishWall } from "@/components/mission/wish-wall";
import { CategoryBreakdown, ContributorStack, LiveTally } from "@/components/mission/tally";
import { ShareBar } from "@/components/mission/share-bar";
import { TRACK_META, formatDate, toneCopy } from "@/lib/format";
import { getVisitorHash, updatePledgeStatus, type StoredPledge } from "@/lib/visitor";
import { usePledges } from "@/lib/use-pledges";
import { OrgCard } from "@/components/directory/org-card";
import type {
  Contribution,
  ContributionTrack,
  MissionPage,
  Organization,
  TrustRules,
} from "@/lib/types";
import {
  addContributionAction,
  confirmContributionAction,
  refreshMissionAction,
} from "./actions";

const REFRESH_MS = 20_000;

export function MissionView({
  initial,
  orgs,
  token,
  trustRules,
  transparencyNote,
  shareUrl,
}: {
  initial: MissionPage;
  /** Directory organizations the owner attached to this mission (Track B). */
  orgs: Organization[];
  token: string | null;
  trustRules: TrustRules;
  transparencyNote: string;
  shareUrl: string;
}) {
  const [page, setPage] = useState(initial);
  const [sheetTrack, setSheetTrack] = useState<ContributionTrack | null>(null);

  const { mission, stats, owner } = page;
  const pledges = usePledges(mission.slug);
  const copy = toneCopy(mission.tone);
  const ownerName = owner?.display_name ?? "the birthday person";

  /* D-01 / D-05: keep the page alive without a websocket. Polling pauses
     while the tab is hidden so a page left open overnight costs nothing. */
  const refresh = useCallback(async () => {
    const fresh = await refreshMissionAction(mission.slug, token);
    if (fresh) setPage(fresh as MissionPage);
  }, [mission.slug, token]);

  useEffect(() => {
    if (mission.is_revealed) return;

    const tick = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, mission.is_revealed]);

  function handleAdded(contribution: Contribution) {
    // Show it immediately, then reconcile with the server tally.
    setPage((current) => ({
      ...current,
      contributions: [contribution, ...current.contributions],
    }));
    void refresh();
  }

  const shareText = `${ownerName} is turning their birthday into ${mission.goal_amount} ${mission.unit_plural}. Join in:`;

  return (
    <div data-accent={mission.accent}>
      {/* ------------------------------------------------------------ */}
      {/* Hero                                                          */}
      {/* ------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="animate-drift pointer-events-none absolute -top-52 left-1/2 h-[32rem] w-[46rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--accent-wash), transparent)",
          }}
        />

        <div className="relative mx-auto w-full max-w-5xl px-5 pb-10 pt-12 text-center">
          <span className="text-5xl">{mission.icon}</span>

          <p className="mt-4 text-sm font-medium uppercase tracking-wider text-accent">
            {mission.headline}
          </p>

          <h1 className="mx-auto mt-2 max-w-2xl font-display text-4xl leading-tight text-ink sm:text-5xl">
            {mission.title}
          </h1>

          <p className="mt-3 text-ink-2">
            {ownerName}&apos;s birthday · {formatDate(mission.birthday_date)}
          </p>

          {mission.story ? (
            <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-ink-2">
              {mission.story}
            </p>
          ) : null}

          <div className="mt-8 flex justify-center">
            {mission.is_revealed ? (
              <Link href={`/r/${mission.slug}${token ? `?t=${token}` : ""}`}>
                <Button size="lg" variant="accent">
                  See what everyone did →
                </Button>
              </Link>
            ) : (
              <Countdown target={mission.reveal_at} lead={copy.countdownLead} sprint={mission.is_sprint} />
            )}
          </div>

          {mission.is_sprint && !mission.is_revealed ? (
            <p className="mt-4 text-sm text-ink-3">
              A short mission — every single entry matters more here.
            </p>
          ) : null}
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl space-y-10 px-5 py-10">
        {/* ---------------------------------------------------------- */}
        {/* Live dashboard (D-01, D-02, D-05, D-06)                     */}
        {/* ---------------------------------------------------------- */}
        <section className="space-y-4">
          <LiveTally mission={mission} stats={stats} celebrate={mission.tone === "playful"} />
          <CategoryBreakdown stats={stats} breakdown={page.breakdown} mission={mission} />
          <ContributorStack
            contributions={page.contributions}
            total={stats.contributor_count}
          />
        </section>

        {/* ---------------------------------------------------------- */}
        {/* The three tracks, equally weighted (§8)                      */}
        {/* ---------------------------------------------------------- */}
        {!mission.is_revealed || mission.allow_wish_only ? (
          <section>
            <h2 className="font-display text-2xl text-ink">{copy.joinCta}</h2>
            <p className="mt-1 text-ink-2">
              {mission.is_revealed
                ? "The tally is closed, but a message is always welcome."
                : "Money, time, or just your voice. Pick whichever is actually true for you."}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(mission.is_revealed
                ? (["wish"] as ContributionTrack[])
                : (["pledge", "volunteer", "wish"] as ContributionTrack[])
              )
                .filter((t) => t !== "wish" || mission.allow_wish_only)
                .map((track) => {
                  const meta = TRACK_META[track];
                  return (
                    <button
                      key={track}
                      type="button"
                      data-accent={meta.accent}
                      onClick={() => setSheetTrack(track)}
                      className="rounded-card border border-line bg-surface p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent-wash text-xl">
                        {meta.icon}
                      </span>
                      <p className="mt-3 font-semibold text-ink">{meta.label}</p>
                      <p className="mt-1 text-sm text-ink-2">{meta.blurb}</p>
                    </button>
                  );
                })}
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Track B — organizations from the directory                   */}
        {/* ---------------------------------------------------------- */}
        {mission.allow_external_give && orgs.length > 0 ? (
          <section>
            <h2 className="font-display text-2xl text-ink">Give to a cause {ownerName} picked</h2>
            <p className="mt-1 text-ink-2">
              Each one opens that organization&apos;s <strong>own official website</strong>, where
              you give them directly. Asar never handles or processes your donation.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orgs.map((org) => (
                <OrgCard key={org.id} org={org} />
              ))}
            </div>

            <p className="mt-3 text-xs text-ink-3">
              Gave to one of these? Tell the tally about it with{" "}
              <button
                type="button"
                className="underline transition hover:text-ink"
                onClick={() => setSheetTrack("external_give")}
              >
                &ldquo;I gave directly&rdquo;
              </button>{" "}
              — self-reported, never a receipt.
            </p>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Track B — give-links (C-201, C-203)                          */}
        {/* ---------------------------------------------------------- */}
        {mission.allow_external_give && page.links.filter((l) => l.moderation === "approved").length > 0 ? (
          <section>
            <h2 className="font-display text-2xl text-ink">Give directly</h2>
            <p className="mt-1 text-ink-2">
              Links {ownerName} chose. You&apos;ll leave Asar — we never handle the money, we only
              count that you went.
            </p>

            <div className="mt-4 space-y-2">
              {page.links
                .filter((l) => l.moderation === "approved")
                .map((link) => (
                  <Card key={link.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{link.label}</p>
                      <p className="truncate text-xs text-ink-3">{link.url}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-ink-3 sm:inline">
                        {link.click_count} clicked
                      </span>
                      <Button size="sm" variant="outline" onClick={() => setSheetTrack("external_give")}>
                        Open ↗
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* C-102 — pledges this device made, waiting to be ticked off   */}
        {/* ---------------------------------------------------------- */}
        <YourPledges
          pledges={pledges}
          slug={mission.slug}
          onConfirmed={(id) => {
            updatePledgeStatus(id, "fulfilled");
            void refresh();
          }}
        />

        {/* ---------------------------------------------------------- */}
        {/* Sharing (C-302)                                              */}
        {/* ---------------------------------------------------------- */}
        <section>
          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="font-semibold text-ink">Sharing counts too</p>
              <p className="mt-1 text-sm text-ink-2">
                Most missions grow because one person forwarded the link.
              </p>
            </div>
            <ShareBar
              url={shareUrl}
              text={shareText}
              onShared={async () => {
                const result = await addContributionAction({
                  slug: mission.slug,
                  token: token ?? undefined,
                  track: "share",
                  contributor_name: "A friend",
                  message: "Shared this mission",
                  visitor_hash: getVisitorHash(),
                });
                if (result.ok) void refresh();
              }}
            />
          </Card>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* W-03 wish wall                                               */}
        {/* ---------------------------------------------------------- */}
        <WishWall
          contributions={page.contributions}
          slug={mission.slug}
          isOwner={page.is_owner}
          trustRules={trustRules}
          title={copy.wishWall}
        />

        {/* ---------------------------------------------------------- */}
        {/* T-04 transparency note                                       */}
        {/* ---------------------------------------------------------- */}
        <section>
          <div className="rounded-card border border-line bg-surface-2 p-5">
            <div className="flex items-start gap-3">
              <span className="text-lg" aria-hidden>
                🔎
              </span>
              <div>
                <p className="text-sm text-ink-2">{transparencyNote}</p>
                <p className="mt-2 text-xs text-ink-3">
                  {stats.proof_count} of {stats.contribution_count} entries here have a photo
                  attached ·{" "}
                  <Link href="/transparency" className="underline">
                    platform transparency log
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {page.is_owner ? (
          <div className="flex justify-center">
            <Link href={`/dashboard/${mission.slug}`}>
              <Button variant="outline">Open your mission dashboard</Button>
            </Link>
          </div>
        ) : null}
      </main>

      {/* ------------------------------------------------------------ */}
      {/* Sticky mobile CTA — always shows the no-pressure option too   */}
      {/* ------------------------------------------------------------ */}
      {!mission.is_revealed ? (
        <div className="sticky bottom-0 z-30 border-t border-line glass px-4 py-3 sm:hidden">
          <div className="flex gap-2">
            <Button variant="accent" className="flex-1" onClick={() => setSheetTrack("pledge")}>
              {copy.joinCta}
            </Button>
            {mission.allow_wish_only ? (
              <Button variant="outline" onClick={() => setSheetTrack("wish")}>
                Just a wish
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Keyed on the chosen track so each open mounts a fresh sheet,
          rather than an effect resetting a dozen fields. */}
      <ContributeSheet
        key={sheetTrack ?? "closed"}
        open={sheetTrack !== null}
        onClose={() => setSheetTrack(null)}
        mission={mission}
        links={page.links.filter((l) => l.moderation === "approved")}
        ownerName={ownerName}
        token={token}
        initialTrack={sheetTrack ?? "pledge"}
        onAdded={handleAdded}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* C-102 — self-confirm, resumed from localStorage on any later visit  */
/* ------------------------------------------------------------------ */
function YourPledges({
  pledges,
  slug,
  onConfirmed,
}: {
  pledges: StoredPledge[];
  slug: string;
  onConfirmed: (id: string) => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const open = pledges.filter((p) => p.status === "pledged");

  if (pledges.length === 0) return null;

  function confirm(pledge: StoredPledge) {
    startTransition(async () => {
      const result = await confirmContributionAction({
        id: pledge.id,
        manageToken: pledge.manageToken,
        slug,
      });
      if (result.ok) {
        onConfirmed(pledge.id);
        toast("Marked as done — thank you 💛", "success");
      } else {
        toast(result.error ?? "Couldn't update that.", "warn");
      }
    });
  }

  return (
    <section>
      <h2 className="font-display text-2xl text-ink">What you pledged</h2>
      <p className="mt-1 text-ink-2">
        Only visible on this device. Tick something off whenever it&apos;s actually done — no
        reminders, no nagging.
      </p>

      <div className="mt-4 space-y-2">
        {pledges.map((pledge) => (
          <Card
            key={pledge.id}
            className={cx(
              "flex flex-wrap items-center justify-between gap-3 p-4",
              pledge.status !== "pledged" && "opacity-70",
            )}
          >
            <div>
              <p className="font-medium text-ink">{pledge.label}</p>
              <p className="text-xs text-ink-3">
                {pledge.status === "pledged" ? "Promised" : "Done ✓"}
              </p>
            </div>
            {pledge.status === "pledged" ? (
              <Button size="sm" variant="accent" onClick={() => confirm(pledge)} disabled={pending}>
                Mark as done
              </Button>
            ) : (
              <Badge tone="success">Confirmed</Badge>
            )}
          </Card>
        ))}
      </div>

      {open.length > 0 ? (
        <p className="mt-3 text-xs text-ink-3">
          Nothing happens if you never come back — a pledge that isn&apos;t confirmed simply
          isn&apos;t counted in the total.
        </p>
      ) : null}
    </section>
  );
}
