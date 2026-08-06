import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui";
import { PhotoBackground } from "@/components/brand/photo-background";
import { GlassCard } from "@/components/brand/glass-card";
import { Logo } from "@/components/brand/logo";
import { backgroundByMood } from "@/lib/backgrounds";
import { aboutStory } from "@/lib/copy";

export const metadata: Metadata = {
  title: "Our story",
  description:
    "Why Asar exists, what it is today, and exactly how it handles money — which is to say: it doesn't.",
  openGraph: {
    title: "Our story · Asar",
    description: aboutStory.lede,
    type: "article",
  },
};

export default function AboutPage() {
  const hero = backgroundByMood("giving");

  return (
    <>
      {/* -------------------------------------------------------------- */}
      {/* Editorial hero — photo, scrim, one glass card                    */}
      {/* -------------------------------------------------------------- */}
      <PhotoBackground src={hero.src} alt={hero.alt} eager className="min-h-[26rem]">
        <div className="mx-auto flex w-full max-w-3xl items-center px-5 pb-16 pt-16 sm:pt-24">
          <GlassCard className="w-full sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
              {aboutStory.eyebrow}
            </p>
            <h1 className="mt-4 font-display text-[2.2rem] leading-tight text-ink sm:text-5xl">
              {aboutStory.headline}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-2">{aboutStory.lede}</p>
          </GlassCard>
        </div>
      </PhotoBackground>

      {/* -------------------------------------------------------------- */}
      {/* Reading column — first person, no corporate register            */}
      {/* -------------------------------------------------------------- */}
      <article className="mx-auto w-full max-w-[640px] px-5 py-14">
        {/* FOUNDER: edit this paragraph — see aboutStory.origin in
            src/lib/copy.ts. It should sound like you, not like a company. */}
        <section className="space-y-5 text-lg leading-relaxed text-ink-2">
          {aboutStory.origin.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </section>

        <h2 className="mt-12 font-display text-2xl text-ink">What Asar is today</h2>
        <section className="mt-4 space-y-5 leading-relaxed text-ink-2">
          {aboutStory.today.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </section>

        <aside className="mt-8 rounded-card border border-primary-100 bg-primary-100/50 p-6">
          <p className="font-semibold text-ink">Where the money goes — and doesn&apos;t</p>
          <p className="mt-2 leading-relaxed text-ink-2">
            There is no payment gateway anywhere in Asar. If you decide to give, you leave for the
            organization&apos;s own official website and pay them there. We never see the amount,
            never hold it, and never take a cut.{" "}
            <Link href="/give" className="font-medium text-primary-600 underline">
              Browse the directory
            </Link>{" "}
            to see exactly how that works.
          </p>
        </aside>

        <h2 className="mt-12 font-display text-2xl text-ink">What I hope it becomes</h2>
        <section className="mt-4 space-y-5 leading-relaxed text-ink-2">
          {aboutStory.tomorrow.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </section>

        {/* Signature block — a portrait can drop in here later. */}
        <div className="mt-10 flex items-center gap-4 border-t border-line pt-6">
          <Logo variant="tile" size={48} className="rounded-full" />
          <div>
            <p className="font-display text-lg text-ink">{aboutStory.signature.name}</p>
            <p className="text-sm text-ink-3">{aboutStory.signature.role}</p>
          </div>
        </div>
      </article>

      {/* -------------------------------------------------------------- */}
      {/* Closing CTA                                                     */}
      {/* -------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-3xl px-5 pb-20 text-center">
        <h2 className="font-display text-3xl text-ink">Your next birthday is a good excuse.</h2>
        <LinkButton href={aboutStory.cta.href} size="lg" className="mt-6">
          {aboutStory.cta.label}
        </LinkButton>
        <p className="mt-4 text-sm text-ink-3">{aboutStory.cta.note}</p>
      </section>
    </>
  );
}
