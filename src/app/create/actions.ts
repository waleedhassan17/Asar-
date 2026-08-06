"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

const schema = z.object({
  template_slug: z.string().trim().max(60).optional().nullable(),
  title: z.string().trim().min(3, "Give your mission a name.").max(120),
  headline: z.string().trim().max(120).optional(),
  story: z.string().trim().max(2000).optional(),
  icon: z.string().trim().max(8).optional(),
  unit_singular: z.string().trim().min(1).max(40),
  unit_plural: z.string().trim().min(1).max(40),
  action_verb: z.string().trim().min(1).max(40),
  lives_per_unit: z.coerce.number().min(0).max(1000),
  goal_amount: z.coerce.number().int().min(1, "The goal must be at least 1.").max(1_000_000),
  birthday_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick your birthday date."),
  reveal_at: z.string().datetime({ offset: true }),
  visibility: z.enum(["public", "link", "friends"]),
  tone: z.enum(["playful", "serious"]),
  accent: z.enum(["ember", "gold", "sage", "violet", "rose"]),
  allow_wish_only: z.boolean(),
  allow_external_give: z.boolean(),
  increments: z.array(z.number().int().min(1).max(1000)).max(4),
});

export type CreateMissionInput = z.input<typeof schema>;

export interface CreateMissionResult {
  ok: boolean;
  error?: string;
  slug?: string;
  shareToken?: string;
}

export async function createMissionAction(input: unknown): Promise<CreateMissionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = await createClient();

  // Belt and braces: the SQL function raises AUTH_REQUIRED on its own, but
  // failing here gives a much better message.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const { data, error } = await supabase.rpc("api_create_mission", { p: parsed.data });

  if (error) return { ok: false, error: friendlyError(error) };

  const result = data as { slug: string; share_token: string };
  return { ok: true, slug: result.slug, shareToken: result.share_token };
}
