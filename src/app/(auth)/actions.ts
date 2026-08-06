"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";

export interface AuthState {
  error?: string;
  notice?: string;
}

const emailSchema = z.string().trim().toLowerCase().email("That doesn't look like an email address.");

const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Please tell us what to call you.")
    .max(60, "That name is a little long."),
  email: emailSchema,
  password: z.string().min(8, "Use at least 8 characters."),
  birthday: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "That date doesn't look right."),
});

/** Keeps an open redirect from being smuggled in through ?next=. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  // Resolved before the request so the confirmation email can carry it —
  // otherwise someone who signed up from a protected page loses their
  // destination the moment they go via their inbox.
  const next = safeNext(formData.get("next"));

  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    birthday: formData.get("birthday") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the handle_new_user() trigger to seed the profile row.
      data: {
        display_name: parsed.data.displayName,
        birthday: parsed.data.birthday || null,
      },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { error: error.message };

  // With "confirm email" enabled there is no session yet, so we can't just
  // drop the person into the dashboard.
  if (!data.session) {
    return {
      notice:
        "Check your inbox — we've sent a link to confirm your email. Open it and you're in.",
    };
  }

  redirect(next);
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  if (!email.success) return { error: email.error.issues[0].message };
  if (!password) return { error: "Please enter your password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.data,
    password,
  });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "That email and password don't match."
          : error.message,
    };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
