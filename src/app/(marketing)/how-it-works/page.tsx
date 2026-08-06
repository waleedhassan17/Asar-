import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, LinkButton } from "@/components/ui";
import { PhotoBackground } from "@/components/brand/photo-background";
import { GlassCard } from "@/components/brand/glass-card";
import { backgroundByMood } from "@/lib/backgrounds";
import { MONEY_DISCLAIMER } from "@/lib/copy";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Pick a purpose, share one link, and open the reveal on your birthday. Friends pledge money, time or just a wish — and Asar never handles the money.",
  openGraph: {
    title: "How Asar works",
    description: "Pick a purpose, share one link, open the reveal on the day.",
    type: "website",
  },
};

const STEPS = [
  {
    n: "01",
    title: "Pick a purpose",
    body: "Feed people, plant trees, sponsor a student, find blood donors — or write your own goal in your own units. It takes about two minutes.",
  },
  {
    n: "02",
    title: "Share one link",
    body: "Your mission page counts down to your birthday. Friends pledge from their phones in about fifteen seconds, and they never need an account.",
  },
  {
    n: "03",
    title: "Open it on the day",
    body: "“Because of you…” — the numbers, the photos and the messages, in one reveal you can share back to everyone who joined in.",
  },
];

const TRACKS = [
  {
    icon: "🤝",
    accent: "ember",
    title: "Pledge an action",
    body: "“I'll fund 5 meals.” Commit now, tick it off when it's done. If you choose to give money, you do it on the organisation's own website — never here.",
  },
  {
    icon: "⏳",
    accent: "sage",
    title: "Give time, not money",
    body: "Donate blood. Volunteer two hours. Teach someone something. It counts exactly as much on the tally, and it's shown the same size.",
  },
  {
    icon: "💌",
    accent: "rose",
    title: "Or just leave a wish",
    body: "Can't do either? Say something kind. That's a first-class option here, not a consolation prize, and nobody is ever shown who didn't give.",
  },
];

export default function HowItWorksPage() {
  const hero = backgroundByMood("learning");

  return (
    <>
      <PhotoBackground src={hero.src} alt={hero.alt} eager className="min-h-[22rem]">
        <div className="mx-auto flex w-full max-w-3xl items-center px-5 pb-14 pt-14 sm:pt-20">
          <GlassCard className="w-full sm:p-10">
            <Badge tone="gold">Three steps, about two minutes</Badge>
            <h1 className="mt-5 font-display text-[2.2rem] leading-tight text-ink sm:text-5xl">
              How Asar works
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-2">
              You pick something good to aim at. Your friends pledge an act toward it instead of
              buying you a gift. On the day, you all find out what that added up to.
            </p>
          </GlassCard>
        </div>
      </PhotoBackground>

      <section className="mx-auto w-full max-w-5xl px-5 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="rounded-card border border-line p-6">
              <span className="nums font-display text-3xl text-ink-3">{step.n}</span>
              <h2 className="mt-3 text-lg font-semibold text-ink">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface-2">
        <div className="mx-auto w-full max-w-5xl px-5 py-12">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl text-ink">Three ways to join. All of them equal.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-ink-2">
              Nobody should feel cornered into giving money at a friend&apos;s birthday. On every
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

          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-ink-2">
            The mission types Asar suggests echo deeds the Sunnah describes as ongoing — planting a
            tree, giving water, sharing knowledge, feeding someone.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-12">
        <Card className="p-8">
          <h2 className="font-display text-2xl text-ink">Where the money goes</h2>
          <p className="mt-4 leading-relaxed text-ink-2">{MONEY_DISCLAIMER}</p>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink-2">
            <li>
              <strong className="text-ink">No payment screen exists here.</strong> Every
              &ldquo;Donate&rdquo; button opens the organisation&apos;s own official site in a new
              tab. We count that a click happened and nothing about what you gave.
            </li>
            <li>
              <strong className="text-ink">Pledges are self-reported.</strong> Photos and
              friends&apos; confirmations add confidence — never a certificate. What&apos;s proven
              and what isn&apos;t is published on the{" "}
              <Link href="/transparency" className="font-medium text-primary-600 underline">
                transparency log
              </Link>
              .
            </li>
            <li>
              <strong className="text-ink">Silence is a valid answer.</strong> Asar never shows who
              didn&apos;t give, and never tells anyone you opened the link.
            </li>
          </ul>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 pb-20 text-center">
        <h2 className="font-display text-3xl text-ink">When is your birthday?</h2>
        <p className="mx-auto mt-3 max-w-lg text-ink-2">
          Even a mission started the night before works — Asar switches to a 24-hour sprint.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <LinkButton href="/create" size="lg">
            Start my mission
          </LinkButton>
          <LinkButton href="/give" size="lg" variant="outline">
            Browse causes
          </LinkButton>
        </div>
      </section>
    </>
  );
}
