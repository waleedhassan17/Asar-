import { Card } from "@/components/ui";

export function SetupNotice() {
  return (
    <Card className="mx-auto my-16 max-w-xl p-8">
      <h1 className="font-display text-2xl text-ink">Asar isn&apos;t connected yet</h1>
      <p className="mt-3 text-ink-2">
        Create a Supabase project, run the migrations in <code>supabase/migrations</code>, then add
        these to <code>.env.local</code>:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-surface-2 p-4 text-sm text-ink-2">
        {`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...`}
      </pre>
      <p className="mt-4 text-sm text-ink-2">
        Full walkthrough in <code>README.md</code>.
      </p>
    </Card>
  );
}
