import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <LoadingStatus label="Loading this organization…" />
      <Skeleton className="h-[20rem] rounded-none" />
      <div className="mx-auto w-full max-w-3xl px-5 py-10">
        <Skeleton className="h-24" />
        <Skeleton className="mt-8 h-40 rounded-card" />
      </div>
    </div>
  );
}
