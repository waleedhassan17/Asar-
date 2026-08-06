"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { Logo } from "@/components/brand/logo";

/**
 * The catch-all for anything that throws while rendering. A person who
 * clicked a birthday link should never meet a stack trace or a white
 * page — they get a calm explanation and a way onward.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is all that reaches the server logs in production; log the
    // rest here so a developer opening the console sees the real thing.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-5 py-20">
      <Card className="w-full p-8 text-center">
        <Logo variant="tile" size={52} className="mx-auto" />
        <h1 className="mt-6 font-display text-2xl text-ink">Something went wrong</h1>
        <p className="mt-3 text-ink-2">
          Not your fault, and nothing was lost. Try again — if it keeps happening, the link may be
          out of date.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-ink-3">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/">
            <Button variant="outline">Back to Asar</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
