"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input, cx } from "@/components/ui";
import { signInAction, signUpAction, type AuthState } from "./actions";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden className="animate-spin">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path
        d="M8 1.5A6.5 6.5 0 0 1 14.5 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * A password box with a reveal toggle.
 *
 * This is built out of a bare label rather than the shared `Field`
 * because `Field` wraps its children in the `<label>` itself — and a
 * button inside a label also activates the label's control, so the toggle
 * would fight the input for the click.
 */
function PasswordField({
  label,
  name,
  autoComplete,
  hint,
  minLength,
}: {
  label: string;
  name: string;
  autoComplete: string;
  hint?: string;
  minLength?: number;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          className="pr-16"
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          // The input already announces itself; this button only needs to
          // say what it does, and whether the password is currently visible.
          aria-pressed={shown}
          className="absolute inset-y-0 right-0 rounded-lg px-4 text-xs font-semibold text-ink-2 transition hover:text-primary-600"
        >
          {shown ? "Hide" : "Show"}
        </button>
      </div>
      {hint ? <p className="mt-1.5 text-sm text-ink-2">{hint}</p> : null}
    </div>
  );
}

function Feedback({ state }: { state: AuthState }) {
  if (!state.notice && !state.error) return null;

  const isNotice = Boolean(state.notice);
  return (
    <p
      role={isNotice ? "status" : "alert"}
      className={cx(
        "flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm",
        isNotice ? "bg-success-100 text-success" : "bg-danger-100 text-danger",
      )}
    >
      <span aria-hidden className="mt-px shrink-0 font-semibold">
        {isNotice ? "✓" : "!"}
      </span>
      <span>{state.notice ?? state.error}</span>
    </p>
  );
}

function Heading({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="font-display text-[2rem] leading-tight text-ink">{title}</h1>
      <p className="mt-2 text-ink-2">{children}</p>
    </div>
  );
}

function SwitchPrompt({ href, lead, cta }: { href: string; lead: string; cta: string }) {
  return (
    <p className="mt-7 border-t border-line pt-6 text-center text-sm text-ink-2">
      {lead}{" "}
      <Link
        href={href}
        className="font-semibold text-primary-600 underline underline-offset-4 transition hover:text-primary-500"
      >
        {cta}
      </Link>
    </p>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signInAction, {});

  return (
    <div>
      <Heading title="Welcome back">Sign in to run your mission.</Heading>

      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <Field label="Email">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            placeholder="you@example.com"
          />
        </Field>

        <PasswordField label="Password" name="password" autoComplete="current-password" />

        <Feedback state={state} />
        <SubmitButton label="Sign in" pendingLabel="Signing you in…" />
      </form>

      <SwitchPrompt href="/register" lead="New here?" cta="Create an account" />
    </div>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signUpAction, {});

  return (
    <div>
      <Heading title="Create your Asar">
        You only need an account to <em>create</em> a mission. Friends who join yours never do.
      </Heading>

      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <Field label="What should we call you?">
          <Input
            name="displayName"
            autoComplete="name"
            required
            autoFocus
            placeholder="Ayesha"
            maxLength={60}
          />
        </Field>

        <Field label="Email">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </Field>

        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          hint="At least 8 characters."
        />

        <Field label="Your birthday" optional hint="We'll pre-fill your mission countdown.">
          <Input name="birthday" type="date" />
        </Field>

        <Feedback state={state} />
        <SubmitButton label="Create my account" pendingLabel="Creating your account…" />
      </form>

      <SwitchPrompt href="/login" lead="Already have an account?" cta="Sign in" />
    </div>
  );
}
