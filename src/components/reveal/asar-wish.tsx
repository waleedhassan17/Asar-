import { Logo } from "@/components/brand/logo";
import { asarBirthdayWish as wish } from "@/lib/copy";

/**
 * Asar's own birthday message, shown on the reveal.
 *
 * Deliberately not mixed into the wish wall. That wall is what this
 * person's friends said to them, and a message from the platform sitting
 * among those would be advertising wearing a friend's voice.
 *
 * It also does not congratulate Asar. The friends did the good; the
 * platform counted it, and the copy says so in as many words.
 */
export function AsarWish({ name }: { name: string }) {
  const greeting = wish.greeting.replace("{name}", name);

  return (
    <section
      aria-label="A note from Asar"
      className="relative overflow-hidden rounded-card border border-gold-300 bg-surface p-7 sm:p-9"
    >
      {/* Gold is the celebration colour in this palette and this is the one
          moment it exists for — kept to a hairline and a wash, never a fill. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 h-56 w-56 rounded-full bg-gold-100 blur-3xl"
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <Logo variant="tile" size={36} />
          <p className="text-xs font-semibold tracking-wide text-gold-700 uppercase">
            {wish.eyebrow}
          </p>
        </div>

        <h2 className="mt-5 font-display text-3xl leading-tight text-balance text-ink sm:text-4xl">
          {greeting}
        </h2>

        <div className="mt-5 space-y-4 leading-relaxed text-ink-2">
          {wish.body.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>

        <p className="mt-6 font-display text-lg leading-relaxed text-balance text-ink italic">
          {wish.closing}
        </p>

        <p className="mt-5 text-sm text-ink-3">{wish.signature}</p>
      </div>
    </section>
  );
}
