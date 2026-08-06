/**
 * The SQL API raises bare codes (MISSION_CLOSED, RATE_LIMITED, …). This
 * turns them into something a person would actually want to read, and
 * makes sure an unexpected database error never leaks its internals into
 * the UI.
 */
const MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Please sign in first.",
  NOT_OWNER: "Only the person who created this mission can do that.",
  NOT_ADMIN: "That's an admin-only action.",
  MISSION_NOT_FOUND: "We couldn't find that mission.",
  MISSION_PRIVATE: "This mission is private. You'll need the link its owner shared.",
  MISSION_CLOSED: "This mission has already been revealed — but you can still leave a wish.",
  MISSION_LIMIT_REACHED: "You've reached the limit of 25 missions.",
  TEMPLATE_NOT_FOUND: "That mission preset is no longer available.",
  BIRTHDAY_REQUIRED: "Please pick your birthday date.",
  GOAL_TOO_LARGE: "That goal is a little too large — try a smaller number.",
  QUANTITY_TOO_LARGE: "That amount looks too large for this mission.",
  RATE_LIMITED: "That's a lot of entries in a short time. Take a breath and try again shortly.",
  WISH_ONLY_DISABLED: "The owner has turned off wish-only messages for this mission.",
  EXTERNAL_GIVE_DISABLED: "The owner has turned off direct giving for this mission.",
  LINK_NOT_AVAILABLE: "That give-link isn't available right now.",
  LINK_LIMIT_REACHED: "A mission can have at most 6 give-links.",
  URL_MUST_BE_HTTPS: "Give-links must start with https:// so people land somewhere safe.",
  CONTRIBUTION_NOT_FOUND: "We couldn't find that entry — it may have been removed.",
  FLAG_NOT_FOUND: "That report has already been handled.",
  SLUG_TAKEN: "That short name is already in use.",
};

export function friendlyError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : ((error as { message?: string } | null)?.message ?? "");

  for (const code of Object.keys(MESSAGES)) {
    if (raw.includes(code)) return MESSAGES[code];
  }

  if (raw.includes("duplicate key") && raw.includes("slug")) return MESSAGES.SLUG_TAKEN;
  if (raw.toLowerCase().includes("fetch")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}
