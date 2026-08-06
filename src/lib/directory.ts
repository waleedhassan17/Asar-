import type { OrgCategory } from "@/lib/types";

/**
 * Labels and vocabulary for the donation directory.
 *
 * One rule runs through all of this copy: Asar links, it does not
 * collect. Nothing here may describe a listed organization as a partner,
 * a sponsor, or an endorser of Asar — we link to trusted organizations,
 * they have not agreed to anything.
 */

export const ORG_CATEGORIES: { value: OrgCategory; label: string; icon: string }[] = [
  { value: "orphan_care", label: "Orphan care", icon: "🏠" },
  { value: "food_hunger", label: "Food & hunger", icon: "🍲" },
  { value: "health_medical", label: "Health & medical", icon: "🩺" },
  { value: "education", label: "Education", icon: "🎓" },
  { value: "water", label: "Clean water", icon: "💧" },
  { value: "emergency_relief", label: "Emergency relief", icon: "🚑" },
  { value: "microfinance", label: "Microfinance", icon: "🌱" },
  { value: "general_welfare", label: "General welfare", icon: "🤝" },
];

const CATEGORY_LOOKUP = new Map(ORG_CATEGORIES.map((c) => [c.value, c]));

export function categoryLabel(category: OrgCategory) {
  return CATEGORY_LOOKUP.get(category)?.label ?? "Welfare";
}

export function categoryIcon(category: OrgCategory) {
  return CATEGORY_LOOKUP.get(category)?.icon ?? "🤝";
}

/** Suggested chip vocabulary — organizations may carry others. */
export const CAUSE_VOCABULARY = [
  "orphans",
  "meals",
  "water",
  "education",
  "health",
  "cancer",
  "eye-care",
  "emergency",
  "microfinance",
  "shelter",
  "children",
];

export function causeLabel(cause: string) {
  return cause.replace(/-/g, " ");
}

/** The domain a donate link actually lands on, shown so nobody has to guess. */
export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * The columns anon/authenticated are actually granted on `organizations`
 * (see migration 06). PostgREST rejects `select *` when the grant is
 * column-scoped, so every read names its columns from here.
 */
export const ORG_COLUMNS =
  "id, slug, name, tagline, description, logo_url, cover_url, category, causes, country, " +
  "website_url, donate_url, is_verified, is_featured, trust_note, clicks, sort_order, created_at";

/** Every "Donate" control in the app points here — never at donate_url directly. */
export function goHref(slug: string) {
  return `/go/${encodeURIComponent(slug)}`;
}
