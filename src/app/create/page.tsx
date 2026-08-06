import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SetupNotice } from "@/components/site/setup-notice";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { MissionTemplate } from "@/lib/types";
import { MissionBuilder } from "./mission-builder";

export const metadata: Metadata = { title: "Create a mission" };
export const dynamic = "force-dynamic";

export default async function CreatePage(props: PageProps<"/create">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/create");

  // See the note in dashboard/page.tsx. Onboarding stamps `onboarded_at`
  // before it navigates here, so its own "Create my mission" button does
  // not bounce back.
  if (!profile.onboarded_at) redirect("/onboarding");

  const { template } = await props.searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("mission_templates")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <>
      <SiteHeader />
      {/* Wider than the old 3xl: the builder now carries a live preview
          column beside the form on large screens. */}
      <main className="mx-auto w-full max-w-5xl px-5 py-10">
        <MissionBuilder
          templates={(data as MissionTemplate[] | null) ?? []}
          defaultBirthday={profile.birthday}
          presetSlug={typeof template === "string" ? template : undefined}
          ownerName={profile.display_name}
        />
      </main>
      <SiteFooter />
    </>
  );
}
