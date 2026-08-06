import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/server";
import { Avatar, LinkButton } from "@/components/ui";
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
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Wordmark />

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/give"
            className="rounded-full px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink"
          >
            Give
          </Link>
          <Link
            href="/how-it-works"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink sm:block"
          >
            How it works
          </Link>
          <Link
            href="/about"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink md:block"
          >
            Our story
          </Link>
          <Link
            href="/transparency"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink sm:block"
          >
            Transparency
          </Link>

          {profile ? (
            <>
              {profile.is_admin ? (
                <Link
                  href="/admin"
                  className="rounded-full px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink"
                >
                  Admin
                </Link>
              ) : null}
              <SignOutButton className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink sm:block" />
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
                className="rounded-full px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink"
              >
                Sign in
              </Link>
              <LinkButton href="/register" size="sm">
                Start a mission
              </LinkButton>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
