"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

export interface OnboardingState {
  ok?: boolean;
  error?: string;
}

const youSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Please tell us what to call you.")
    .max(60, "That name is a little long."),
  birthday: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "That date doesn't look right."),
  avatarUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

/** Step 1 — name, birthday, picture. */
export async function saveOnboardingProfile(input: unknown): Promise<OnboardingState> {
  const parsed = youSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { supabase, userId } = await currentUserId();
  if (!userId) return { error: "Please sign in again." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      birthday: parsed.data.birthday || null,
      // Empty string means "left it alone", not "remove it" — clearing a
      // picture is a settings action, not something a wizard should do by
      // accident.
      ...(parsed.data.avatarUrl ? { avatar_url: parsed.data.avatarUrl } : {}),
    })
    .eq("id", userId);

  if (error) return { error: friendlyError(error) };

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Marks onboarding as done. Called both by "Finish" and by "Skip" — the
 * flow is not a gate, and someone who skips it should not be asked again
 * every time they open the dashboard.
 */
export async function completeOnboarding(): Promise<OnboardingState> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { error: "Please sign in again." };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: friendlyError(error) };

  revalidatePath("/dashboard");
  revalidatePath("/create");
  return { ok: true };
}
