import { cx } from "@/components/ui";

/**
 * Loading placeholders. Deliberately still — a shimmer on a page about
 * someone's birthday reads as noise, and `prefers-reduced-motion` users
 * would lose it anyway. Every skeleton is `aria-hidden` with a single
 * polite status message alongside it, so a screen reader hears "loading"
 * once instead of a wall of empty boxes.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("rounded-md bg-surface-2", className)} />;
}

export function LoadingStatus({ label = "Loading…" }: { label?: string }) {
  return (
    <span className="sr-only" role="status">
      {label}
    </span>
  );
}

/** The header/hero shape most pages open with. */
export function PageSkeleton({ label }: { label?: string }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <LoadingStatus label={label} />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-5 w-80" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </main>
  );
}
