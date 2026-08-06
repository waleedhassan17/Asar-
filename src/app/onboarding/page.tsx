import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/site/setup-notice";
import { PhotoSlideshow, type Slide } from "@/components/brand/photo-slideshow";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { MissionTemplate } from "@/lib/types";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Welcome" };
export const dynamic = "force-dynamic";

const SLIDES: Slide[] = [
  {
    src: "/backgrounds/hero-02.jpg",
    alt: "A pair of cupped hands holding dark soil",
    caption: "Two minutes now, and your birthday has somewhere to go.",
  },
  {
    src: "/backgrounds/hero-05.jpg",
    alt: "Plates of food and flatbread laid out on a table, seen from above",
    caption: "Ask for meals, trees or blood donors instead of gifts.",
  },
  {
    src: "/backgrounds/hero-03.jpg",
    alt: "Four people standing together, silhouetted against a sunset",
    caption: "Your friends join with one link. No account, no payment.",
  },
];

async function loadTemplates(): Promise<MissionTemplate[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("mission_templates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    return (data as MissionTemplate[] | null) ?? [];
  } catch {
    // The custom path still works without presets, so an empty list is a
    // degraded page rather than a broken one.
    return [];
  }
}

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/onboarding");

  // Already been through it — this is not a page to revisit by accident.
  // Settings is where a name or picture gets changed afterwards.
  if (profile.onboarded_at) redirect("/dashboard");

  const templates = await loadTemplates();

  return (
    <div className="grid min-h-screen flex-1 grid-rows-[auto_1fr] lg:grid-cols-[minmax(30rem,44rem)_1fr] lg:grid-rows-1">
      <PhotoSlideshow slides={SLIDES} className="h-40 sm:h-52 lg:order-2 lg:h-auto" />

      <div className="relative flex flex-col bg-surface-2 px-5 py-8 sm:px-10 lg:order-1 lg:px-14 lg:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(115% 75% at 0% 0%, var(--color-primary-100) 0%, transparent 55%)," +
              "radial-gradient(85% 55% at 100% 100%, var(--color-gold-100) 0%, transparent 60%)",
          }}
        />

        <main className="relative flex flex-1 items-center py-6">
          <div className="mx-auto w-full max-w-xl rounded-card border border-line bg-surface p-7 shadow-md sm:p-9">
            <OnboardingFlow
              templates={templates}
              initialName={profile.display_name}
              initialBirthday={profile.birthday}
              initialAvatar={profile.avatar_url}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
