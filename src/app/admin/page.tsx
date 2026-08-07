import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SetupNotice } from "@/components/site/setup-notice";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { AdminOverview, AdminPeople, ContactMessage, Organization } from "@/lib/types";
import { AdminView } from "./admin-view";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin");

  // The RPC enforces this too; checking here keeps a non-admin from
  // seeing an error page instead of an honest 404.
  if (!profile.is_admin) notFound();

  const supabase = await createClient();
  const [{ data, error }, { data: organizations }, { data: messages }, { data: people }] =
    await Promise.all([
      supabase.rpc("api_admin_overview"),
      supabase.rpc("api_admin_organizations"),
      supabase.rpc("api_admin_contact_messages"),
      supabase.rpc("api_admin_people"),
    ]);
  if (error || !data) notFound();

  return (
    <>
      <SiteHeader />
      <AdminView
        overview={data as AdminOverview}
        organizations={(organizations as Organization[] | null) ?? []}
        messages={(messages as ContactMessage[] | null) ?? []}
        people={
          (people as AdminPeople | null) ?? {
            totals: {
              people: 0, admins: 0, onboarded: 0, owners: 0, missions: 0, joined_last_7d: 0,
            },
            people: [],
          }
        }
      />
      <SiteFooter />
    </>
  );
}
