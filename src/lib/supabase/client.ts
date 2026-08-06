import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Carries only the publishable anon key,
 * which by design can do nothing except read public rows and call the
 * granted `api_*` functions (see supabase/migrations/…_rls.sql).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
