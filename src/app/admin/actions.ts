"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

export interface AdminResult {
  ok: boolean;
  error?: string;
}

/* A-M01 — mission template manager. */
const templateSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().max(60).optional(),
  title: z.string().trim().min(2).max(80),
  short_label: z.string().trim().max(40).optional(),
  icon: z.string().trim().max(8).optional(),
  category: z.string().trim().max(30).optional(),
  unit_singular: z.string().trim().min(1).max(40),
  unit_plural: z.string().trim().min(1).max(40),
  action_verb: z.string().trim().min(1).max(40),
  default_goal: z.coerce.number().int().min(1).max(1_000_000),
  lives_per_unit: z.coerce.number().min(0).max(1000),
  increments: z.array(z.coerce.number().int().min(1).max(1000)).max(4).optional(),
  accent: z.enum(["ember", "gold", "sage", "violet", "rose"]).optional(),
  blurb: z.string().trim().max(200).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
});

export async function upsertTemplateAction(input: unknown): Promise<AdminResult> {
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the template." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("api_admin_upsert_template", { p: parsed.data });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

/* A-M06 — the curated donation directory.

   Asar never handles money, so the only thing an admin is really
   moderating here is a *link*: whether donate_url is genuinely that
   organization's own official domain. is_verified must never be set from
   an import or a guess — look-alike donation sites exist for well-known
   charities, and the tick is the only thing standing between a visitor
   and one of them. */
const organizationSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().max(80).optional(),
  name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160).optional(),
  description: z.string().trim().max(1200).optional(),
  logo_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  cover_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  category: z.enum([
    "orphan_care",
    "food_hunger",
    "health_medical",
    "education",
    "water",
    "emergency_relief",
    "microfinance",
    "general_welfare",
  ]),
  causes: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  country: z.string().trim().min(2).max(60).optional(),
  website_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  donate_url: z
    .string()
    .trim()
    .url("That doesn't look like a web address.")
    .max(500)
    .refine((u) => u.startsWith("https://"), "Donation links must start with https://"),
  is_verified: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  trust_note: z.string().trim().max(240).optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
});

export async function upsertOrganizationAction(input: unknown): Promise<AdminResult> {
  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the organization.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("api_admin_upsert_organization", { p: parsed.data });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/admin");
  revalidatePath("/give");
  if (parsed.data.slug) revalidatePath(`/give/${parsed.data.slug}`);
  return { ok: true };
}

export async function deleteOrganizationAction(input: { id: string }): Promise<AdminResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't remove that organization." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("api_admin_delete_organization", { p_id: parsed.data.id });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/admin");
  revalidatePath("/give");
  return { ok: true };
}

/* A-M03 — external link moderation. */
export async function moderateLinkAction(input: {
  linkId: string;
  status: "approved" | "rejected" | "pending";
  note?: string;
}): Promise<AdminResult> {
  const parsed = z
    .object({
      linkId: z.string().uuid(),
      status: z.enum(["approved", "rejected", "pending"]),
      note: z.string().trim().max(300).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't apply that decision." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("api_admin_moderate_link", {
    p_link_id: parsed.data.linkId,
    p_status: parsed.data.status,
    p_note: parsed.data.note ?? null,
  });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/admin");
  return { ok: true };
}

/* A-M02 — self-reported pledge review queue. */
export async function resolveFlagAction(input: {
  flagId: string;
  status: "dismissed" | "actioned";
  note?: string;
  hide?: boolean;
}): Promise<AdminResult> {
  const parsed = z
    .object({
      flagId: z.string().uuid(),
      status: z.enum(["dismissed", "actioned"]),
      note: z.string().trim().max(300).optional(),
      hide: z.boolean().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't resolve that report." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("api_admin_resolve_flag", {
    p_flag_id: parsed.data.flagId,
    p_status: parsed.data.status,
    p_note: parsed.data.note ?? null,
    p_hide: parsed.data.hide ?? false,
  });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/admin");
  return { ok: true };
}

/* A-M04 — trust score configuration and the domain allow-list. */
export async function setSettingAction(input: {
  key: string;
  value: unknown;
  label?: string;
}): Promise<AdminResult> {
  const parsed = z
    .object({
      key: z.string().trim().min(1).max(60),
      value: z.unknown(),
      label: z.string().trim().max(120).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't save that setting." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("api_admin_set_setting", {
    p_key: parsed.data.key,
    p_value: parsed.data.value,
    p_label: parsed.data.label ?? null,
  });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/admin");
  revalidatePath("/transparency");
  return { ok: true };
}

/**
 * Move a contact message through new → read → replied → archived, and
 * optionally attach a private note.
 *
 * There is no "send reply" here because there is no SMTP: the admin view
 * offers a mailto to the sender's own address, which opens the admin's
 * mail client. Marking "replied" is the admin recording that they did.
 */
export async function updateContactMessageAction(input: {
  id: string;
  status?: "new" | "read" | "replied" | "archived";
  note?: string;
}): Promise<AdminResult> {
  const parsed = z
    .object({
      id: z.string().uuid(),
      status: z.enum(["new", "read", "replied", "archived"]).optional(),
      note: z.string().trim().max(2000).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't update that message." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("api_admin_update_contact_message", {
    p_id: parsed.data.id,
    p_status: parsed.data.status ?? null,
    p_note: parsed.data.note ?? null,
  });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/admin");
  return { ok: true };
}
