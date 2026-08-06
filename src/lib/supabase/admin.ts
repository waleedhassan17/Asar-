import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS entirely, so it must never be
 * imported into anything that ships to the browser — the `server-only`
 * import above turns that mistake into a build error.
 *
 * Used for exactly two things: writing proof uploads to storage, and
 * reading a link-only mission on the server when the visitor arrived with
 * a valid share token.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — proof uploads and private-link reads need it.",
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
