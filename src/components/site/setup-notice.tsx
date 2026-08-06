import { Card } from "@/components/ui";
import { missingSupabaseEnv } from "@/lib/env";

export function SetupNotice() {
  // Naming the absent variables rather than all three saves the next
  // person from re-checking the two they already set. On a hosted deploy
  // the file to edit is the platform's environment settings, not
  // `.env.local`, and the keys have to be present before the build.
  const missing = missingSupabaseEnv();

  return (
    <Card className="mx-auto my-16 max-w-xl p-8">
      <h1 className="font-display text-2xl text-ink">Asar isn&apos;t connected yet</h1>
      <p className="mt-3 text-ink-2">
        Create a Supabase project, run the migrations in <code>supabase/migrations</code>, then add{" "}
        {missing.length === 1 ? "this" : "these"} to <code>.env.local</code> — or to your host&apos;s
        environment variables, followed by a rebuild:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-surface-2 p-4 text-sm text-ink-2">
        {missing.map((name) => `${name}=...`).join("\n")}
      </pre>
      <p className="mt-4 text-sm text-ink-2">
        Full walkthrough in <code>README.md</code>.
      </p>
    </Card>
  );
}
