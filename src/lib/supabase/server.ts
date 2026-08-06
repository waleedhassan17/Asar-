import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server-side Supabase client bound to the request's cookies, so RLS and
 * `auth.uid()` see the signed-in user. Use this everywhere on the server
 * except for the few genuinely privileged operations in ./admin.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // proxy.ts refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/** The signed-in user's profile, or null. */
export async function getCurrentProfile() {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let { data } = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url, birthday, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    const adminClient = createAdminClient();
    await adminClient.from("profiles").insert({
      id: user.id,
      email: user.email,
      display_name: user.email?.split("@")[0] || "Friend",
    });
    
    const retry = await supabase
      .from("profiles")
      .select("id, display_name, email, avatar_url, birthday, is_admin")
      .eq("id", user.id)
      .maybeSingle();
      
    data = retry.data;
  }

  return data ?? null;
}
