import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SetupNotice } from "@/components/site/setup-notice";
import { Card, LinkButton } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { getPublicSettings } from "@/lib/settings";
import type { MissionPage, Organization } from "@/lib/types";
import { MissionView } from "./mission-view";

export const dynamic = "force-dynamic";

type LoadResult =
  | { kind: "ok"; page: MissionPage }
  | { kind: "locked" }
  | { kind: "missing" };

async function loadMission(slug: string, token: string | null): Promise<LoadResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_get_mission", {
    p_slug: slug,
    p_token: token,
  });

  if (error) {
    // Distinguish "doesn't exist" from "you need the secret link" so we
    // can explain the second case instead of showing a bare 404.
    if (error.message?.includes("MISSION_PRIVATE")) return { kind: "locked" };
    return { kind: "missing" };
  }
  return { kind: "ok", page: data as MissionPage };
}

/**
 * Track B: the organizations this mission's owner picked from the
 * directory. Loaded separately so a directory hiccup can never take the
 * mission page down with it.
 */
async function loadMissionOrgs(slug: string, token: string | null): Promise<Organization[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("api_mission_orgs", { p_slug: slug, p_token: token });
    return (data as Organization[] | null) ?? [];
  } catch {
    return [];
  }
}

export async function generateMetadata(props: PageProps<"/m/[slug]">): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "Mission" };

  const { slug } = await props.params;
  const { t } = await props.searchParams;
  const result = await loadMission(slug, typeof t === "string" ? t : null);

  if (result.kind !== "ok") return { title: "Mission" };

  const { mission, owner, stats } = result.page;
  const description = mission.story
    ? mission.story.slice(0, 180)
    : `${stats.confirmed_units} of ${mission.goal_amount} ${mission.unit_plural} so far. Pledge an action, give time, or just leave a wish.`;

  return {
    title: mission.title,
    description,
    openGraph: {
      title: `${owner?.display_name ?? "A friend"} — ${mission.title}`,
      description,
      type: "website",
    },
    // Link-only and friends-only missions must never be indexed (M-06).
    robots: mission.visibility === "public" ? undefined : { index: false, follow: false },
  };
}

export default async function MissionPageRoute(props: PageProps<"/m/[slug]">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { slug } = await props.params;
  const { t } = await props.searchParams;
  const token = typeof t === "string" ? t : null;

  const result = await loadMission(slug, token);

  if (result.kind === "missing") notFound();

  if (result.kind === "locked") {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-lg px-5 py-20">
          <Card className="p-8 text-center">
            <span className="text-4xl">🔗</span>
            <h1 className="mt-4 font-display text-2xl text-ink">This mission is private</h1>
            <p className="mt-3 text-ink-2">
              Its owner shared it with a secret link. Ask them to send it to you again — the link
              includes a token that this page needs.
            </p>
            <LinkButton href="/" className="mt-6">
              Back to Asar
            </LinkButton>
          </Card>
        </main>
        <SiteFooter />
      </>
    );
  }

  const [{ trustRules, transparencyNote }, orgs] = await Promise.all([
    getPublicSettings(),
    loadMissionOrgs(slug, token),
  ]);
  const shareUrl = `${siteUrl()}/m/${slug}${token ? `?t=${token}` : ""}`;

  return (
    <>
      <SiteHeader />
      <MissionView
        initial={result.page}
        orgs={orgs}
        token={token}
        trustRules={trustRules}
        transparencyNote={transparencyNote}
        shareUrl={shareUrl}
      />
      <SiteFooter />
    </>
  );
}
