import { NextResponse } from "next/server";
import { missingSupabaseEnv, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Deployment diagnostic. `curl -f .../api/health` answers the only two
 * questions worth asking about a fresh deploy: did the environment
 * variables reach the build, and can the running server actually reach
 * the database.
 *
 * It reports presence as booleans and never echoes a value — not even a
 * prefix or a length, since both narrow a key. That keeps it safe to
 * leave unauthenticated, which is the point: a broken deploy is often one
 * where nothing else works well enough to sign in.
 */
export async function GET() {
  const missing = missingSupabaseEnv();
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !missing.includes("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !missing.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: !missing.includes("SUPABASE_SERVICE_ROLE_KEY"),
  };

  // No point dialling the database without credentials to dial it with.
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { ok: false, env, db: "skipped", siteUrl: siteUrl() },
      { status: 503 },
    );
  }

  // The same anon-key read the homepage already does, so a success here
  // proves the deployed runtime can see the migrated schema through RLS.
  let db: string;
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("mission_templates")
      .select("id", { count: "exact", head: true });
    db = error ? `error: ${error.message}` : "ok";
  } catch (cause) {
    db = `unreachable: ${cause instanceof Error ? cause.message : "unknown"}`;
  }

  const ok = db === "ok" && missing.length === 0;
  return NextResponse.json({ ok, env, db, siteUrl: siteUrl() }, { status: ok ? 200 : 503 });
}
