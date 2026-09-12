import { isAuthRetryableFetchError, type SupabaseClient, type User } from "@supabase/supabase-js";

/**
 * Supabase is a network dependency, and every page render and every proxy
 * invocation waits on it. When the project is slow, paused, or gone, the
 * cost to a visitor should be a few seconds and a signed-out page — not a
 * request that hangs until the platform kills it.
 *
 * Deliberately free of `next/headers`, so proxy.ts can import it.
 */

const FETCH_TIMEOUT_MS = 5_000;
const AUTH_DEADLINE_MS = 4_000;

/** `fetch` that gives up on any single Supabase request after a few seconds. */
export const timeoutFetch: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

/**
 * `auth.getUser()` with an overall deadline.
 *
 * A per-request timeout is not enough on its own: with an expired access
 * token, auth-js refreshes the session and retries network failures with
 * backoff for up to 30 seconds. That loop is what turned an unreachable
 * project into MIDDLEWARE_INVOCATION_TIMEOUT for anyone holding an old
 * session cookie.
 *
 * `settled: false` means Supabase could not answer — timed out, threw, or
 * failed at the network — so `user: null` is "unknown", not "signed out".
 */
export async function getUserWithin(
  supabase: Pick<SupabaseClient, "auth">,
  ms = AUTH_DEADLINE_MS,
): Promise<{ user: User | null; settled: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<{ user: null; settled: false }>((resolve) => {
    timer = setTimeout(() => resolve({ user: null, settled: false }), ms);
  });

  try {
    return await Promise.race([
      supabase.auth.getUser().then(({ data, error }) => ({
        user: data.user,
        settled: !isAuthRetryableFetchError(error),
      })),
      deadline,
    ]);
  } catch {
    return { user: null, settled: false };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Whether the request carries a Supabase session at all. Without one there
 * is no user to find, so there is nothing to ask the network. Matches the
 * chunked `.0`, `.1`… variants too.
 */
export function hasAuthCookie(cookies: { name: string }[]) {
  return cookies.some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}
