"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { submitContactMessage, type ContactState } from "./contact-actions";

const TOPICS: [string, string][] = [
  ["help", "I want to help build Asar"],
  ["verify", "I can help check that causes are trustworthy"],
  ["mentor", "I'd like to mentor students"],
  ["other", "Something else"],
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Send message"}
    </Button>
  );
}

/**
 * The "Get in touch" form.
 *
 * This replaced a `mailto:` link, which did nothing at all for anyone
 * without a mail client configured — the common case on a phone browser,
 * and the reported bug. The message now lands in the database and shows
 * up on the admin dashboard.
 *
 * Collapsed to a button until it is wanted, so the band stays a band and
 * does not turn the page into a form.
 */
export function ContactForm({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ContactState, FormData>(submitContactMessage, {});

  if (state.ok) {
    return (
      <div
        role="status"
        className={cx("rounded-card border border-line bg-surface p-6 text-center", className)}
      >
        <p className="font-display text-xl text-ink">Thank you — that reached us.</p>
        <p className="mx-auto mt-2 max-w-md text-ink-2">
          We read everything that comes through here. You&apos;ll get a reply at the address you
          gave, from a real person, though it may take a few days.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className={className}>
        <Button size="lg" onClick={() => setOpen(true)}>
          Get in touch
        </Button>
      </div>
    );
  }

  return (
    <form
      action={action}
      className={cx("mx-auto max-w-xl rounded-card border border-line bg-surface p-6 text-left", className)}
    >
      <div className="space-y-4">
        <Field label="Your name">
          <Input name="name" required maxLength={80} autoFocus placeholder="Ayesha" />
        </Field>

        <Field label="Your email" hint="So we can reply. Nothing else is done with it.">
          <Input
            name="email"
            type="email"
            required
            maxLength={200}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="What brings you here?">
          <Select name="topic" defaultValue="help">
            {TOPICS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Your message">
          <Textarea
            name="message"
            required
            rows={5}
            minLength={10}
            maxLength={4000}
            placeholder="A sentence or two about how you'd like to help…"
          />
        </Field>

        {state.error ? (
          <p role="alert" className="rounded-lg bg-danger-100 px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        ) : null}

        <SubmitButton />
      </div>
    </form>
  );
}
