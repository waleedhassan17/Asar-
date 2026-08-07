import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SetupNotice } from "@/components/site/setup-notice";
import { SignOutButton } from "@/components/site/sign-out-button";
import { Card, LinkButton } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { GlassCard } from "@/components/brand/glass-card";
import { ReelVideo } from "@/components/marketing/reel-video";
import { MissionCard, MissionCardSkeleton } from "@/components/mission/mission-card";
import { NextReveal } from "./next-reveal";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { plural } from "@/lib/format";
import type { MissionSummary } from "@/lib/types";
import { DashboardStats, DashboardStatsSkeleton } from "./dashboard-stats";

export const metadata: Metadata = { title: "My missions" };
export const dynamic = "force-dynamic";

type LoadResult = { ok: true; missions: MissionSummary[] } | { ok: false };

async function loadMissions(): Promise<LoadResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_my_missions");
  if (error) return { ok: false };
  return { ok: true, missions: (data as MissionSummary[] | null) ?? [] };
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/dashboard");

  // First run. Gated here rather than in middleware because this page
  // already has the profile in hand — doing it upstream would add a
  // database round trip to every request on the site.
  if (!profile.onboarded_at) redirect("/onboarding");

  // "Assalamu alaikum" is the warmer greeting for the audience this is
  // built for; anyone without a name set still gets a proper welcome.
  const firstName = profile.display_name?.trim().split(/\s+/)[0];
  const greeting =
    firstName && firstName.toLowerCase() !== "friend"
      ? `Assalamu alaikum, ${firstName}`
      : "Welcome back";

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <h1 className="font-display text-3xl text-ink sm:text-[2.25rem]">{greeting}</h1>
            <p className="mt-1.5 text-ink-2">
              Every mission you&apos;ve started, and how it&apos;s going.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SignOutButton />
            <LinkButton href="/create">Start a mission</LinkButton>
          </div>
        </div>

        <Suspense fallback={<DashboardSkeleton />}>
          <MissionSections />
        </Suspense>
      </main>

      <SiteFooter />
    </>
  );
}

async function MissionSections() {
  const result = await loadMissions();

  // A failed read is a calm retry block, never a stack trace and never a
  // blank page.
  if (!result.ok) {
    return (
      <Card className="mt-8 p-8 text-center">
        <p className="font-display text-xl text-ink">We couldn&apos;t load your missions</p>
        <p className="mx-auto mt-2 max-w-md text-ink-2">
          Something went wrong on our side — your missions are safe. Try again in a moment.
        </p>
        <LinkButton href="/dashboard" variant="outline" className="mt-5">
          Try again
        </LinkButton>
      </Card>
    );
  }

  const { missions } = result;
  const origin = siteUrl();

  if (missions.length === 0) {
    return (
      <div className="mt-10 overflow-hidden rounded-card border border-line">
        <div className="relative isolate min-h-[26rem] overflow-hidden">
          {/* A first-run dashboard has no numbers to show, so this is the
              one place on it where footage is the content rather than a
              distraction from it. */}
          <div className="absolute inset-0">
            <ReelVideo src="/videos/mission-general.mp4" poster="/videos/mission-general.jpg" />
          </div>
          <div aria-hidden className="absolute inset-0 scrim-hero" />
          <div className="relative flex min-h-[26rem] items-center justify-center px-5 py-14">
            <GlassCard className="max-w-md text-center">
              <Logo variant="tile" size={56} className="mx-auto" />
              <p className="mt-5 font-display text-2xl leading-snug text-balance text-ink">
                Your first mission is waiting. Turn this birthday into something that lasts.
              </p>
              <p className="mt-3 text-ink-2">
                Pick a purpose, share one link, and open the reveal on the day.
              </p>
              <LinkButton href="/create" size="lg" className="mt-7">
                Start a mission
              </LinkButton>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  // Soonest birthday first, so the mission nearest its day leads the page.
  const active = missions
    .filter((m) => !m.is_revealed)
    .sort((a, b) => new Date(a.reveal_at).getTime() - new Date(b.reveal_at).getTime());
  const completed = missions.filter((m) => m.is_revealed);

  const lives = missions.reduce((sum, m) => sum + (m.stats?.lives_impacted ?? 0), 0);
  const contributors = missions.reduce((sum, m) => sum + (m.stats?.contributor_count ?? 0), 0);

  // The nearest mission gets the focal band; showing it again in the grid
  // directly underneath would just be the same card twice.
  const [featured, ...rest] = active;

  return (
    <>
      {featured ? (
        <div className="mt-8">
          <NextReveal mission={featured} origin={origin} />
        </div>
      ) : null}

      <div className="mt-4">
        <DashboardStats
          lives={lives}
          contributors={contributors}
          missions={missions.length}
        />
      </div>

      {rest.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl text-ink">
            Also counting down{" "}
            <span className="nums text-base font-normal text-ink-3">
              {rest.length} {plural(rest.length, "mission", "missions")}
            </span>
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {rest.map((mission) => (
              <li key={mission.id}>
                <MissionCard mission={mission} origin={origin} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl text-ink">Revealed</h2>
          <p className="mt-1 text-ink-2">
            The day has passed — open the reveal to see what everyone did.
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {completed.map((mission) => (
              <li key={mission.id}>
                <MissionCard mission={mission} origin={origin} variant="completed" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      {/* Mirrors the NextReveal band so the page doesn't jump when it lands. */}
      <div
        className="mt-8 h-[17.5rem] rounded-card border border-line bg-surface shadow-soft sm:h-64"
        aria-hidden
      />
      <div className="mt-4">
        <DashboardStatsSkeleton />
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2" aria-hidden>
        <MissionCardSkeleton />
        <MissionCardSkeleton />
      </div>
      <span className="sr-only" role="status">
        Loading your missions…
      </span>
    </>
  );
}
