"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import type { Contribution } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Adding a contribution — Track A, B and C all land here (C-101,      */
/* C-201/C-202, C-301/C-302/C-304). The database function is the one   */
/* that decides what is allowed; this layer just shapes the input.     */
/* ------------------------------------------------------------------ */
const contributionSchema = z.object({
  slug: z.string().trim().min(1),
  token: z.string().uuid().optional().nullable(),
  track: z.enum(["pledge", "external_give", "volunteer", "share", "wish"]),
  contributor_name: z.string().trim().max(80).optional(),
  is_anonymous: z.boolean().optional(),
  quantity: z.coerce.number().min(0).max(1_000_000).optional(),
  hours: z.coerce.number().min(0).max(1000).optional().nullable(),
  action_label: z.string().trim().max(120).optional(),
  message: z.string().trim().max(1000).optional(),
  external_link_id: z.string().uuid().optional().nullable(),
  reported_amount: z.string().trim().max(60).optional(),
  proof_url: z.string().trim().url().max(500).optional().nullable(),
  proof_note: z.string().trim().max(300).optional(),
  already_done: z.boolean().optional(),
  visitor_hash: z.string().trim().max(64),
  unit: z.string().trim().max(40).optional(),
});

export interface ContributionResult {
  ok: boolean;
  error?: string;
  id?: string;
  manageToken?: string;
  contribution?: Contribution;
}

export async function addContributionAction(input: unknown): Promise<ContributionResult> {
  const parsed = contributionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check what you entered." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_add_contribution", { p: parsed.data });

  if (error) return { ok: false, error: friendlyError(error) };

  const result = data as { id: string; manage_token: string; contribution: Contribution };
  revalidatePath(`/m/${parsed.data.slug}`);

  return {
    ok: true,
    id: result.id,
    manageToken: result.manage_token,
    contribution: result.contribution,
  };
}

/* ------------------------------------------------------------------ */
/* C-102 — the contributor marks their own pledge as fulfilled.        */
/* ------------------------------------------------------------------ */
const confirmSchema = z.object({
  id: z.string().uuid(),
  manageToken: z.string().uuid(),
  slug: z.string().trim().min(1),
  proofUrl: z.string().url().max(500).optional().nullable(),
  proofNote: z.string().trim().max(300).optional().nullable(),
});

export async function confirmContributionAction(input: unknown): Promise<ContributionResult> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That pledge couldn't be confirmed." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_confirm_contribution", {
    p_id: parsed.data.id,
    p_manage_token: parsed.data.manageToken,
    p_proof_url: parsed.data.proofUrl ?? null,
    p_proof_note: parsed.data.proofNote ?? null,
  });

  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath(`/m/${parsed.data.slug}`);
  return { ok: true, contribution: (data as { contribution: Contribution }).contribution };
}

/* ------------------------------------------------------------------ */
/* T-02 — peer endorsement. Never a "verified" stamp, just a friend    */
/* saying they saw it happen.                                          */
/* ------------------------------------------------------------------ */
export async function endorseAction(input: {
  id: string;
  name: string;
  visitorHash: string;
}): Promise<{ ok: boolean; error?: string; count?: number }> {
  const schema = z.object({
    id: z.string().uuid(),
    name: z.string().trim().max(80),
    visitorHash: z.string().trim().max(64),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't record that." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_endorse_contribution", {
    p_id: parsed.data.id,
    p_endorser_name: parsed.data.name || "A friend",
    p_endorser_hash: parsed.data.visitorHash,
  });

  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, count: Number((data as { endorsement_count: number }).endorsement_count) };
}

/* ------------------------------------------------------------------ */
/* T-05 — anti-fraud flagging.                                         */
/* ------------------------------------------------------------------ */
export async function flagAction(input: {
  id: string;
  reason: string;
  details?: string;
  visitorHash: string;
}): Promise<{ ok: boolean; error?: string }> {
  const schema = z.object({
    id: z.string().uuid(),
    reason: z.string().trim().min(1).max(60),
    details: z.string().trim().max(500).optional(),
    visitorHash: z.string().trim().max(64),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't send that report." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("api_flag_contribution", {
    p_id: parsed.data.id,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details ?? null,
    p_reporter_hash: parsed.data.visitorHash,
  });

  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* W-04 — the owner reacts to a wish without having to reply to each.  */
/* ------------------------------------------------------------------ */
export async function reactAction(input: {
  id: string;
  reaction: string | null;
  slug: string;
}): Promise<{ ok: boolean; error?: string }> {
  const schema = z.object({
    id: z.string().uuid(),
    reaction: z.string().max(8).nullable(),
    slug: z.string().trim().min(1),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Couldn't add that reaction." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("api_react_to_contribution", {
    p_id: parsed.data.id,
    p_reaction: parsed.data.reaction,
  });

  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath(`/m/${parsed.data.slug}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* C-203 — count the click, then hand back where to go.                */
/* ------------------------------------------------------------------ */
export async function recordClickAction(input: {
  linkId: string;
  visitorHash: string;
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  const schema = z.object({
    linkId: z.string().uuid(),
    visitorHash: z.string().trim().max(64),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That link isn't available." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_record_link_click", {
    p_link_id: parsed.data.linkId,
    p_visitor_hash: parsed.data.visitorHash,
  });

  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, url: (data as { url: string }).url };
}

/* ------------------------------------------------------------------ */
/* Polling refresh for the live tally (D-01, D-05, D-06).              */
/* ------------------------------------------------------------------ */
export async function refreshMissionAction(slug: string, token?: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("api_get_mission", {
    p_slug: slug,
    p_token: token ?? null,
  });
  if (error) return null;
  return data;
}
