import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";

/**
 * Shaped like the page it stands in for — badge, title, intro, then the
 * stack of cards — so the swap when data lands is a fill-in rather than a
 * relayout. The header and footer are not here on purpose: the marketing
 * layout owns them, so they stay put across the navigation instead of
 * blinking out and back.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <LoadingStatus label="Loading the transparency log…" />

      <Skeleton className="h-6 w-40 rounded-pill" />
      <Skeleton className="mt-4 h-10 w-72" />
      <Skeleton className="mt-4 h-5 w-full" />
      <Skeleton className="mt-2 h-5 w-4/5" />

      <Skeleton className="mt-8 h-64 rounded-card" />
      <Skeleton className="mt-6 h-56 rounded-card" />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
    </div>
  );
}
