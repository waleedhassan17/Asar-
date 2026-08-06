import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Badge, Card, LinkButton, Progress } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getPublicSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Transparency log",
  description:
    "Every number Asar reports about itself, including how much of the self-reported impact carries proof.",
};
export const dynamic = "force-dynamic";

interface Transparency {
  missions_total: number;
  missions_active: number;
  contributions_total: number;
  contributions_confirmed: number;
  contributions_with_proof: number;
  contributions_endorsed: number;
  wishes_only: number;
  flags_open: number;
  flags_actioned: number;
  links_approved: number;
  links_rejected: number;
  proof_attached_percent: number;
}

export default async function TransparencyPage() {
  const { transparencyNote } = await getPublicSettings();

  let stats: Transparency | null = null;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.from("platform_transparency").select("*").single();
      stats = (data as Transparency | null) ?? null;
    } catch {
      stats = null;
    }
  }

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-5 py-12">
        <Badge tone="primary">A-M05 · updated live</Badge>
        <h1 className="mt-4 font-display text-4xl text-ink">Transparency log</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-2">{transparencyNote}</p>

        <Card className="mt-8 p-7">
          <h2 className="font-display text-2xl text-ink">What “self-reported” means here</h2>
          <div className="mt-5 space-y-4 text-ink-2">
            <p>
              Nobody on Asar has to prove anything. Someone says they funded five meals, and that
              becomes five meals in the tally. That is the honest description of what this platform
              currently knows.
            </p>
            <p>
              Two things can raise confidence, and neither is a verification. A contributor can
              attach a photo, which gets the entry a{" "}
              <strong className="text-ink">Proof attached</strong> tag. Or friends who saw it
              happen can confirm it, which gets an entry{" "}
              <strong className="text-ink">Friends confirmed</strong>. Everything else stays
              labelled <strong className="text-ink">Self-reported</strong>, permanently and
              visibly.
            </p>
            <p>
              No money moves through Asar. There is no payment gateway. Where a mission links
              somewhere you can give, you go straight there and we only count that the click
              happened.
            </p>
          </div>
        </Card>

        {stats ? (
          <>
            <Card className="mt-6 p-7">
              <h2 className="font-display text-2xl text-ink">How much carries proof</h2>
              <p className="nums mt-4 font-display text-5xl text-primary-600">
                {stats.proof_attached_percent}%
              </p>
              <p className="mt-2 text-ink-2">
                of all {stats.contributions_total} entries have a photo attached.
              </p>
              <Progress
                percent={stats.proof_attached_percent}
                className="mt-5"
                label="Share of contributions with proof attached"
              />
              <p className="mt-4 text-sm text-ink-3">
                We publish this whether it looks good or not. A low number isn&apos;t a failure —
                it&apos;s what an honour-system platform actually looks like before partner
                verification exists.
              </p>
            </Card>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["Missions created", stats.missions_total],
                  ["Missions running now", stats.missions_active],
                  ["Contributions recorded", stats.contributions_total],
                  ["Marked as done", stats.contributions_confirmed],
                  ["With a photo attached", stats.contributions_with_proof],
                  ["Confirmed by a friend", stats.contributions_endorsed],
                  ["Wish-only messages", stats.wishes_only],
                  ["Give-links approved", stats.links_approved],
                  ["Give-links rejected", stats.links_rejected],
                  ["Reports acted on", stats.flags_actioned],
                ] as [string, number][]
              ).map(([label, value]) => (
                <Card key={label} className="p-5">
                  <p className="nums font-display text-3xl text-ink">{value}</p>
                  <p className="mt-1 text-sm text-ink-2">{label}</p>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card className="mt-6 p-7">
            <p className="text-ink-2">
              Live numbers appear here once the platform is connected to its database.
            </p>
          </Card>
        )}

        <Card className="mt-6 p-7">
          <h2 className="font-display text-2xl text-ink">What&apos;s coming</h2>
          <ol className="mt-5 space-y-4 text-ink-2">
            {[
              ["Now", "Pledge and self-report, external give-links, non-monetary tracks."],
              ["Next", "A pilot partner or two, which introduces a real “Verified” badge alongside “Self-reported”."],
              ["Then", "A payment gateway, so a pledge can become a transaction inside Asar."],
              ["Later", "Automated proof from partner organisations — receipts and delivery confirmations instead of manual review."],
            ].map(([when, what]) => (
              <li key={when} className="flex gap-4">
                <span className="w-14 shrink-0 text-sm font-semibold uppercase tracking-wide text-ink-3">
                  {when}
                </span>
                <span>{what}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-ink-3">
            Nothing above changes how a mission works today — every one of these is additive.
          </p>
        </Card>

        <div className="mt-10 text-center">
          <p className="text-ink-2">Spotted something that looks wrong on a mission?</p>
          <p className="mt-1 text-sm text-ink-3">
            Every entry on every wish wall has a report button. Reports go to platform admins, not
            to the birthday person.
          </p>
          <LinkButton href="/" className="mt-6" variant="outline">
            Back to Asar
          </LinkButton>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
