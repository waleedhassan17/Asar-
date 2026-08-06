import type { Metadata } from "next";
import { Card, EmptyState, LinkButton } from "@/components/ui";
import { SetupNotice } from "@/components/site/setup-notice";
import { PhotoBackground } from "@/components/brand/photo-background";
import { GlassCard } from "@/components/brand/glass-card";
import { OrgCard } from "@/components/directory/org-card";
import { DirectoryFilters } from "@/components/directory/directory-filters";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { backgroundByMood } from "@/lib/backgrounds";
import { ORG_CATEGORIES, ORG_COLUMNS, categoryIcon, categoryLabel } from "@/lib/directory";
import { DIRECTORY_BANNER } from "@/lib/copy";
import type { Organization } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Where to give",
  description:
    "A curated directory of organizations you can support. You donate on each organization's own official website — Asar never handles or processes your donation.",
  openGraph: {
    title: "Where to give · Asar",
    description:
      "Trusted causes, each linking to its own official donation page. Asar is never in the money path.",
    type: "website",
  },
};

async function loadOrganizations(): Promise<Organization[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select(ORG_COLUMNS)
    .order("is_featured", { ascending: false })
    .order("sort_order")
    .order("name");
  return (data as Organization[] | null) ?? [];
}

export default async function GiveDirectoryPage(props: PageProps<"/give">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { cause, country, missing } = await props.searchParams;
  const activeCause = typeof cause === "string" ? cause : null;
  const activeCountry = typeof country === "string" ? country : null;

  const all = await loadOrganizations();
  const hero = backgroundByMood("community");

  const causes = [...new Set(all.flatMap((o) => o.causes))].sort();
  const countries = [...new Set(all.map((o) => o.country))].sort();

  const shown = all.filter(
    (o) =>
      (activeCause === null || o.causes.includes(activeCause)) &&
      (activeCountry === null || o.country === activeCountry),
  );

  // Featured first (the SQL order already does this), then grouped by
  // category so the page reads as sections rather than an endless grid.
  const featured = shown.filter((o) => o.is_featured);
  const rest = shown.filter((o) => !o.is_featured);
  const sections = ORG_CATEGORIES.map((category) => ({
    ...category,
    orgs: rest.filter((o) => o.category === category.value),
  })).filter((section) => section.orgs.length > 0);

  return (
    <>
      <PhotoBackground src={hero.src} alt={hero.alt} eager className="min-h-[22rem]">
        <div className="mx-auto flex w-full max-w-4xl items-center px-5 pb-14 pt-14 sm:pt-20">
          <GlassCard className="w-full sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
              Donation directory
            </p>
            <h1 className="mt-4 font-display text-[2.2rem] leading-tight text-ink sm:text-5xl">
              Causes worth a birthday.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
              We link you to trusted organizations — we don&apos;t speak for them, and they
              aren&apos;t partners of ours. Pick one, read what they do, and give on their own site.
            </p>
          </GlassCard>
        </div>
      </PhotoBackground>

      <div className="mx-auto w-full max-w-6xl px-5 py-10">
        {/* The one sentence that has to be impossible to miss. */}
        <div className="flex items-start gap-3 rounded-card border border-primary-100 bg-primary-100/60 p-5">
          <span className="text-lg" aria-hidden>
            🔒
          </span>
          <div>
            <p className="font-semibold text-ink">{DIRECTORY_BANNER}</p>
            <p className="mt-1 text-sm text-ink-2">
              There is no payment screen anywhere in Asar. Every &ldquo;Donate&rdquo; button opens
              the organization&apos;s own site in a new tab, and whatever you give goes straight to
              them.
            </p>
          </div>
        </div>

        {missing ? (
          <Card className="mt-4 border-warning/30 bg-warning-100 p-5">
            <p className="font-medium text-ink">We couldn&apos;t find that organization.</p>
            <p className="mt-1 text-sm text-ink-2">
              It may have been removed from the directory. Everything currently listed is below.
            </p>
          </Card>
        ) : null}

        {all.length === 0 ? (
          <EmptyState
            icon="🌱"
            title="The directory is empty"
            body="No organizations have been added yet. An admin can add them from the Organizations manager."
            action={
              <LinkButton href="/create" variant="outline">
                Start a mission instead
              </LinkButton>
            }
          />
        ) : (
          <>
            <div className="mt-8">
              <DirectoryFilters causes={causes} countries={countries} />
            </div>

            <p className="mt-6 text-sm text-ink-3">
              {shown.length} {shown.length === 1 ? "organization" : "organizations"}
              {activeCause ? ` · ${activeCause}` : ""}
              {activeCountry ? ` · ${activeCountry}` : ""}
            </p>

            {shown.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  icon="🔍"
                  title="Nothing matches that filter"
                  body="Try a different cause, or clear the filters to see everything."
                />
              </div>
            ) : null}

            {featured.length > 0 ? (
              <section className="mt-8">
                <h2 className="font-display text-2xl text-ink">Start here</h2>
                <p className="mt-1 text-ink-2">
                  Well-known organizations that cover the most common missions.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {featured.map((org) => (
                    <OrgCard key={org.id} org={org} />
                  ))}
                </div>
              </section>
            ) : null}

            {sections.map((section) => (
              <section key={section.value} className="mt-12">
                <h2 className="font-display text-2xl text-ink">
                  <span aria-hidden>{categoryIcon(section.value)}</span>{" "}
                  {categoryLabel(section.value)}
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.orgs.map((org) => (
                    <OrgCard key={org.id} org={org} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        <section className="mt-14 rounded-card border border-line p-6">
          <h2 className="font-display text-xl text-ink">How this list is built</h2>
          <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink-2">
            <li>
              <strong className="text-ink">A tick means the link was checked</strong> — a human
              opened the site and confirmed the domain genuinely belongs to that organization.
              Look-alike donation domains exist even for well-known charities. It is not a
              judgement on their programmes.
            </li>
            <li>
              <strong className="text-ink">We link, we don&apos;t partner.</strong> Being listed
              here doesn&apos;t mean an organization endorses Asar, or knows we exist.
            </li>
            <li>
              <strong className="text-ink">Asar takes nothing.</strong> No fee, no cut, no payment
              step. We count that a click happened, and nothing about what you gave.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
