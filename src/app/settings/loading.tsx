import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <LoadingStatus label="Loading your settings…" />
      <Skeleton className="h-9 w-40" />
      <Skeleton className="mt-3 h-5 w-64" />
      <Skeleton className="mt-8 h-72 rounded-card" />
      <Skeleton className="mt-4 h-48 rounded-card" />
    </main>
  );
}
