"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input } from "@/components/ui";
import { GlassCard } from "@/components/brand/glass-card";
import { Logo } from "@/components/brand/logo";
import { signInAction, signUpAction, type AuthState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "One moment…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: AuthState }) {
  if (state.notice) {
    return (
      <p className="rounded-lg bg-success-100 px-4 py-3 text-sm text-success" role="status">
        {state.notice}
      </p>
    );
  }
  if (state.error) {
    return (
      <p className="rounded-lg bg-danger-100 px-4 py-3 text-sm text-danger" role="alert">
        {state.error}
      </p>
    );
  }
  return null;
}

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signInAction, {});

  return (
    <GlassCard className="p-7 sm:p-8">
      <Logo variant="tile" size={44} />
      <h1 className="mt-5 font-display text-2xl text-ink">Welcome back</h1>
      <p className="mt-2 text-sm text-ink-2">Sign in to run your mission.</p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />

        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </Field>

        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>

        <Feedback state={state} />
        <SubmitButton label="Sign in" />
      </form>

      <p className="mt-6 text-center text-sm text-ink-2">
        New here?{" "}
        <Link href="/register" className="font-semibold text-primary-600 underline">
          Create an account
        </Link>
      </p>
    </GlassCard>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signUpAction, {});

  return (
    <GlassCard className="p-7 sm:p-8">
      <Logo variant="tile" size={44} />
      <h1 className="mt-5 font-display text-2xl text-ink">Create your Asar</h1>
      <p className="mt-2 text-sm text-ink-2">
        You only need an account to <em>create</em> a mission. Friends who join yours never do.
      </p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />

        <Field label="What should we call you?">
          <Input name="displayName" autoComplete="name" required placeholder="Ayesha" maxLength={60} />
        </Field>

        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </Field>

        <Field label="Password" hint="At least 8 characters.">
          <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>

        <Field label="Your birthday" optional hint="We'll pre-fill your mission countdown.">
          <Input name="birthday" type="date" />
        </Field>

        <Feedback state={state} />
        <SubmitButton label="Create my account" />
      </form>

      <p className="mt-6 text-center text-sm text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary-600 underline">
          Sign in
        </Link>
      </p>
    </GlassCard>
  );
}
