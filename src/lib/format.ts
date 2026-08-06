import type { Contribution, ContributionTrack, MissionTone, TrustRules } from "./types";

export const DEFAULT_TRUST_RULES: TrustRules = {
  endorsements_for_community_confirmed: 2,
  proof_boost: 2,
  endorsement_boost: 1,
  flags_to_auto_queue: 2,
  high_volume_goal_fraction: 0.25,
  labels: {
    base: "Self-reported",
    proof: "Proof attached",
    community: "Friends confirmed",
  },
};

export function plural(n: number, singular: string, pluralForm: string) {
  return Math.abs(n) === 1 ? singular : pluralForm;
}

export function compactNumber(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function tidyNumber(n: number) {
  const rounded = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("en").format(rounded);
}

export function formatDate(value: string | Date, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en", opts ?? { day: "numeric", month: "long" }).format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export function relativeTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.348, "week"],
    [12, "month"],
  ];

  let amount = seconds / 60;
  let unit: Intl.RelativeTimeFormatUnit = "minute";
  for (let i = 0; i < steps.length; i += 1) {
    if (Math.abs(amount) < steps[i][0]) break;
    amount /= steps[i][0];
    unit = steps[i + 1]?.[1] ?? "year";
  }
  return rtf.format(-Math.round(amount), unit);
}

/** Splits a duration into the pieces the countdown widget renders (M-04). */
export function breakdownDuration(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isOver: clamped === 0,
  };
}

export const TRACK_META: Record<
  ContributionTrack,
  { label: string; icon: string; accent: string; blurb: string }
> = {
  pledge: {
    label: "Pledge an action",
    icon: "🤝",
    accent: "ember",
    blurb: "Commit to something, then tick it off when it's done.",
  },
  external_give: {
    label: "Give directly",
    icon: "↗",
    accent: "gold",
    blurb: "Use a link the birthday person trusts. Asar never touches the money.",
  },
  volunteer: {
    label: "Give time",
    icon: "⏳",
    accent: "sage",
    blurb: "Hours, blood, skills — anything that isn't money.",
  },
  share: {
    label: "Spread the word",
    icon: "📣",
    accent: "violet",
    blurb: "Sharing counts. Reach is real help.",
  },
  wish: {
    label: "Just leave a wish",
    icon: "💌",
    accent: "rose",
    blurb: "No action, no pressure, no explanation needed.",
  },
};

/**
 * T-01 / T-02 / T-03. Deliberately never returns the word "verified" —
 * nothing here is institutionally verified yet, and pretending otherwise
 * is the one thing that would break trust for good.
 */
export function trustLabel(
  contribution: Pick<Contribution, "has_proof" | "endorsement_count" | "status">,
  rules: TrustRules = DEFAULT_TRUST_RULES,
) {
  if (contribution.endorsement_count >= rules.endorsements_for_community_confirmed) {
    return { text: rules.labels.community, tone: "success" as const };
  }
  if (contribution.has_proof) {
    return { text: rules.labels.proof, tone: "primary" as const };
  }
  return { text: rules.labels.base, tone: "neutral" as const };
}

/**
 * W-02: suggests the wording of the combo message from the action taken.
 * Always editable — this is a starting point, not a script.
 */
export function suggestMessage(input: {
  track: ContributionTrack;
  quantity?: number;
  unitSingular: string;
  unitPlural: string;
  actionVerb: string;
  hours?: number;
  ownerName?: string;
}) {
  const who = input.ownerName ? ` ${input.ownerName}` : "";
  const qty = input.quantity ?? 0;
  const unit = plural(qty, input.unitSingular, input.unitPlural);

  switch (input.track) {
    case "pledge":
      return `Happy Birthday${who}! I ${input.actionVerb} ${tidyNumber(qty)} ${unit} in your name ❤️`;
    case "external_give":
      return `Happy Birthday${who}! I gave directly to your mission ❤️`;
    case "volunteer":
      return input.hours
        ? `Happy Birthday${who}! I pledged ${tidyNumber(input.hours)} ${plural(input.hours, "hour", "hours")} of my time for this ❤️`
        : `Happy Birthday${who}! I'm giving my time to this ❤️`;
    case "share":
      return `Happy Birthday${who}! I shared your mission so more people can join ❤️`;
    default:
      return `Happy Birthday${who}! Wishing you a year as good as you are ❤️`;
  }
}

/** Owner-selected voice for the page (section 8, "Owner controls tone"). */
export function toneCopy(tone: MissionTone) {
  return tone === "serious"
    ? {
        joinCta: "Take part",
        tallyLead: "Impact so far",
        countdownLead: "Time remaining",
        wishWall: "Messages",
        thanks: "Thank you for taking part.",
        revealLead: "Because of you",
      }
    : {
        joinCta: "Join in 🎉",
        tallyLead: "Look what's happening",
        countdownLead: "Counting down to the big day",
        wishWall: "Wishes & actions",
        thanks: "You just made someone's birthday mean more.",
        revealLead: "Because of you",
      };
}

/** Turns a contribution into the one-line summary shown on the wish wall. */
export function describeContribution(c: Contribution) {
  if (c.action_label) return c.action_label;
  switch (c.track) {
    case "pledge":
      return `${tidyNumber(c.quantity)} ${c.unit ?? "actions"}`;
    case "external_give":
      return c.reported_amount ? `gave ${c.reported_amount}` : "gave directly";
    case "volunteer":
      return c.hours ? `${tidyNumber(c.hours)} volunteer hours` : "volunteering";
    case "share":
      return "shared the mission";
    default:
      return "sent a wish";
  }
}
