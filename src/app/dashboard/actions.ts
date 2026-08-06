"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

export interface SimpleResult {
  ok: boolean;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* C-201 — the owner attaches their own trusted give-link. Whether it   */
/* goes live immediately or into the moderation queue (A-M03) is        */
/* decided in SQL against the admin-managed domain allow-list.          */
/* ------------------------------------------------------------------ */
const linkSchema = z.object({
  mission_id: z.string().uuid(),
  label: z.string().trim().min(1, "Give the link a label.").max(80),
  url: z
    .string()
    .trim()
    .url("That doesn't look like a web address.")
    .max(500)
    .refine((u) => u.startsWith("https://"), "Give-links must start with https://"),
  provider: z.string().trim().max(30).optional(),
  note: z.string().trim().max(200).optional(),
  slug: z.string().trim().min(1),
});

export async function addExternalLinkAction(
  input: unknown,
): Promise<SimpleResult & { moderation?: string }> {
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the link." };
  }

  const { slug, ...payload } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_add_external_link", { p: payload });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/m/${slug}`);
  return { ok: true, moderation: (data as { moderation: string }).moderation };
}

export async function deleteExternalLinkAction(input: {
  linkId: string;
  slug: string;
}): Promise<SimpleResult> {
  const parsed = z
    .object({ linkId: z.string().uuid(), slug: z.string().trim().min(1) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't remove that link." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("api_delete_external_link", {
    p_link_id: parsed.data.linkId,
  });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath(`/dashboard/${parsed.data.slug}`);
  revalidatePath(`/m/${parsed.data.slug}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Track B — attach organizations from the curated directory.           */
/* Nothing here moves money: attaching an organization only decides     */
/* which official donation pages the mission links out to.              */
/* ------------------------------------------------------------------ */
const missionOrgSchema = z.object({
  missionId: z.string().uuid(),
  organizationId: z.string().uuid(),
  slug: z.string().trim().min(1),
});

export async function attachMissionOrgAction(input: unknown): Promise<SimpleResult> {
  const parsed = missionOrgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't add that organization." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("api_attach_mission_org", {
    p_mission_id: parsed.data.missionId,
    p_organization_id: parsed.data.organizationId,
  });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath(`/dashboard/${parsed.data.slug}`);
  revalidatePath(`/m/${parsed.data.slug}`);
  return { ok: true };
}

export async function detachMissionOrgAction(input: unknown): Promise<SimpleResult> {
  const parsed = missionOrgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't remove that organization." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("api_detach_mission_org", {
    p_mission_id: parsed.data.missionId,
    p_organization_id: parsed.data.organizationId,
  });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath(`/dashboard/${parsed.data.slug}`);
  revalidatePath(`/m/${parsed.data.slug}`);
  return { ok: true };
}

/** Directory search for the owner's "add a cause" picker. */
export async function searchOrganizationsAction(query: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_search_organizations", {
    p_query: query.slice(0, 80),
    p_limit: 12,
  });
  if (error) return [];
  return (data as unknown[] | null) ?? [];
}

/** The organizations currently attached to a mission. */
export async function missionOrgsAction(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_mission_orgs", { p_slug: slug, p_token: null });
  if (error) return [];
  return (data as unknown[] | null) ?? [];
}

/* ------------------------------------------------------------------ */
/* Mission settings — visibility (M-06), tone (§8), goal, status.       */
/* ------------------------------------------------------------------ */
const updateSchema = z.object({
  mission_id: z.string().uuid(),
  slug: z.string().trim().min(1),
  title: z.string().trim().min(3).max(120).optional(),
  story: z.string().trim().max(2000).optional(),
  goal_amount: z.coerce.number().int().min(1).max(1_000_000).optional(),
  visibility: z.enum(["public", "link", "friends"]).optional(),
  tone: z.enum(["playful", "serious"]).optional(),
  allow_wish_only: z.boolean().optional(),
  allow_external_give: z.boolean().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export async function updateMissionAction(input: unknown): Promise<SimpleResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { mission_id, slug, ...payload } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("api_update_mission", {
    p_mission_id: mission_id,
    p: payload,
  });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/m/${slug}`);
  return { ok: true };
}

/** M-06 — burn the old secret link if it ends up somewhere it shouldn't. */
export async function rotateShareTokenAction(input: {
  missionId: string;
  slug: string;
}): Promise<SimpleResult & { shareToken?: string }> {
  const parsed = z
    .object({ missionId: z.string().uuid(), slug: z.string().trim().min(1) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't refresh that link." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_rotate_share_token", {
    p_mission_id: parsed.data.missionId,
  });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath(`/dashboard/${parsed.data.slug}`);
  return { ok: true, shareToken: (data as { share_token: string }).share_token };
}

/** Polling refresh for the owner's live dashboard. */
export async function refreshDashboardAction(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_mission_dashboard", { p_slug: slug });
  if (error) return null;
  return data;
}
