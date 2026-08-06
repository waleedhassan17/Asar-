import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-24">
      <LoadingStatus label="Opening the reveal…" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-6 h-24 w-72" />
      <Skeleton className="mt-6 h-6 w-56" />
      <Skeleton className="mt-10 h-12 w-48 rounded-pill" />
    </main>
  );
}
