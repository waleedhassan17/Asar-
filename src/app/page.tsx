import Link from "next/link";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Badge, Card, LinkButton } from "@/components/ui";
import { PhotoBackground } from "@/components/brand/photo-background";
import { GlassCard } from "@/components/brand/glass-card";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { HadithBand } from "@/components/brand/hadith-band";
import { ImpactReel } from "@/components/marketing/impact-reel";
import { PurposeBand } from "@/components/marketing/purpose-band";
import { backgroundByMood } from "@/lib/backgrounds";
import { heroCopy } from "@/lib/copy";
import type { MissionTemplate } from "@/lib/types";

export const dynamic = "force-dynamic";

const TRACKS = [
  {
    icon: "🤝",
    accent: "ember",
    title: "Pledge an action",
    body: "“I'll fund 5 meals.” Commit now, tick it off when it's done. No money passes through Asar.",
  },
  {
    icon: "⏳",
    accent: "sage",
    title: "Give time, not money",
    body: "Donate blood. Volunteer two hours. Teach someone something. It counts exactly as much.",
  },
  {
    icon: "💌",
    accent: "rose",
    title: "Or just leave a wish",
    body: "Can't do either? Say something kind. That's a first-class option here, not a consolation prize.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Pick a purpose",
    body: "Feed people, plant trees, sponsor a student, find blood donors — or write your own goal in your own units.",
  },
  {
    n: "02",
    title: "Share one link",
    body: "Your mission page counts down to your birthday. Friends pledge from their phones in about fifteen seconds.",
  },
  {
    n: "03",
    title: "Open it on the day",
    body: "“Because of you…” — the numbers, the photos, the messages, all in one reveal you can share back.",
  },
];

async function loadTemplates(): Promise<MissionTemplate[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("mission_templates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    return (data as MissionTemplate[] | null) ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  // Independent reads; no reason to wait for one before the other.
  const [templates, profile] = await Promise.all([loadTemplates(), getCurrentProfile()]);
  const hero = backgroundByMood("celebration");

  // A signed-in visitor is welcome to read and share the landing page —
  // they are deliberately not redirected away from it. But sending them
  // to /register would be a dead end, because middleware bounces them
  // straight back to /dashboard.
  const primaryCta = profile
    ? { label: "Go to dashboard", href: "/dashboard" }
    : heroCopy.primaryCta;

  return (
    <>
      <SiteHeader />

      <main>
        {/* ---------------------------------------------------------- */}
        {/* Hero                                                        */}
        {/* ---------------------------------------------------------- */}
        <PhotoBackground src={hero.src} alt={hero.alt} eager className="min-h-[32rem]">
          <div className="mx-auto flex w-full max-w-4xl items-center px-5 pb-20 pt-20 sm:pt-28">
            <GlassCard className="w-full text-center sm:p-10">
              <Badge tone="gold" className="mx-auto">
                {heroCopy.eyebrow}
              </Badge>

              <h1 className="mt-6 font-display text-[2.4rem] leading-[1.08] text-ink sm:text-[3.4rem]">
                {heroCopy.headline.lead}
                <br />
                <span className="text-primary-600">{heroCopy.headline.accent}</span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">
                {heroCopy.sub}
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <LinkButton href={primaryCta.href} size="lg">
                  {primaryCta.label}
                </LinkButton>
                <LinkButton href={heroCopy.secondaryCta.href} size="lg" variant="outline">
                  {heroCopy.secondaryCta.label}
                </LinkButton>
              </div>

              <p className="mt-5 text-sm text-ink-3">{heroCopy.micro}</p>
            </GlassCard>
          </div>
        </PhotoBackground>

        <HadithBand />

        {/* Directly after the hadith on purpose: that band is about
            beneficial knowledge, and this is what Asar wants to do with
            it. Links out rather than repeating the whole story here. */}
        <PurposeBand className="border-b border-line bg-surface-2" />

        {/* ---------------------------------------------------------- */}
        {/* Reframing (spec §11)                                        */}
        {/* ---------------------------------------------------------- */}
        <section className="mx-auto w-full max-w-5xl px-5 py-10">
          <Card className="overflow-hidden p-0">
            <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="p-7">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                  The usual birthday
                </p>
                <ul className="mt-4 space-y-3 text-ink-2">
                  <li>“Wish me a happy birthday”</li>
                  <li>“Please donate”</li>
                  <li>“Thanks for all the wishes”</li>
                  <li>A folder of messages nobody opens again</li>
                </ul>
              </div>
              <div className="bg-surface-2 p-7">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
                  A birthday on Asar
                </p>
                <ul className="mt-4 space-y-3 font-medium text-ink">
                  <li>“Join my purpose”</li>
                  <li>“Pledge an action — money, time, or voice”</li>
                  <li>“Because of you, we fed 120 people ❤️”</li>
                  <li>A reveal you actually want to share</li>
                </ul>
              </div>
            </div>
          </Card>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Three tracks                                                */}
        {/* ---------------------------------------------------------- */}
        <section className="mx-auto w-full max-w-5xl px-5 py-12">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl text-ink">Three ways in. All of them equal.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-ink-2">
              Nobody should feel cornered into giving money at a friend&apos;s birthday. So on every
              mission page these three sit side by side, the same size, in the same order.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {TRACKS.map((track) => (
              <Card key={track.title} data-accent={track.accent} className="p-6">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent-wash text-xl">
                  {track.icon}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink">{track.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{track.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Presets (M-01)                                              */}
        {/* ---------------------------------------------------------- */}
        {templates.length > 0 ? (
          <section className="mx-auto w-full max-w-5xl px-5 py-12">
            <div className="mb-8 text-center">
              <h2 className="font-display text-3xl text-ink">Start from a mission</h2>
              <p className="mt-3 text-ink-2">Or write your own goal, in your own units.</p>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-ink-3">
                These echo the deeds the Sunnah describes as ongoing — planting a tree, giving
                water, sharing knowledge, feeding someone.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {templates.map((t) => (
                <Link key={t.id} href={`/create?template=${t.slug}`} className="group">
                  <Card
                    data-accent={t.accent}
                    className="h-full p-6 transition group-hover:-translate-y-0.5 group-hover:shadow-lift"
                  >
                    <span className="text-3xl">{t.icon}</span>
                    <h3 className="mt-4 font-semibold text-ink">{t.title}</h3>
                    {t.blurb ? <p className="mt-2 text-sm text-ink-2">{t.blurb}</p> : null}
                    <p className="mt-4 text-sm font-medium text-accent">
                      {t.default_goal} {t.unit_plural} →
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* How it works                                                */}
        {/* ---------------------------------------------------------- */}
        <section className="mx-auto w-full max-w-5xl px-5 py-12">
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="rounded-card border border-line p-6">
                <span className="nums font-display text-3xl text-ink-3">{step.n}</span>
                <h3 className="mt-3 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Impact in motion                                            */}
        {/*                                                             */}
        {/* Sits immediately before the honesty card on purpose: the    */}
        {/* footage is the most persuasive thing on the page, so what   */}
        {/* Asar does not do should be the very next thing read.        */}
        {/* ---------------------------------------------------------- */}
        <ImpactReel />

        {/* ---------------------------------------------------------- */}
        {/* Honesty (T-04)                                              */}
        {/* ---------------------------------------------------------- */}
        <section className="mx-auto w-full max-w-3xl px-5 py-12">
          <Card className="p-8">
            <h2 className="font-display text-2xl text-ink">What Asar does not do</h2>
            <ul className="mt-5 space-y-4 text-ink-2">
              <li className="flex gap-3">
                <span aria-hidden>•</span>
                <span>
                  <strong className="text-ink">We never touch your money.</strong> There is no
                  payment gateway. If a mission links somewhere you can give, you go there directly
                  and the money never passes through us.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden>•</span>
                <span>
                  <strong className="text-ink">We don&apos;t claim things are verified.</strong>{" "}
                  Pledges are self-reported and labelled that way. Photos and friends&apos;
                  confirmations add confidence, never a certificate.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden>•</span>
                <span>
                  <strong className="text-ink">We never show who didn&apos;t give.</strong> Silence
                  is a perfectly good answer, and no one will know you saw the link.
                </span>
              </li>
            </ul>
            <p className="mt-6 text-sm text-ink-3">
              Every number the platform reports is public on the{" "}
              <Link href="/transparency" className="font-medium text-primary-600 underline">
                transparency log
              </Link>
              , including how much of it carries proof.
            </p>
          </Card>
        </section>

        <section className="mx-auto w-full max-w-3xl px-5 pb-20 pt-4 text-center">
          <h2 className="font-display text-3xl text-ink">When is your birthday?</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-2">
            Even a mission started the night before works — Asar switches to a 24-hour sprint.
          </p>
          <LinkButton href={primaryCta.href} size="lg" className="mt-7">
            {primaryCta.label}
          </LinkButton>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
