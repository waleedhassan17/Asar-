import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getUserWithin, hasAuthCookie, timeoutFetch } from "@/lib/supabase/resilience";

const PROTECTED = ["/dashboard", "/create", "/admin", "/settings", "/onboarding"];

/** Paths where finishing onboarding matters, in either direction. */
const ONBOARDING_GATED = ["/dashboard", "/create", "/onboarding"];

function redirectTo(request: NextRequest, pathname: string, next?: string) {
  const redirect = request.nextUrl.clone();
  redirect.pathname = pathname;
  redirect.search = "";
  if (next) redirect.searchParams.set("next", next);
  return NextResponse.redirect(redirect);
}

/**
 * Refreshes the Supabase session cookie on every request and does one
 * optimistic redirect for signed-out visitors hitting an owner area. The
 * real authorisation lives in the SQL functions — this only saves a
 * round trip and a flash of empty UI.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without credentials there is no session to refresh; let the page
  // render its own "not configured yet" state instead of crashing.
  if (!url || !anonKey) return response;

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

  // No session cookie, no user — asking Supabase would only confirm that.
  // Anonymous traffic never touches the network here.
  if (!hasAuthCookie(request.cookies.getAll())) {
    return isProtected ? redirectTo(request, "/login", path) : response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
    global: { fetch: timeoutFetch },
  });

  // If Supabase can't say who this is in time, don't guess: redirecting
  // would sign people out during an outage. Let the request through and
  // leave the page to its own auth check.
  const { user, settled } = await getUserWithin(supabase);
  if (!settled) return response;

  if (!user && isProtected) return redirectTo(request, "/login", path);

  // First-run gate.
  //
  // This has to happen here rather than in the page, even though the page
  // already holds the profile: /dashboard and /create both have a
  // loading.tsx, so Next flushes the skeleton with a 200 and a
  // page-level redirect() arrives later in the stream as a client
  // navigation. The person sees a skeleton of the wrong page first. A
  // proxy redirect is a real 307 before any HTML is sent.
  //
  // The extra read is scoped to these three paths, so it costs nothing on
  // the rest of the site.
  if (user && ONBOARDING_GATED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();

    // A failed read says nothing about onboarding. Without this, an
    // unreachable database would send finished accounts back to step one.
    if (error) return response;

    const onboarded = Boolean(profile?.onboarded_at);
    const onOnboarding = path === "/onboarding";

    if (!onboarded && !onOnboarding) return redirectTo(request, "/onboarding");

    // Finished it already: this is not a page to land on again.
    if (onboarded && onOnboarding) return redirectTo(request, "/dashboard");
  }

  if (user && (path === "/login" || path === "/register")) {
    return redirectTo(request, "/dashboard");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
