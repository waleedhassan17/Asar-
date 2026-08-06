import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <LoadingStatus label="Loading your mission dashboard…" />
      <Skeleton className="h-9 w-72" />
      <Skeleton className="mt-3 h-5 w-56" />
      <Skeleton className="mt-6 h-11 w-80 rounded-pill" />
      <Skeleton className="mt-8 h-44 rounded-card" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
      </div>
    </main>
  );
}
