import { impactReelCopy as copy } from "@/lib/copy";
import { ReelVideo } from "./reel-video";

/**
 * "Impact in motion" — a lead clip with a headline over it, then the
 * three kinds of action a mission can be made of.
 *
 * A Server Component; only the `<video>` elements are client leaves, and
 * only because playback has to be driven by JS (see reel-video.tsx).
 *
 * The honesty rule this section lives under: the footage is licensed
 * stock and none of it was shot for a mission, so every caption is
 * written in the conditional and the footnote says plainly that this is
 * not a record of anything Asar did. Copy lives in lib/copy.ts.
 */
export function ImpactReel() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-12">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold tracking-wide text-primary-600 uppercase">
          {copy.eyebrow}
        </p>
        <h2 className="mt-2 font-display text-3xl text-ink">{copy.headline}</h2>
        <p className="mt-3 leading-relaxed text-ink-2">{copy.sub}</p>
      </div>

      {/* Lead clip. The chosen frame keeps its subject to the right, so
          the headline sits on the quiet side of the image. */}
      <div className="relative isolate mt-8 aspect-[16/9] overflow-hidden rounded-card sm:aspect-[21/9]">
        <ReelVideo src={copy.hero.src} poster={copy.hero.poster} />
        <div aria-hidden className="absolute inset-0 scrim-hero" />
        <div aria-hidden className="film-grain absolute inset-0" />
        <div className="absolute inset-0 flex items-end p-6 sm:p-9">
          <p className="max-w-md font-display text-2xl leading-snug text-balance text-white drop-shadow-sm sm:text-3xl">
            {copy.hero.overlay}
          </p>
        </div>
      </div>

      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {copy.clips.map((clip) => (
          <li key={clip.src} className="overflow-hidden rounded-card border border-line bg-surface">
            <div className="relative aspect-[4/3] overflow-hidden">
              <ReelVideo src={clip.src} poster={clip.poster} />
            </div>
            <div className="p-5">
              <h3 className="font-display text-lg text-ink">{clip.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{clip.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 max-w-2xl text-xs leading-relaxed text-ink-3">{copy.footnote}</p>
    </section>
  );
}
