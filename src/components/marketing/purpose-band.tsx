import Link from "next/link";
import { purposeStory } from "@/lib/copy";

/**
 * The short purpose band for the landing page, linking through to the
 * full section on About.
 *
 * The third sentence — "We're not there yet" — is not optional trimming.
 * The two before it describe an intention, and without the correction
 * they read as a description of something Asar already does.
 */
export function PurposeBand({ className }: { className?: string }) {
  const { band } = purposeStory;

  return (
    <section className={className}>
      <div className="mx-auto w-full max-w-5xl px-5 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-wide text-primary-600 uppercase">
            {band.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-balance text-ink sm:text-4xl">
            {band.headline}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">{band.body}</p>
          <Link
            href={band.cta.href}
            className="mt-6 inline-flex items-center gap-1.5 font-semibold text-primary-600 underline-offset-4 transition hover:text-primary-500 hover:underline"
          >
            {band.cta.label} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
