import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SetupNotice } from "@/components/site/setup-notice";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { plural, tidyNumber } from "@/lib/format";
import type { RevealPayload } from "@/lib/types";
import { RevealLocked, RevealView } from "./reveal-view";

export const dynamic = "force-dynamic";

async function loadReveal(slug: string, token: string | null): Promise<RevealPayload | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_reveal", {
    p_slug: slug,
    p_token: token,
  });
  if (error || !data) return null;
  return data as RevealPayload;
}

export async function generateMetadata(props: PageProps<"/r/[slug]">): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "Reveal" };

  const { slug } = await props.params;
  const { t } = await props.searchParams;
  const reveal = await loadReveal(slug, typeof t === "string" ? t : null);

  if (!reveal) return { title: "Reveal" };

  const name = reveal.owner?.display_name ?? "A friend";

  // Before the day, the numbers stay out of the link preview too — a
  // WhatsApp unfurl would otherwise spoil the whole thing.
  if (!reveal.is_unlocked) {
    return {
      title: `${name}'s birthday mission`,
      description: "The reveal unlocks on the birthday.",
      robots: { index: false },
    };
  }

  const description = `${tidyNumber(reveal.headline.unit_value)} ${reveal.headline.unit}, from ${reveal.headline.people} ${plural(reveal.headline.people, "person", "people")}.`;

  return {
    title: `Because of you — ${name}'s birthday`,
    description,
    openGraph: {
      title: `Because of you — ${name}'s birthday`,
      description,
      type: "article",
    },
  };
}

export default async function RevealPage(props: PageProps<"/r/[slug]">) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { slug } = await props.params;
  const { t, preview } = await props.searchParams;
  const token = typeof t === "string" ? t : null;

  const reveal = await loadReveal(slug, token);
  if (!reveal) notFound();

  const url = `${siteUrl()}/r/${slug}${token ? `?t=${token}` : ""}`;
  const showPlayer = reveal.is_unlocked && (reveal.mission.reveal_at <= new Date().toISOString() || preview === "1");

  return (
    <>
      <SiteHeader />
      {showPlayer ? (
        <RevealView reveal={reveal} url={url} />
      ) : (
        <RevealLocked
          reveal={reveal}
          isOwner={reveal.is_owner}
          previewHref={`/r/${slug}?${token ? `t=${token}&` : ""}preview=1`}
        />
      )}
      <SiteFooter />
    </>
  );
}
