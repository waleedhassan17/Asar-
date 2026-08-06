"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { cx } from "@/components/ui";

export interface Slide {
  src: string;
  /** Decorative here — the caption carries the meaning, so alt stays empty. */
  alt: string;
  /** One line of copy that crossfades in with its photograph. */
  caption: string;
}

const INTERVAL = 7000;

/**
 * A slow crossfade through several photographs, each with its own line of
 * copy. Used as the companion panel on the auth pages.
 *
 * Three things make this safe to put behind text:
 *  - only one image is ever `priority`; the rest load lazily, so the extra
 *    photos cost nothing on first paint;
 *  - a scrim sits between every photo and the type, so contrast does not
 *    depend on which frame happens to be showing;
 *  - `prefers-reduced-motion` stops the rotation entirely rather than just
 *    shortening it. Motion in the corner of the eye while someone is
 *    typing a password is a distraction, not decoration.
 */
export function PhotoSlideshow({ slides, className }: { slides: Slide[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const captionId = useId();

  useEffect(() => {
    if (slides.length < 2) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <div className={cx("relative isolate overflow-hidden", className)}>
      {slides.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt=""
          aria-hidden
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority={i === 0}
          className={cx(
            "object-cover transition-opacity duration-[1600ms] ease-in-out motion-reduce:transition-none",
            i === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {/* Text never sits on a raw photo. */}
      <div aria-hidden className="absolute inset-0 scrim-hero" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-ink-900/75 via-ink-900/15 to-transparent"
      />
      <div aria-hidden className="film-grain absolute inset-0" />

      <div className="relative flex h-full flex-col justify-end p-6 sm:p-8 lg:p-10">
        <p
          id={captionId}
          aria-live="off"
          className="max-w-sm font-display text-lg leading-snug text-balance text-white drop-shadow-sm sm:text-xl lg:text-[1.75rem]"
        >
          {slides[index].caption}
        </p>

        {slides.length > 1 ? (
          <div className="mt-4 flex items-center gap-2 lg:mt-6">
            {slides.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={slide.alt}
                aria-current={i === index}
                className={cx(
                  "h-1.5 rounded-pill transition-all duration-500",
                  i === index ? "w-7 bg-white" : "w-3 bg-white/45 hover:bg-white/70",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
