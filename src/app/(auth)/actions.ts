"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // ------------------------------------------------------------------
  // No email confirmation.
  //
  // The account is created already-confirmed through the service role and
  // the person is signed straight in, so signing up never sends an email
  // and never depends on one arriving.
  //
  // This is deliberate, and it is the only thing standing between the
  // product and a dead end: Supabase's built-in mailer only delivers to
  // addresses inside the project's own organisation and is rate limited to
  // a couple of messages an hour, so with confirmation on, nobody except
  // the project owner could finish signing up. Verified: a confirmation
  // was recorded as sent to a normal Gmail address and never arrived.
  //
  // TO RESTORE REAL EMAIL VERIFICATION, once custom SMTP is configured:
  // delete this block, call supabase.auth.signUp() with
  //   options: { data: { display_name, birthday },
  //              emailRedirectTo: `${siteUrl()}/auth/callback?next=...` }
  // and return the "check your inbox" notice when no session comes back.
  // The /auth/callback route is still in place and still works.
  //
  // Trade-off worth knowing: this path skips the rate limiting that
  // Supabase applies to its public signup endpoint, so account creation is
  // only as protected as this server action is.
  // ------------------------------------------------------------------
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Sign-up isn't configured on this deployment." };
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    // Read by the handle_new_user() trigger to seed the profile row.
    user_metadata: {
      display_name: parsed.data.displayName,
      birthday: parsed.data.birthday || null,
    },
  });

  if (createError) {
    const alreadyExists =
      createError.status === 422 || /already/i.test(createError.message ?? "");
    return {
      error: alreadyExists
        ? "That email already has an account — sign in instead."
        : createError.message,
    };
  }

  // Create with the service role, sign in as the person: the session has
  // to come from the cookie-bound client or the browser gets no cookie.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    return { error: "Your account was created — please sign in." };
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
    // Every sign-in failure is reported the same way on purpose.
    //
    // Supabase returns `invalid_credentials` both for a wrong password and
    // for an address that was never registered, which is the right
    // behaviour: distinguishing them would turn the login form into a way
    // to discover who has an account. Anything else — an unconfirmed
    // address, a disabled user — is also collapsed here rather than
    // surfacing a raw Supabase string to a visitor.
    const credentialFailure =
      error.status === 400 ||
      error.code === "invalid_credentials" ||
      /invalid login credentials/i.test(error.message ?? "");

    return {
      error: credentialFailure
        ? "Invalid credentials — that email and password don't match."
        : "We couldn't sign you in just now. Please try again.",
    };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
