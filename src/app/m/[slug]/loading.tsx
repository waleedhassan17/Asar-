import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <LoadingStatus label="Loading this mission…" />
      <section className="border-b border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-5 pb-10 pt-12">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="mt-4 h-4 w-40" />
          <Skeleton className="mt-3 h-10 w-full max-w-xl" />
          <Skeleton className="mt-4 h-5 w-56" />
          <Skeleton className="mt-8 h-14 w-72 rounded-pill" />
        </div>
      </section>
      <main className="mx-auto w-full max-w-5xl space-y-6 px-5 py-10">
        <Skeleton className="h-44 rounded-card" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-32 rounded-card" />
          <Skeleton className="h-32 rounded-card" />
          <Skeleton className="h-32 rounded-card" />
        </div>
      </main>
    </div>
  );
}
