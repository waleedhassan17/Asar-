/**
 * Asar is useless without a Supabase project, but a missing key should
 * produce a page that explains itself rather than a stack trace — the
 * first thing a new contributor to this repo will see is `npm run dev`
 * before they have written `.env.local`.
 */
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Which of the three Supabase variables are absent, in the order they
 * appear in `.env.example`. Unlike `isSupabaseConfigured()` this includes
 * the service-role key, which otherwise announces itself only when
 * `createAdminClient()` throws mid-request — so a deploy can look healthy
 * right up until the first proof upload.
 */
export function missingSupabaseEnv() {
  // Each variable is read by static member access, never `process.env[name]`:
  // that is the only form the bundler substitutes at build time.
  return [
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
    ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
  ].flatMap(([name, value]) => (value ? [] : [name as string]));
}

export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
