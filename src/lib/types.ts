/**
 * Shapes returned by the SQL API functions in
 * supabase/migrations/…_api_functions.sql. Kept hand-written and small so
 * the contract between the database and the app is readable in one place.
 */

export type MissionVisibility = "public" | "link" | "friends";
export type MissionTone = "playful" | "serious";
export type MissionStatus = "draft" | "active" | "revealed" | "archived";
export type ContributionTrack = "pledge" | "external_give" | "volunteer" | "share" | "wish";
export type ContributionStatus = "pledged" | "fulfilled" | "withdrawn";
export type ModerationStatus = "pending" | "approved" | "rejected";
export type FlagStatus = "open" | "dismissed" | "actioned";
export type Accent = "ember" | "gold" | "sage" | "violet" | "rose";

export interface MissionTemplate {
  id: string;
  slug: string;
  title: string;
  short_label: string;
  icon: string;
  category: string;
  unit_singular: string;
  unit_plural: string;
  action_verb: string;
  default_goal: number;
  lives_per_unit: number;
  increments: number[];
  accent: Accent;
  blurb: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Mission {
  id: string;
  slug: string;
  title: string;
  headline: string;
  story: string | null;
  icon: string;
  unit_singular: string;
  unit_plural: string;
  action_verb: string;
  lives_per_unit: number;
  increments: number[];
  goal_amount: number;
  birthday_date: string;
  starts_at: string;
  reveal_at: string;
  visibility: MissionVisibility;
  tone: MissionTone;
  status: MissionStatus;
  accent: Accent;
  allow_wish_only: boolean;
  allow_external_give: boolean;
  is_revealed: boolean;
  is_sprint: boolean;
  created_at: string;
  share_token?: string;
}

export interface MissionStats {
  slug: string;
  goal_amount: number;
  lives_per_unit: number;
  unit_singular: string;
  unit_plural: string;
  reveal_at: string;
  starts_at: string;
  confirmed_units: number;
  promised_units: number;
  lives_impacted: number;
  goal_percent: number;
  contribution_count: number;
  contributor_count: number;
  pledge_count: number;
  external_give_count: number;
  volunteer_count: number;
  share_count: number;
  wish_count: number;
  volunteer_hours: number;
  proof_count: number;
  endorsed_count: number;
  joined_last_24h: number;
  joined_last_7d: number;
  last_contribution_at: string | null;
  give_link_clicks: number;
}

export interface ActionBreakdown {
  track: ContributionTrack;
  action_label: string;
  entries: number;
  confirmed_units: number | null;
  promised_units: number | null;
}

export interface Contribution {
  id: string;
  track: ContributionTrack;
  contributor_name: string;
  is_anonymous: boolean;
  quantity: number;
  unit: string | null;
  action_label: string | null;
  hours: number | null;
  status: ContributionStatus;
  fulfilled_at: string | null;
  has_proof: boolean;
  proof_url: string | null;
  proof_note: string | null;
  reported_amount: string | null;
  message: string | null;
  owner_reaction: string | null;
  endorsement_count: number;
  created_at: string;
}

export interface ExternalLink {
  id: string;
  label: string;
  url: string;
  provider: string | null;
  note: string | null;
  click_count: number;
  moderation: ModerationStatus;
  review_note?: string | null;
  created_at?: string;
}

export interface MissionPage {
  mission: Mission;
  owner: { display_name: string; avatar_url: string | null } | null;
  is_owner: boolean;
  stats: MissionStats;
  breakdown: ActionBreakdown[];
  links: ExternalLink[];
  contributions: Contribution[];
}

export interface MissionDashboard {
  mission: Mission & { share_token: string; owner_id: string };
  stats: MissionStats;
  breakdown: ActionBreakdown[];
  contributions: Contribution[];
  links: ExternalLink[];
  daily: { day: string; entries: number }[];
  flags: {
    id: string;
    contribution_id: string;
    reason: string;
    status: FlagStatus;
    created_at: string;
  }[];
}

export interface MissionSummary {
  id: string;
  slug: string;
  title: string;
  icon: string;
  goal_amount: number;
  unit_plural: string;
  reveal_at: string;
  birthday_date: string;
  visibility: MissionVisibility;
  status: MissionStatus;
  accent: Accent;
  share_token: string;
  created_at: string;
  is_revealed: boolean;
  stats: MissionStats;
}

export interface RevealPayload {
  mission: Pick<
    Mission,
    | "id"
    | "slug"
    | "title"
    | "icon"
    | "unit_singular"
    | "unit_plural"
    | "goal_amount"
    | "reveal_at"
    | "tone"
    | "accent"
    | "birthday_date"
  >;
  owner: { display_name: string; avatar_url: string | null } | null;
  is_unlocked: boolean;
  is_owner: boolean;
  stats: MissionStats;
  headline: { value: number; unit_value: number; unit: string; people: number };
  breakdown: ActionBreakdown[];
  proofs: { url: string; note: string | null; name: string; action_label: string | null }[];
  wishes: Contribution[];
  contributors: string[];
}

export interface AdminOverview {
  transparency: {
    missions_total: number;
    missions_active: number;
    contributions_total: number;
    contributions_confirmed: number;
    contributions_with_proof: number;
    contributions_endorsed: number;
    wishes_only: number;
    flags_open: number;
    flags_actioned: number;
    links_approved: number;
    links_rejected: number;
    proof_attached_percent: number;
  };
  templates: MissionTemplate[];
  settings: Record<string, unknown>;
  pending_links: (ExternalLink & {
    mission_slug: string;
    mission_title: string;
    owner: string;
    owner_email: string | null;
  })[];
  review_queue: {
    flag_id: string;
    flag_reason: string;
    flag_details: string | null;
    flagged_at: string;
    contribution: Contribution;
    mission_slug: string;
    mission_title: string;
  }[];
  high_volume: {
    contribution: Contribution;
    mission_slug: string;
    mission_title: string;
    goal_amount: number;
  }[];
}

/* ------------------------------------------------------------------ */
/* Donation directory                                                  */
/* ------------------------------------------------------------------ */
export type OrgCategory =
  | "orphan_care"
  | "food_hunger"
  | "health_medical"
  | "education"
  | "water"
  | "emergency_relief"
  | "microfinance"
  | "general_welfare";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  category: OrgCategory;
  causes: string[];
  country: string;
  website_url: string | null;
  /** The organization's own official donation page — never an Asar URL. */
  donate_url: string;
  is_verified: boolean;
  is_featured: boolean;
  trust_note: string | null;
  clicks: number;
  sort_order: number;
  created_at: string;
}

export interface TrustRules {
  endorsements_for_community_confirmed: number;
  proof_boost: number;
  endorsement_boost: number;
  flags_to_auto_queue: number;
  high_volume_goal_fraction: number;
  labels: { base: string; proof: string; community: string };
}
