import { signOutAction } from "@/app/(auth)/actions";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={
          className ??
          "rounded-full px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink"
        }
      >
        Sign out
      </button>
    </form>
  );
}
