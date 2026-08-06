import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SetupNotice } from "@/components/site/setup-notice";
import { SignOutButton } from "@/components/site/sign-out-button";
import { Card, LinkButton } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { MissionCard, MissionCardSkeleton } from "@/components/mission/mission-card";
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-ink">{greeting}</h1>
            <p className="mt-1 text-ink-2">Every mission you&apos;ve started, and how it&apos;s going.</p>
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
      <div className="mt-10 flex flex-col items-center rounded-card border border-dashed border-line px-6 py-16 text-center">
        <Logo variant="tile" size={64} />
        <p className="mt-6 max-w-md font-display text-2xl leading-snug text-ink">
          Your first mission is waiting. Turn this birthday into something that lasts.
        </p>
        <p className="mt-3 max-w-sm text-ink-2">
          Pick a purpose, share one link, and open the reveal on the day.
        </p>
        <LinkButton href="/create" size="lg" className="mt-7">
          Start a mission
        </LinkButton>
      </div>
    );
  }

  const active = missions.filter((m) => !m.is_revealed);
  const completed = missions.filter((m) => m.is_revealed);

  const lives = missions.reduce((sum, m) => sum + (m.stats?.lives_impacted ?? 0), 0);
  const contributors = missions.reduce((sum, m) => sum + (m.stats?.contributor_count ?? 0), 0);
  const nextBirthday =
    active
      .map((m) => m.reveal_at)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

  return (
    <>
      <div className="mt-8">
        <DashboardStats lives={lives} contributors={contributors} nextBirthday={nextBirthday} />
      </div>

      {active.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl text-ink">
            Counting down{" "}
            <span className="nums text-base font-normal text-ink-3">
              {active.length} {plural(active.length, "mission", "missions")}
            </span>
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {active.map((mission) => (
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
      <div className="mt-8">
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
