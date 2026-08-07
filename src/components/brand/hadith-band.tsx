import { hadith } from "@/lib/copy";

/**
 * The quiet band under the hero: the hadith the whole product is built
 * on, set small and calm rather than as a banner. A thin gold hairline
 * on top is the only ornament — this is the one place the palette lets
 * gold speak, and it should still whisper.
 */
export function HadithBand({ showArabic = true }: { showArabic?: boolean }) {
  return (
    <section
      className="border-y border-line bg-surface-2"
      aria-label="On ongoing charity"
    >
      {/* the gold hairline, separate so it sits above the section border */}
      <div className="h-px w-full bg-gold-300" aria-hidden />

      <div className="mx-auto w-full max-w-3xl px-5 py-12 text-center">
        {showArabic ? (
          <p
            lang="ar"
            dir="rtl"
            className="font-arabic text-2xl text-ink sm:text-3xl"
          >
            {hadith.arabic}
          </p>
        ) : null}

        <blockquote
          className={`font-display text-lg italic leading-relaxed text-ink-2 sm:text-xl ${
            showArabic ? "mt-6" : ""
          }`}
        >
          &ldquo;{hadith.english}&rdquo;
        </blockquote>

        <p className="mt-4 text-sm text-ink-3">{hadith.attribution}</p>
      </div>
    </section>
  );
}
