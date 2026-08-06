/**
 * The curated photographic backgrounds in /public/backgrounds.
 *
 * Every image is licensed for commercial use with no attribution required
 * (see public/backgrounds/CREDITS.md for the source of each file). They
 * are deliberately soft and low-detail: a busy photo fights the type, and
 * every one of these is always covered by a scrim before text sits on it.
 *
 * Faces are avoided on purpose — hands, candles, trees and scenery keep
 * us clear of needing a model release for marketing use.
 */
export interface BackgroundPhoto {
  src: string;
  /** Describes the image for screen readers when it carries meaning. */
  alt: string;
  /** Rough mood, so a page can pick something that fits its subject. */
  mood: "celebration" | "giving" | "community" | "learning" | "food" | "growth" | "abstract";
}

export const BACKGROUNDS: BackgroundPhoto[] = [
  {
    src: "/backgrounds/hero-01.jpg",
    alt: "Candlelight and a small lantern house on a table",
    mood: "celebration",
  },
  {
    src: "/backgrounds/hero-02.jpg",
    alt: "A pair of cupped hands holding dark soil",
    mood: "giving",
  },
  {
    src: "/backgrounds/hero-03.jpg",
    alt: "Four people standing together, silhouetted against a sunset",
    mood: "community",
  },
  {
    src: "/backgrounds/hero-04.jpg",
    alt: "A stack of books and a plant on a sunlit windowsill",
    mood: "learning",
  },
  {
    src: "/backgrounds/hero-05.jpg",
    alt: "Plates of food and flatbread laid out on a table, seen from above",
    mood: "food",
  },
  {
    src: "/backgrounds/hero-06.jpg",
    alt: "A pine seedling growing on the forest floor",
    mood: "growth",
  },
];

export function backgroundByMood(mood: BackgroundPhoto["mood"]): BackgroundPhoto {
  return BACKGROUNDS.find((b) => b.mood === mood) ?? BACKGROUNDS[0];
}

/**
 * Stable per-key choice. A mission always gets the same photo (its slug is
 * the key), so the page doesn't reshuffle on every render or navigation —
 * randomness that changes under the reader is just flicker.
 */
export function backgroundFor(key: string): BackgroundPhoto {
  let sum = 0;
  for (let i = 0; i < key.length; i += 1) sum += key.charCodeAt(i);
  return BACKGROUNDS[sum % BACKGROUNDS.length];
}
