import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/server";
import { Avatar, LinkButton, cx } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/site/sign-out-button";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center ${className ?? ""}`} aria-label="Asar — home">
      <Logo size={32} className="transition group-hover:-translate-y-px" />
    </Link>
  );
}

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 glass">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-5">
        <Wordmark />

        <nav className="flex min-w-0 items-center gap-0.5 sm:gap-2">
          {/* Signed out, Give is the main thing to offer a visitor with no
              account. Signed in, it competes for width with Dashboard and
              the avatar and loses — on a 360px phone that overflowed and
              clipped the avatar. It comes back at sm. */}
          <Link
            href="/give"
            className={cx(
              "rounded-full px-2.5 py-2 text-sm font-medium whitespace-nowrap text-ink-2 transition hover:bg-surface-2 hover:text-ink sm:px-3",
              profile && "hidden sm:block",
            )}
          >
            Give
          </Link>
          <Link
            href="/how-it-works"
            className="hidden rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-ink-2 transition hover:bg-surface-2 hover:text-ink sm:block"
          >
            How it works
          </Link>
          <Link
            href="/about"
            className="hidden rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-ink-2 transition hover:bg-surface-2 hover:text-ink md:block"
          >
            Our story
          </Link>
          <Link
            href="/transparency"
            className="hidden rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-ink-2 transition hover:bg-surface-2 hover:text-ink sm:block"
          >
            Transparency
          </Link>

          {profile ? (
            <>
              {profile.is_admin ? (
                <Link
                  href="/admin"
                  className="rounded-full px-2.5 py-2 text-sm font-medium whitespace-nowrap text-ink-2 transition hover:bg-surface-2 hover:text-ink sm:px-3"
                >
                  Admin
                </Link>
              ) : null}
              <SignOutButton className="hidden rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-ink-2 transition hover:bg-surface-2 hover:text-ink sm:block" />
              {/* Signed-in visitors get a primary action of their own. The
                  old "My missions" text link pointed here too, so this
                  replaces it rather than sitting beside it. */}
              <LinkButton href="/dashboard" size="sm">
                Dashboard
              </LinkButton>
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium text-ink transition hover:bg-surface-2"
                title="Settings"
              >
                <Avatar name={profile.display_name} size={30} />
                <span className="hidden sm:inline">{profile.display_name}</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-2.5 py-2 text-sm font-medium whitespace-nowrap text-ink-2 transition hover:bg-surface-2 hover:text-ink sm:px-3"
              >
                Sign in
              </Link>
              <LinkButton href="/register" size="sm">
                {/* "Start a mission" does not fit beside the wordmark on a
                    360px phone. The short label carries the same meaning
                    where there is no room for the long one. */}
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Start a mission</span>
              </LinkButton>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
