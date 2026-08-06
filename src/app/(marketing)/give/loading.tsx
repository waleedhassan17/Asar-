import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <LoadingStatus label="Loading the directory…" />
      <Skeleton className="h-[22rem] rounded-none" />
      <div className="mx-auto w-full max-w-6xl px-5 py-10">
        <Skeleton className="h-20 rounded-card" />
        <div className="mt-8 flex gap-2">
          <Skeleton className="h-8 w-16 rounded-pill" />
          <Skeleton className="h-8 w-20 rounded-pill" />
          <Skeleton className="h-8 w-24 rounded-pill" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64 rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
