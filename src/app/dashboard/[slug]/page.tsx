import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SetupNotice } from "@/components/site/setup-notice";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { getPublicSettings } from "@/lib/settings";
import type { MissionDashboard, Organization } from "@/lib/types";
import { DashboardView } from "./dashboard-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/dashboard/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: `Dashboard · ${slug}` };
}

export default async function MissionDashboardPage(props: PageProps<"/dashboard/[slug]">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { slug } = await props.params;
  const { created } = await props.searchParams;

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=/dashboard/${slug}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_mission_dashboard", { p_slug: slug });

  if (error || !data) notFound();

  const { trustRules } = await getPublicSettings();

  // Track B: the directory organizations this owner attached.
  const { data: orgs } = await supabase.rpc("api_mission_orgs", {
    p_slug: slug,
    p_token: null,
  });

  return (
    <>
      <SiteHeader />
      <DashboardView
        initial={data as MissionDashboard}
        initialOrgs={(orgs as Organization[] | null) ?? []}
        origin={siteUrl()}
        trustRules={trustRules}
        justCreated={created === "1"}
      />
      <SiteFooter />
    </>
  );
}
