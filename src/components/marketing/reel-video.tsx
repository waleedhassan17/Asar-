"use client";

import { useEffect, useRef } from "react";
import { cx } from "@/components/ui";

/**
 * A silent looping clip that only plays while it is on screen.
 *
 * There is deliberately **no `autoPlay` attribute**. Playback is started
 * from JS or not at all, which is the only way to honour
 * `prefers-reduced-motion` here: the global CSS block in globals.css can
 * stop animations and transitions, but it has no power over a playing
 * `<video>`. Someone who asked the operating system for less movement
 * gets the poster frame, permanently, and the poster is chosen from
 * inside the clip so it looks like a held frame rather than an error.
 *
 * The IntersectionObserver is the other half: four autoplaying loops on
 * one page is four decoders running for footage nobody is looking at.
 */
export function ReelVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Autoplay can still be refused (low power mode, data saver).
          // That is a fine outcome — the poster is already showing.
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      // Decorative: the caption beside it carries the meaning, and the
      // clips have no audio track to describe.
      aria-hidden
      tabIndex={-1}
      className={cx("h-full w-full object-cover", className)}
    />
  );
}
