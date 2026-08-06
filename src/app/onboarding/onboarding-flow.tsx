"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Avatar, Button, Field, Input, cx } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import type { MissionTemplate } from "@/lib/types";
import { completeOnboarding, saveOnboardingProfile } from "./actions";

const STEPS = ["You", "Your why", "Ready"] as const;

/**
 * Three steps, one decision each.
 *
 * Transitions use the existing `animate-rise` token rather than a motion
 * library: this codebase animates with CSS keyframes throughout, and the
 * global prefers-reduced-motion block in globals.css already neutralises
 * them for anyone who asked. Re-keying the panel on the step index is
 * what replays the animation.
 *
 * Nothing here is a gate. Skip stamps `onboarded_at` exactly like Finish
 * does, so a person who does not want a wizard is not asked twice.
 */
export function OnboardingFlow({
  templates,
  initialName,
  initialBirthday,
  initialAvatar,
}: {
  templates: MissionTemplate[];
  initialName: string;
  initialBirthday: string | null;
  initialAvatar: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName === "Friend" ? "" : initialName);
  const [birthday, setBirthday] = useState(initialBirthday ?? "");
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [uploading, setUploading] = useState(false);
  const [cause, setCause] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chosen = templates.find((t) => t.slug === cause) ?? null;

  async function uploadAvatar(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "That didn't upload.");
      setAvatar(data.url);
      toast("Picture saved.", "success");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "That didn't upload.", "warn");
    } finally {
      setUploading(false);
    }
  }

  function goToWhy() {
    setError(null);
    startTransition(async () => {
      const result = await saveOnboardingProfile({
        displayName: name,
        birthday: birthday || undefined,
        avatarUrl: avatar ?? "",
      });
      if (!result.ok) {
        setError(result.error ?? "Please check the form.");
        return;
      }
      setStep(1);
    });
  }

  function finish(destination: string) {
    startTransition(async () => {
      await completeOnboarding();
      router.push(destination);
    });
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4">
        <Logo size={30} />
        <button
          type="button"
          onClick={() => finish("/dashboard")}
          disabled={pending}
          className="text-sm text-ink-2 underline-offset-4 transition hover:text-primary-600 hover:underline"
        >
          Skip for now
        </button>
      </div>

      {/* Progress dots. Completed steps go back; future ones don't jump. */}
      <ol className="mt-8 flex items-center gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i >= step}
              aria-current={i === step ? "step" : undefined}
              className={cx(
                "h-1.5 rounded-pill transition-all duration-500",
                i === step ? "w-8 bg-primary-500" : i < step ? "w-4 bg-primary-500/50" : "w-4 bg-line",
              )}
            >
              <span className="sr-only">{label}</span>
            </button>
          </li>
        ))}
        <li className="ml-2 text-xs font-medium tracking-wide text-ink-3 uppercase">
          {STEPS[step]}
        </li>
      </ol>

      <div key={step} className="animate-rise mt-8">
        {step === 0 ? (
          <section>
            <h1 className="font-display text-3xl text-ink">First, the basics</h1>
            <p className="mt-2 text-ink-2">
              Your name goes on the mission page your friends will open. The birthday sets the
              countdown — you can change both later.
            </p>

            <div className="mt-7 flex items-center gap-4">
              <Avatar name={name || "Friend"} size={64} src={avatar} />
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadAvatar(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? "Uploading…" : avatar ? "Change picture" : "Add a picture"}
                </Button>
                <p className="mt-1.5 text-xs text-ink-3">Optional. JPEG, PNG or WebP, up to 2 MB.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <Field label="What should we call you?">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  maxLength={60}
                  placeholder="Ayesha"
                />
              </Field>
              <Field label="Your birthday" optional hint="This becomes your mission's countdown.">
                <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
              </Field>
            </div>

            {error ? (
              <p role="alert" className="mt-4 rounded-lg bg-danger-100 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <Button size="lg" className="mt-7 w-full" onClick={goToWhy} disabled={pending}>
              {pending ? "Saving…" : "Continue"}
            </Button>
          </section>
        ) : step === 1 ? (
          <section>
            <h1 className="font-display text-3xl text-ink">What are you asking for?</h1>
            <p className="mt-2 text-ink-2">
              Pick something to start from, or write your own goal in your own units. Nothing is
              locked in — this just decides what your first mission page looks like.
            </p>

            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {templates.map((template) => (
                <li key={template.slug}>
                  <button
                    type="button"
                    onClick={() => setCause(template.slug)}
                    data-accent={template.accent}
                    className={cx(
                      "w-full rounded-card border p-4 text-left transition",
                      cause === template.slug
                        ? "border-accent bg-accent-wash"
                        : "border-line bg-surface hover:border-primary-500/50",
                    )}
                  >
                    <span className="text-2xl" aria-hidden>
                      {template.icon}
                    </span>
                    <p className="mt-2 font-semibold text-ink">{template.title}</p>
                    <p className="mt-1 text-sm text-ink-2">{template.blurb}</p>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => setCause("__custom__")}
                  className={cx(
                    "h-full w-full rounded-card border border-dashed p-4 text-left transition",
                    cause === "__custom__"
                      ? "border-primary-500 bg-primary-100"
                      : "border-line hover:border-primary-500/50",
                  )}
                >
                  <span className="text-2xl" aria-hidden>
                    ✍️
                  </span>
                  <p className="mt-2 font-semibold text-ink">Something of my own</p>
                  <p className="mt-1 text-sm text-ink-2">
                    Your own goal, your own unit — blankets, books, anything countable.
                  </p>
                </button>
              </li>
            </ul>

            <div className="mt-7 flex gap-3">
              <Button variant="outline" size="lg" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button size="lg" className="flex-1" onClick={() => setStep(2)} disabled={!cause}>
                Continue
              </Button>
            </div>
          </section>
        ) : (
          <section>
            <h1 className="font-display text-3xl text-ink">You&apos;re ready, {name || "friend"}.</h1>
            <p className="mt-2 text-ink-2">
              That&apos;s everything Asar needs. Creating the mission takes about two minutes, and
              your friends won&apos;t need an account to join it.
            </p>

            <dl className="mt-7 space-y-3 rounded-card border border-line bg-surface-2 p-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">Name</dt>
                <dd className="font-medium text-ink">{name || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">Birthday</dt>
                <dd className="font-medium text-ink">
                  {birthday ? formatDate(birthday) : "Not set yet"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">Starting from</dt>
                <dd className="font-medium text-ink">
                  {chosen ? (
                    <>
                      <span aria-hidden>{chosen.icon}</span> {chosen.title}
                    </>
                  ) : (
                    "A goal of your own"
                  )}
                </dd>
              </div>
            </dl>

            {!birthday ? (
              <p className="mt-4 text-sm text-ink-3">
                No birthday yet — you can pick the date while creating the mission.
              </p>
            ) : null}

            <Button
              size="lg"
              className="mt-7 w-full"
              disabled={pending}
              onClick={() =>
                finish(chosen ? `/create?template=${chosen.slug}` : "/create")
              }
            >
              {pending ? "One moment…" : "Create my mission"}
            </Button>
            <button
              type="button"
              onClick={() => finish("/dashboard")}
              disabled={pending}
              className="mt-3 w-full text-center text-sm text-ink-2 underline-offset-4 transition hover:text-primary-600 hover:underline"
            >
              Go to dashboard instead
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
