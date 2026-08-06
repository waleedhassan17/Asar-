import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, LinkButton } from "@/components/ui";
import { SetupNotice } from "@/components/site/setup-notice";
import { PhotoBackground } from "@/components/brand/photo-background";
import { GlassCard } from "@/components/brand/glass-card";
import { OrgMark, VerificationLine } from "@/components/directory/org-card";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { backgroundFor } from "@/lib/backgrounds";
import {
  ORG_COLUMNS,
  categoryIcon,
  categoryLabel,
  causeLabel,
  domainOf,
  goHref,
} from "@/lib/directory";
import { DIRECTORY_BANNER } from "@/lib/copy";
import type { Organization } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadOrg(slug: string): Promise<Organization | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("organizations").select(ORG_COLUMNS).eq("slug", slug).maybeSingle();
  return (data as Organization | null) ?? null;
}

export async function generateMetadata(props: PageProps<"/give/[slug]">): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "Where to give" };

  const { slug } = await props.params;
  const org = await loadOrg(slug);
  if (!org) return { title: "Organization" };

  const description =
    org.description ?? org.tagline ?? `Donate to ${org.name} on their own official website.`;

  return {
    title: org.name,
    description,
    openGraph: {
      title: `${org.name} · Asar`,
      description,
      type: "website",
      images: org.cover_url ? [{ url: org.cover_url }] : undefined,
    },
  };
}

export default async function OrgDetailPage(props: PageProps<"/give/[slug]">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { slug } = await props.params;
  const org = await loadOrg(slug);
  if (!org) notFound();

  const cover = org.cover_url ?? backgroundFor(org.slug).src;

  return (
    <>
      <PhotoBackground src={cover} alt="" eager className="min-h-[20rem]">
        <div className="mx-auto flex w-full max-w-3xl items-center px-5 pb-12 pt-14 sm:pt-20">
          <GlassCard className="w-full sm:p-9">
            <div className="flex items-start gap-4">
              <OrgMark org={org} size={56} />
              <div className="min-w-0">
                <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
                  {org.name}
                </h1>
                {org.tagline ? <p className="mt-2 text-lg text-ink-2">{org.tagline}</p> : null}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">
                {categoryIcon(org.category)} {categoryLabel(org.category)}
              </Badge>
              <Badge tone="neutral">{org.country}</Badge>
              {org.causes.map((cause) => (
                <Badge key={cause} tone="primary">
                  {causeLabel(cause)}
                </Badge>
              ))}
            </div>
          </GlassCard>
        </div>
      </PhotoBackground>

      <article className="mx-auto w-full max-w-3xl px-5 py-10">
        {org.description ? (
          <p className="whitespace-pre-line text-lg leading-relaxed text-ink-2">
            {org.description}
          </p>
        ) : null}

        {/* --------------------------------------------------------- */}
        {/* The donate CTA — an outbound link, nothing else             */}
        {/* --------------------------------------------------------- */}
        <Card className="mt-8 p-6 text-center">
          <VerificationLine org={org} />

          <LinkButton
            href={goHref(org.slug)}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            className="mt-4 w-full sm:w-auto"
          >
            Donate on {org.name}&apos;s official website ↗
          </LinkButton>

          <p className="mt-3 text-sm text-ink-2">
            Opens <span className="font-medium text-ink">{domainOf(org.donate_url)}</span> in a new
            tab. You pay {org.name} directly — {DIRECTORY_BANNER.toLowerCase()}
          </p>

          {org.website_url ? (
            <p className="mt-2 text-xs text-ink-3">
              Main site:{" "}
              <a
                href={org.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {domainOf(org.website_url)}
              </a>
            </p>
          ) : null}
        </Card>

        {org.trust_note ? (
          <div className="mt-4 flex items-start gap-3 rounded-card border border-gold-300 bg-gold-100 p-5">
            <span aria-hidden>⚠️</span>
            <p className="text-sm leading-relaxed text-ink-2">{org.trust_note}</p>
          </div>
        ) : null}

        <div className="mt-8 rounded-card border border-line p-5 text-sm leading-relaxed text-ink-2">
          <p>
            <strong className="text-ink">Asar is not in the money path.</strong> We list this
            organization and link to it; we don&apos;t collect, hold, process or route donations,
            and we take no fee. Listing here is not a partnership, an endorsement by them, or a
            guarantee about how funds are used — please make your own judgement, as you would with
            any giving.
          </p>
          <p className="mt-3">
            <Link href="/give" className="font-medium text-primary-600 underline">
              ← Back to all organizations
            </Link>
          </p>
        </div>
      </article>
    </>
  );
}
