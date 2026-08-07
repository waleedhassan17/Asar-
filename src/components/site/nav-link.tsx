"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

/**
 * A header link that knows whether you are on it.
 *
 * The header had no current-page indication at all — six links of
 * identical weight, so the only way to know where you were was to read
 * the page. A small client leaf is the whole cost of fixing that; the
 * header itself stays a Server Component.
 */
export function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  // Section match, so /give/edhi-foundation still lights up "Give".
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "rounded-full px-2.5 py-2 text-sm font-medium whitespace-nowrap transition sm:px-3",
        active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}
