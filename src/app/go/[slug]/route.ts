import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * The click-through mechanic.
 *
 * Every "Donate" control in Asar is an anchor to /go/{slug}. This handler
 * looks the organization up, counts the click without blocking on it, and
 * 302s the visitor to that organization's OWN official donation page,
 * where they pay the organization directly. No money — and no payment
 * detail of any kind — ever passes through Asar.
 */
export async function GET(request: Request, ctx: RouteContext<"/go/[slug]">) {
  const { slug } = await ctx.params;
  const base = new URL(request.url).origin || siteUrl();
  const backToDirectory = (reason: string) =>
    NextResponse.redirect(new URL(`/give?missing=${encodeURIComponent(reason)}`, base), 302);

  if (!isSupabaseConfigured()) return backToDirectory(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("slug, donate_url")
    .eq("slug", slug)
    .maybeSingle();

  // Gentle landing rather than a bare 404 — this person was trying to give.
  if (error || !data?.donate_url) return backToDirectory(slug);

  // Defensive: the column is constrained to http(s) in SQL, but this is
  // the one place a stored value becomes a redirect, so re-check it here
  // rather than trust the row.
  let destination: URL;
  try {
    destination = new URL(data.donate_url);
  } catch {
    return backToDirectory(slug);
  }
  if (destination.protocol !== "https:" && destination.protocol !== "http:") {
    return backToDirectory(slug);
  }

  // Fire-and-forget: a counter must never delay, or break, a donation.
  after(async () => {
    try {
      await supabase.rpc("increment_org_click", { p_slug: data.slug });
    } catch {
      /* counting is best-effort by design */
    }
  });

  return NextResponse.redirect(destination.toString(), 302);
}
