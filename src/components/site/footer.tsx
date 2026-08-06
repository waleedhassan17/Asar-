import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-ink-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Logo size={26} />
          <span>— a birthday is a good excuse to do something that lasts.</span>
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/about" className="transition hover:text-ink">
            Our story
          </Link>
          <Link href="/give" className="transition hover:text-ink">
            Donation directory
          </Link>
          <Link href="/transparency" className="transition hover:text-ink">
            Transparency log
          </Link>
          <Link href="/dashboard" className="transition hover:text-ink">
            My missions
          </Link>
          <Link href="/create" className="transition hover:text-ink">
            Start a mission
          </Link>
          <Link href="/how-it-works" className="transition hover:text-ink">
            How it works
          </Link>
        </nav>
      </div>
      <p className="mx-auto w-full max-w-6xl px-5 pb-8 text-xs text-ink-3">
        Asar is an early platform, not a registered charity. No money moves through it: every gift
        happens on the receiving organization&apos;s own official website. We track pledges and
        self-reported impact, and we&apos;re growing our network of verified partners.
      </p>
    </footer>
  );
}
