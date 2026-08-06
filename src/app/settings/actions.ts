"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

export interface SettingsState {
  ok?: boolean;
  error?: string;
}

const profileSchema = z.object({
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
});

/**
 * The only writable profile fields — `is_admin` is deliberately not one of
 * them, and RLS refuses it anyway (see migration 03).
 */
export async function updateProfileAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    birthday: formData.get("birthday") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      birthday: parsed.data.birthday || null,
    })
    .eq("id", user.id);

  if (error) return { error: friendlyError(error) };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
