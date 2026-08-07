import { LinkButton } from "@/components/ui";
import { joinUs } from "@/lib/copy";

/**
 * "Be part of Asar" — an invitation, not a job listing.
 *
 * There is deliberately no form here and nothing is stored: a single
 * mailto link is the whole mechanism. A contact form would imply an inbox
 * someone is staffed to watch, and a database table for it would be
 * infrastructure pretending to be a team.
 *
 * The address lives in `FOUNDER_EMAIL` in lib/copy.ts and is the only
 * line that needs changing.
 */
export function JoinBand({ className }: { className?: string }) {
  return (
    <section className={className}>
      <div className="rounded-card border border-line bg-surface-2 px-6 py-10 text-center sm:px-10 sm:py-12">
        <p className="text-sm font-semibold tracking-wide text-primary-600 uppercase">
          {joinUs.eyebrow}
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl leading-tight text-balance text-ink">
          {joinUs.headline}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-ink-2">{joinUs.body}</p>

        <LinkButton href={joinUs.cta.href} size="lg" className="mt-7">
          {joinUs.cta.label}
        </LinkButton>

        <p className="mt-4 text-sm text-ink-3">{joinUs.micro}</p>
      </div>
    </section>
  );
}
