import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid min-h-screen flex-1 grid-rows-[auto_1fr] lg:grid-cols-[minmax(30rem,44rem)_1fr] lg:grid-rows-1">
      <Skeleton className="h-40 rounded-none sm:h-52 lg:order-2 lg:h-auto" />
      <div className="flex flex-col bg-surface-2 px-5 py-8 sm:px-10 lg:order-1 lg:px-14 lg:py-10">
        <LoadingStatus label="Getting things ready…" />
        <div className="flex flex-1 items-center py-6">
          <div className="mx-auto w-full max-w-xl rounded-card border border-line bg-surface p-7 shadow-md sm:p-9">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="mt-8 h-2 w-40 rounded-pill" />
            <Skeleton className="mt-8 h-9 w-64" />
            <Skeleton className="mt-3 h-5 w-full" />
            <Skeleton className="mt-7 h-16 w-full rounded-card" />
            <Skeleton className="mt-6 h-12 w-full rounded-lg" />
            <Skeleton className="mt-4 h-12 w-full rounded-lg" />
            <Skeleton className="mt-7 h-13 w-full rounded-pill" />
          </div>
        </div>
      </div>
    </div>
  );
}
