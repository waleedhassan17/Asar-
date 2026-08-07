/**
 * Which clip belongs to a mission.
 *
 * Matched on the mission's own icon rather than its template category,
 * for one reason: a custom mission has no template, and custom missions
 * are the ones most in need of an identity. The icon is the only subject
 * signal that every mission carries, preset or not, and the builder's
 * picker is a fixed list — so this covers everything with a sensible
 * fallback for the rest.
 *
 * This is what makes the footage information rather than decoration: a
 * mission about meals shows a meal. Decoration on a dashboard is noise
 * behind numbers people came to read.
 */
export interface MissionClip {
  src: string;
  poster: string;
  /** Decorative — the mission title beside it carries the meaning. */
  alt: string;
}

const CLIPS = {
  feed: {
    src: "/videos/impact-feed.mp4",
    poster: "/videos/impact-feed.jpg",
    alt: "A meal passing between hands",
  },
  plant: {
    src: "/videos/impact-plant.mp4",
    poster: "/videos/impact-plant.jpg",
    alt: "Hands settling a seedling into soil",
  },
  learn: {
    src: "/videos/impact-care.mp4",
    poster: "/videos/impact-care.jpg",
    alt: "A hand pointing to a page of a notebook",
  },
  health: {
    src: "/videos/mission-health.mp4",
    poster: "/videos/mission-health.jpg",
    alt: "Two hands resting on another person's hand",
  },
  water: {
    src: "/videos/mission-water.mp4",
    poster: "/videos/mission-water.jpg",
    alt: "Water running from a tap",
  },
  general: {
    src: "/videos/mission-general.mp4",
    poster: "/videos/mission-general.jpg",
    alt: "Warm candle flames out of focus",
  },
} as const satisfies Record<string, MissionClip>;

/** Every icon the mission builder offers, plus the obvious neighbours. */
const BY_ICON: Record<string, MissionClip> = {
  "🍲": CLIPS.feed,
  "🥘": CLIPS.feed,
  "🍞": CLIPS.feed,
  "🌳": CLIPS.plant,
  "🌱": CLIPS.plant,
  "🎓": CLIPS.learn,
  "📚": CLIPS.learn,
  "🩸": CLIPS.health,
  "🏥": CLIPS.health,
  "🐾": CLIPS.health,
  "💧": CLIPS.water,
  "🧥": CLIPS.general,
  "🏠": CLIPS.general,
  "🎁": CLIPS.general,
  "✨": CLIPS.general,
};

/** Category names as they appear on mission_templates, for preset missions. */
const BY_CATEGORY: Record<string, MissionClip> = {
  food: CLIPS.feed,
  environment: CLIPS.plant,
  education: CLIPS.learn,
  health: CLIPS.health,
  water: CLIPS.water,
  general: CLIPS.general,
};

export function clipForMission(icon: string, category?: string | null): MissionClip {
  return BY_ICON[icon] ?? (category ? BY_CATEGORY[category] : undefined) ?? CLIPS.general;
}
