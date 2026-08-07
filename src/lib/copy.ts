/**
 * Editable prose that isn't worth a database round-trip.
 *
 * Kept out of the components so the words can be changed by someone who
 * doesn't want to read JSX — and so the one paragraph that must be the
 * founder's own voice is impossible to miss.
 *
 * House rules for anything written here:
 *   • Asar is an early platform, not a registered nonprofit, NGO, charity
 *     or tax-exempt body. Never write any of those words about Asar.
 *   • Asar never collects, holds, processes or routes money. Every gift
 *     happens on the receiving organisation's own official website.
 *   • Nothing is described as "verified" unless a human checked it.
 */

export const MONEY_DISCLAIMER =
  "Asar doesn't collect or hold any money. When you choose to give, you donate directly on the organization's own official website. We simply help you find trusted causes and turn a birthday into a reason to act.";

export const TRANSPARENCY_LINE =
  "We track pledges and self-reported impact, and we're growing our network of verified partners.";

export const DIRECTORY_BANNER =
  "You'll donate on each organization's own official website. Asar never handles or processes your donation.";

/* ------------------------------------------------------------------ */
/* Landing hero                                                        */
/*                                                                     */
/* Asar (أثر) means the trace, mark or impact you leave behind — which  */
/* is the idea of sadaqah jariyah: good that keeps benefiting people.   */
/* The tone is warm and sincere, never preachy, and stays open enough   */
/* that a friend of any faith still feels invited to join in.           */
/* ------------------------------------------------------------------ */
export const heroCopy = {
  eyebrow: "No payments. No pressure. Just sincere good.",
  headline: {
    lead: "This year, don't just turn a year older —",
    accent: "leave a mark that keeps giving.",
  },
  sub: "Asar (أثر) means the trace you leave behind. In the weeks before your birthday, invite friends to pledge an act of good — a meal, a planted tree, clean water, a kind word — and on the day, see the ongoing charity you built together.",
  primaryCta: { label: "Start my mission", href: "/register" },
  secondaryCta: { label: "Browse causes", href: "/give" },
  micro: "Free. Takes about two minutes. Your friends don't need an account.",
} as const;

/* ------------------------------------------------------------------ */
/* Impact reel                                                         */
/*                                                                     */
/* The footage is stock: nobody in it has heard of Asar, and none of it */
/* was filmed for a mission. So every line here is written in the       */
/* conditional — what a birthday *can* start — and never in the past    */
/* tense of something we claim to have done. "What we did" would be a   */
/* lie told with someone else's video.                                  */
/* ------------------------------------------------------------------ */
export const impactReelCopy = {
  eyebrow: "Impact in motion",
  headline: "See what a birthday can grow into.",
  sub: "Not our footage, and not our work — this is simply what the kinds of good people pledge on Asar look like when someone does them.",
  hero: {
    src: "/videos/impact-hero.mp4",
    poster: "/videos/impact-hero.jpg",
    overlay: "The kind of good your birthday can start.",
  },
  clips: [
    {
      src: "/videos/impact-plant.mp4",
      poster: "/videos/impact-plant.jpg",
      alt: "Two hands settling a seedling into dark soil",
      title: "Plant",
      body: "A tree someone puts in the ground on your birthday outlives the birthday.",
    },
    {
      src: "/videos/impact-feed.mp4",
      poster: "/videos/impact-feed.jpg",
      alt: "A meal container passing from one pair of hands to another",
      title: "Feed",
      body: "A meal is the most ordinary kind of good, and the one people feel fastest.",
    },
    {
      src: "/videos/impact-care.mp4",
      poster: "/videos/impact-care.jpg",
      alt: "A hand pointing to a page of a notebook on a desk",
      title: "Care",
      body: "An hour of someone's attention counts as much here as anything you can fund.",
    },
  ],
  footnote:
    "Stock footage, used under licence and credited in the repository. It illustrates the kinds of action people pledge — it is not a record of missions run on Asar.",
} as const;

/* ------------------------------------------------------------------ */
/* Purpose                                                             */
/*                                                                     */
/* Every sentence here is future-framed on purpose. Asar does not      */
/* sponsor a single student today and must never imply that it does —  */
/* "building toward" is the strongest claim available, and the third   */
/* paragraph says the current state plainly so the first two cannot be */
/* mistaken for a description of the present.                          */
/*                                                                     */
/* The beneficial-knowledge thread deliberately echoes the hadith band */
/* already on the site, so this reads as the idea Asar came from rather */
/* than a new promise bolted on.                                       */
/* ------------------------------------------------------------------ */
export const purposeStory = {
  eyebrow: "Our purpose",
  headline: "Knowledge is the gift that keeps giving.",
  body: [
    "Asar is about more than birthdays. The bigger hope behind it is to grow into an organization that helps people who can't afford to study — students held back not by ability, but by money. As we grow, we want to find these students, understand their situations with care, and connect them with people whose giving keeps giving.",
    "In our faith, one of the three things that keep benefiting a person after they're gone is beneficial knowledge. Helping someone learn is exactly that — a trace (أثر) that outlives us all.",
    "We're early, and honest about it: today Asar is an awareness and referral platform — we don't hold money, and we don't promise support we can't yet give. But we're building toward that future, one birthday at a time.",
  ],
  /** The short version, for the band on the landing page. */
  band: {
    eyebrow: "Our purpose",
    headline: "Knowledge is the gift that keeps giving.",
    body: "The hope behind Asar is to grow into something that helps students who are held back by money rather than ability. We're not there yet — today this is an awareness and referral platform — but that's what we're building toward.",
    cta: { label: "Read our story", href: "/about" },
  },
} as const;

/* ------------------------------------------------------------------ */
/* Join us                                                             */
/*                                                                     */
/* An invitation from an early project, not a job listing from a       */
/* staffed company. There is no form and no database behind it — one   */
/* mailto link is the entire mechanism, which is honest about the size */
/* of the thing.                                                       */
/* ------------------------------------------------------------------ */

/** FOUNDER: replace with your real address. This one line is the whole
 *  contact mechanism — nothing else needs changing. */
export const FOUNDER_EMAIL = "REPLACE_WITH_FOUNDER_EMAIL@example.com";

export const joinUs = {
  eyebrow: "Be part of Asar",
  headline: "We're looking for people who want to help build this.",
  body: "Asar is just getting started, and it can't grow alone. We're looking for people who want to be part of it — spreading the word, helping check that the causes we list are trustworthy, mentoring students, or helping shape the sponsorship program we're working toward. If that sounds like you, we'd love to hear from you.",
  cta: {
    label: "Get in touch",
    href: `mailto:${FOUNDER_EMAIL}?subject=${encodeURIComponent("I'd like to help build Asar")}`,
  },
  micro: "No commitment — just a conversation.",
} as const;

/** Swap either of these into `heroCopy` wholesale to change the framing. */
export const heroAlternates = {
  sadaqahJariyah: {
    eyebrow: "No payments. No pressure. Just sincere good.",
    headline: {
      lead: "Turn your birthday into",
      accent: "sadaqah jariyah.",
    },
    sub: "Ongoing charity that keeps benefiting people long after the day — the best gift to give, and to receive. Friends pledge an act of good instead of buying you something you didn't need.",
    primaryCta: { label: "Start my mission", href: "/register" },
    secondaryCta: { label: "Browse causes", href: "/give" },
    micro: "Free. Takes about two minutes. Your friends don't need an account.",
  },
  candle: {
    eyebrow: "No payments. No pressure. Just sincere good.",
    headline: {
      lead: "Don't count another candle.",
      accent: "Light one that keeps burning.",
    },
    sub: "A birthday lasts a day; what your friends do for it can last much longer. Ask them for an act of good — a meal, a tree, clean water, an hour of their time — and open the reveal on the day to see what it came to.",
    primaryCta: { label: "Start my mission", href: "/register" },
    secondaryCta: { label: "Browse causes", href: "/give" },
    micro: "Free. Takes about two minutes. Your friends don't need an account.",
  },
} as const;

/**
 * The hadith behind the whole idea.
 *
 * FOUNDER: this is authentic — Sahih Muslim 1631, also Riyad as-Salihin
 * 1383 and Sunan an-Nasa'i 3651 — but English translations differ in
 * their wording. Confirm the exact phrasing you want against an
 * authentic source (sunnah.com), and consider having a local scholar
 * read the religious copy before you publish. Keep the ﷺ after the
 * Prophet's name.
 */
export const hadith = {
  arabic:
    "إِذَا مَاتَ الْإِنْسَانُ انْقَطَعَ عَنْهُ عَمَلُهُ إِلَّا مِنْ ثَلَاثَةٍ: إِلَّا مِنْ صَدَقَةٍ جَارِيَةٍ، أَوْ عِلْمٍ يُنْتَفَعُ بِهِ، أَوْ وَلَدٍ صَالِحٍ يَدْعُو لَهُ",
  english:
    "When a person dies, their deeds come to an end except three: an ongoing charity, beneficial knowledge, and a righteous child who prays for them.",
  attribution: "— Prophet Muhammad ﷺ · reported in Sahih Muslim",
} as const;

export const aboutStory = {
  eyebrow: "Our story",
  headline: "I wanted my birthday to leave something behind.",
  lede: "I started Asar because I believe a birthday can create impact, not just collect wishes.",

  /* FOUNDER: edit this paragraph — this is the personal origin story.
     Write it the way you'd tell it to a friend, not the way a company
     writes an About page. Keep it true; nothing here should claim more
     than actually happened. */
  origin: [
    "A few birthdays ago I sat with a phone full of messages — hundreds of them, all kind, all gone by the following week. I remember thinking that the same hundred people, on the same day, could have done something that was still there a year later. Not a huge thing. Just something.",
    "So I asked. Instead of gifts, I asked people to do one small thing: fund a meal, give an hour, donate blood, or say something honest if they couldn't. What surprised me wasn't the total. It was how many people said they'd been waiting for someone to give them a reason.",
  ],

  today: [
    "Asar is an early platform I started to turn birthdays into acts of impact. You pick a purpose, share one link, and your friends pledge an action — money, time, or just their voice. On the day, you see what all of you did together.",
    MONEY_DISCLAIMER,
    TRANSPARENCY_LINE,
  ],

  tomorrow: [
    "I'd like Asar to become the thing people reach for the week before a birthday, the way they reach for a gift registry now — with a directory of organizations that has been checked by an actual human, and a record of impact that nobody has to take on faith.",
    "It isn't there yet. It's a small project, built carefully, and I'd rather say that plainly than dress it up.",
  ],

  signature: {
    name: "The founder",
    role: "Asar",
  },

  cta: {
    label: "Start your first mission",
    href: "/create",
    note: "Free, takes about two minutes, and your friends don't need an account.",
  },
} as const;
