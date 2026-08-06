import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SetupNotice } from "@/components/site/setup-notice";
import { SignOutButton } from "@/components/site/sign-out-button";
import { Avatar, Card, SectionTitle } from "@/components/ui";
import { getCurrentProfile } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/settings");

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl px-5 py-10">
        <h1 className="font-display text-3xl text-ink">Settings</h1>
        <p className="mt-1 text-ink-2">Your account, and what other people see.</p>

        <Card className="mt-8 p-6">
          <div className="mb-6 flex items-center gap-4">
            <Avatar name={profile.display_name} size={52} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{profile.display_name}</p>
              <p className="truncate text-sm text-ink-3">{profile.email}</p>
            </div>
          </div>

          <SettingsForm displayName={profile.display_name} birthday={profile.birthday} />
        </Card>

        <Card className="mt-4 p-6">
          <SectionTitle
            title="Your account"
            hint="Email and password changes go through Supabase Auth — sign out and use “forgot password” on the sign-in page to reset."
          />
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">Email</dt>
              <dd className="truncate text-ink">{profile.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">Role</dt>
              <dd className="text-ink">{profile.is_admin ? "Platform admin" : "Mission owner"}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <SignOutButton />
            <Link href="/dashboard" className="text-sm text-ink-2 underline transition hover:text-ink">
              Back to my missions
            </Link>
          </div>
        </Card>

        <p className="mt-6 text-xs leading-relaxed text-ink-3">
          Deleting your account removes every mission you created and everything friends pledged to
          them. That isn&apos;t something we want to do by accident, so for now it&apos;s a manual
          request — email us and we&apos;ll do it properly.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
