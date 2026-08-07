import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { joinUs } from "@/lib/copy";

/**
 * The footer was one flat row of six links of equal weight, with the
 * money disclaimer trailing underneath as grey afterthought text.
 *
 * Two problems with that. Six undifferentiated links are a list to read
 * rather than a map to scan — they group naturally into "what Asar is",
 * "what you can do", and "how to check us". And the disclaimer is the
 * single most consequential sentence on the site: it is the promise that
 * no money moves through Asar, and it was set smaller and greyer than the
 * navigation.
 */

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Asar",
    links: [
      { label: "Our story", href: "/about" },
      { label: "How it works", href: "/how-it-works" },
    ],
  },
  {
    heading: "Take part",
    links: [
      { label: "Start a mission", href: "/create" },
      { label: "My missions", href: "/dashboard" },
      { label: "Donation directory", href: "/give" },
    ],
  },
  {
    heading: "Check us",
    links: [
      { label: "Transparency log", href: "/transparency" },
      { label: "Get in touch", href: "/about#join" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface-2">
      <div className="mx-auto w-full max-w-6xl px-5 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo size={30} />
            <p className="mt-4 text-sm leading-relaxed text-ink-2">
              A birthday is a good excuse to do something that lasts.
            </p>
            <p className="mt-4 text-sm text-ink-3">{joinUs.micro}</p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <p className="text-xs font-semibold tracking-wide text-ink uppercase">
                {column.heading}
              </p>
              <ul className="mt-3 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-2 underline-offset-4 transition hover:text-primary-600 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* The promise, given a surface of its own rather than trailing
            off the bottom in grey. This is the sentence the whole product
            is accountable to. */}
        <div className="mt-12 rounded-card border border-line bg-surface p-5">
          <p className="text-sm leading-relaxed text-ink-2">
            <strong className="font-semibold text-ink">
              Asar is an early platform, not a registered charity.
            </strong>{" "}
            No money moves through it: every gift happens on the receiving organisation&apos;s own
            official website. We track pledges and self-reported impact, and we&apos;re growing our
            network of verified partners.
          </p>
        </div>

        <p className="mt-6 text-xs text-ink-3">
          © {new Date().getFullYear()} Asar · Built by Muhammad Waleed Hassan
        </p>
      </div>
    </footer>
  );
}
