"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Field, Input, Textarea, cx } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { breakdownDuration, plural, tidyNumber } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import type { Accent, MissionTemplate, MissionTone, MissionVisibility } from "@/lib/types";
import { createMissionAction } from "./actions";

const ICONS = ["🍲", "🌳", "🎓", "🩸", "📚", "💧", "🏥", "🐾", "🧥", "🏠", "🎁", "✨"];
const ACCENTS: Accent[] = ["ember", "gold", "sage", "violet", "rose"];

const VISIBILITY_OPTIONS: {
  value: MissionVisibility;
  title: string;
  body: string;
  icon: string;
}[] = [
  {
    value: "public",
    title: "Public",
    body: "Anyone with the link can open it, and it can be found on Asar.",
    icon: "🌍",
  },
  {
    value: "link",
    title: "Link only",
    body: "Only people you send the secret link to can see it.",
    icon: "🔗",
  },
  {
    value: "friends",
    title: "Friends only",
    body: "Same secret link, but framed for a small circle.",
    icon: "👋",
  },
];

/**
 * M-04 / M-05. The birthday date is chosen in the visitor's timezone, so
 * the reveal instant has to be computed here rather than on the server:
 * 9am on the day if that's still ahead, otherwise the end of the day, and
 * if the birthday is already over the SQL side drops into sprint mode.
 */
function computeRevealAt(birthday: string): string {
  const [y, m, d] = birthday.split("-").map(Number);
  if (!y || !m || !d) return new Date(Date.now() + 86_400_000).toISOString();

  const morning = new Date(y, m - 1, d, 9, 0, 0, 0);
  if (morning.getTime() > Date.now()) return morning.toISOString();

  const endOfDay = new Date(y, m - 1, d, 23, 59, 0, 0);
  if (endOfDay.getTime() > Date.now()) return endOfDay.toISOString();

  return new Date(Date.now() + 24 * 3600 * 1000).toISOString();
}

interface DraftState {
  templateSlug: string | null;
  title: string;
  story: string;
  icon: string;
  accent: Accent;
  unitSingular: string;
  unitPlural: string;
  actionVerb: string;
  livesPerUnit: number;
  increments: number[];
  goal: number;
  birthday: string;
  visibility: MissionVisibility;
  tone: MissionTone;
  allowWishOnly: boolean;
  allowExternalGive: boolean;
}

const STEPS = ["Mission", "Details", "The day", "Sharing"] as const;

export function MissionBuilder({
  templates,
  defaultBirthday,
  presetSlug,
  ownerName,
}: {
  templates: MissionTemplate[];
  defaultBirthday: string | null;
  presetSlug?: string;
  ownerName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const preset = templates.find((t) => t.slug === presetSlug) ?? null;

  const [draft, setDraft] = useState<DraftState>(() => ({
    templateSlug: preset?.slug ?? null,
    title: preset ? `${preset.title} for my birthday` : "",
    story: "",
    icon: preset?.icon ?? "✨",
    accent: (preset?.accent as Accent) ?? "ember",
    unitSingular: preset?.unit_singular ?? "",
    unitPlural: preset?.unit_plural ?? "",
    actionVerb: preset?.action_verb ?? "fund",
    livesPerUnit: preset?.lives_per_unit ?? 1,
    increments: preset?.increments ?? [1, 2, 5],
    goal: preset?.default_goal ?? 50,
    birthday: defaultBirthday ?? "",
    visibility: "public",
    tone: "playful",
    allowWishOnly: true,
    allowExternalGive: true,
  }));

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function chooseTemplate(template: MissionTemplate | null) {
    if (!template) {
      setDraft((d) => ({
        ...d,
        templateSlug: null,
        title: d.templateSlug ? "" : d.title,
        unitSingular: d.templateSlug ? "" : d.unitSingular,
        unitPlural: d.templateSlug ? "" : d.unitPlural,
        actionVerb: "complete",
        livesPerUnit: 1,
        increments: [1, 2, 5],
        icon: "✨",
      }));
      return;
    }
    setDraft((d) => ({
      ...d,
      templateSlug: template.slug,
      title: `${template.title} for my birthday`,
      icon: template.icon,
      accent: template.accent,
      unitSingular: template.unit_singular,
      unitPlural: template.unit_plural,
      actionVerb: template.action_verb,
      livesPerUnit: template.lives_per_unit,
      increments: template.increments,
      goal: template.default_goal,
    }));
  }

  const now = useNow();

  // Null until mounted, so the preview below simply doesn't render during
  // SSR rather than rendering a countdown from the server's clock.
  const timeLeft = useMemo(() => {
    if (!draft.birthday || now === null) return null;
    return breakdownDuration(new Date(computeRevealAt(draft.birthday)).getTime() - now);
  }, [draft.birthday, now]);

  const sprint = timeLeft && timeLeft.days < 2 ? timeLeft : null;

  const stepValid = useMemo(() => {
    if (step === 0) return draft.templateSlug !== null || draft.title.trim().length > 0 || true;
    if (step === 1) {
      return (
        draft.title.trim().length >= 3 &&
        draft.unitSingular.trim().length > 0 &&
        draft.unitPlural.trim().length > 0 &&
        draft.goal >= 1
      );
    }
    if (step === 2) return /^\d{4}-\d{2}-\d{2}$/.test(draft.birthday);
    return true;
  }, [step, draft]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createMissionAction({
        template_slug: draft.templateSlug,
        title: draft.title.trim(),
        headline: draft.tone === "serious" ? "Join my purpose" : "Join my purpose 🎉",
        story: draft.story.trim() || undefined,
        icon: draft.icon,
        unit_singular: draft.unitSingular.trim(),
        unit_plural: draft.unitPlural.trim(),
        action_verb: draft.actionVerb.trim() || "complete",
        lives_per_unit: draft.livesPerUnit,
        goal_amount: draft.goal,
        birthday_date: draft.birthday,
        reveal_at: computeRevealAt(draft.birthday),
        visibility: draft.visibility,
        tone: draft.tone,
        accent: draft.accent,
        allow_wish_only: draft.allowWishOnly,
        allow_external_give: draft.allowExternalGive,
        increments: draft.increments,
      });

      if (!result.ok || !result.slug) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      toast("Your mission is live 🎉", "success");
      router.push(`/dashboard/${result.slug}?created=1`);
    });
  }

  return (
    <div data-accent={draft.accent}>
      {/* Step rail */}
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={cx(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition",
                i < step && "bg-accent text-white",
                i === step && "bg-ink text-white",
                i > step && "bg-surface-2 text-ink-3",
              )}
            >
              {i < step ? "✓" : i + 1}
            </button>
            <span
              className={cx(
                "hidden text-sm font-medium sm:block",
                i === step ? "text-ink" : "text-ink-3",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-line" /> : null}
          </li>
        ))}
      </ol>

      {/* ------------------------------------------------------------- */}
      {/* Step 1 — mission selector (M-01) / custom builder (M-02)       */}
      {/* ------------------------------------------------------------- */}
      {step === 0 ? (
        <section>
          <h1 className="font-display text-3xl text-ink">What are you asking people to join?</h1>
          <p className="mt-2 text-ink-2">
            Pick a mission to start from, or write your own goal in your own units.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {templates.map((t) => {
              const active = draft.templateSlug === t.slug;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => chooseTemplate(t)}
                  data-accent={t.accent}
                  className={cx(
                    "rounded-card border p-5 text-left transition",
                    active
                      ? "border-accent bg-accent-wash shadow-soft"
                      : "border-line bg-surface hover:border-ink-3",
                  )}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <p className="mt-3 font-semibold text-ink">{t.title}</p>
                  {t.blurb ? <p className="mt-1 text-sm text-ink-2">{t.blurb}</p> : null}
                  <p className="mt-3 text-xs font-medium text-ink-3">
                    default: {t.default_goal} {t.unit_plural}
                  </p>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => chooseTemplate(null)}
              className={cx(
                "rounded-card border border-dashed p-5 text-left transition",
                draft.templateSlug === null
                  ? "border-ink bg-surface-2"
                  : "border-line hover:border-ink-3",
              )}
            >
              <span className="text-2xl">✍️</span>
              <p className="mt-3 font-semibold text-ink">Write my own</p>
              <p className="mt-1 text-sm text-ink-2">
                “50 books donated”, “30 winter coats”, anything you can count.
              </p>
            </button>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* Step 2 — details                                               */}
      {/* ------------------------------------------------------------- */}
      {step === 1 ? (
        <section className="space-y-5">
          <h1 className="font-display text-3xl text-ink">Shape the mission</h1>

          <Field label="Mission name" hint="This is the headline on your page.">
            <Input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={120}
              placeholder="Feed 100 people for my 25th"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Goal">
              <Input
                type="number"
                min={1}
                max={1000000}
                value={draft.goal}
                onChange={(e) => set("goal", Math.max(1, Number(e.target.value) || 1))}
              />
            </Field>

            <Field label="One of them is called…" hint="Singular, e.g. “meal”.">
              <Input
                value={draft.unitSingular}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    unitSingular: v,
                    unitPlural: d.unitPlural.trim() ? d.unitPlural : v ? `${v}s` : "",
                  }));
                }}
                maxLength={40}
                placeholder="meal"
              />
            </Field>

            <Field label="Many of them are called…" hint="Plural, e.g. “meals”.">
              <Input
                value={draft.unitPlural}
                onChange={(e) => set("unitPlural", e.target.value)}
                maxLength={40}
                placeholder="meals"
              />
            </Field>

            <Field label="Friends will…" hint="The verb in “I'll ___ 5 meals”.">
              <Input
                value={draft.actionVerb}
                onChange={(e) => set("actionVerb", e.target.value)}
                maxLength={40}
                placeholder="fund"
              />
            </Field>
          </div>

          <Field
            label="Why this mission?"
            optional
            hint="A couple of honest sentences do more than a paragraph of pitch."
          >
            <Textarea
              rows={4}
              maxLength={2000}
              value={draft.story}
              onChange={(e) => set("story", e.target.value)}
              placeholder="I've been volunteering at a soup kitchen near my university, and…"
            />
          </Field>

          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Icon</p>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => set("icon", icon)}
                  className={cx(
                    "grid h-11 w-11 place-items-center rounded-lg border text-xl transition",
                    draft.icon === icon
                      ? "border-accent bg-accent-wash"
                      : "border-line hover:border-ink-3",
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Colour</p>
            <div className="flex gap-2">
              {ACCENTS.map((accent) => (
                <button
                  key={accent}
                  type="button"
                  aria-label={accent}
                  onClick={() => set("accent", accent)}
                  data-accent={accent}
                  className={cx(
                    "h-9 w-9 rounded-full bg-accent transition",
                    draft.accent === accent
                      ? "ring-2 ring-ink ring-offset-2 ring-offset-paper"
                      : "opacity-70 hover:opacity-100",
                  )}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* Step 3 — the day (M-03, M-04, M-05)                            */}
      {/* ------------------------------------------------------------- */}
      {step === 2 ? (
        <section className="space-y-5">
          <h1 className="font-display text-3xl text-ink">When&apos;s the big day?</h1>
          <p className="text-ink-2">
            Your mission starts the moment you create it and counts down to this date. That&apos;s
            when the reveal unlocks.
          </p>

          <Field label="Birthday">
            <Input
              type="date"
              value={draft.birthday}
              onChange={(e) => set("birthday", e.target.value)}
            />
          </Field>

          {draft.birthday && timeLeft ? (
            <Card className="p-5">
              {sprint ? (
                <>
                  <Badge tone="gold">Sprint mode</Badge>
                  <p className="mt-3 text-ink">
                    That&apos;s{" "}
                    <strong className="nums">
                      {sprint.days > 0
                        ? `${sprint.days} ${plural(sprint.days, "day", "days")} and `
                        : ""}
                      {sprint.hours} {plural(sprint.hours, "hour", "hours")}
                    </strong>{" "}
                    away.
                  </p>
                  <p className="mt-2 text-sm text-ink-2">
                    Short missions work — the page switches to an hours-and-minutes countdown, and
                    small asks like “1 meal” do the heavy lifting.
                  </p>
                </>
              ) : (
                <>
                  <Badge tone="success">Plenty of runway</Badge>
                  <p className="mt-3 text-ink">
                    <strong className="nums">{timeLeft.days} days</strong> to gather your people.
                  </p>
                  <p className="mt-2 text-sm text-ink-2">
                    The reveal unlocks at 9am on the day. Nobody sees the “Because of you” summary
                    before then — not even you, unless you preview it.
                  </p>
                </>
              )}
            </Card>
          ) : null}
        </section>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* Step 4 — sharing & tone (M-06, §8)                             */}
      {/* ------------------------------------------------------------- */}
      {step === 3 ? (
        <section className="space-y-6">
          <h1 className="font-display text-3xl text-ink">Who gets to see it?</h1>

          <div className="grid gap-3 sm:grid-cols-3">
            {VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => set("visibility", option.value)}
                className={cx(
                  "rounded-card border p-5 text-left transition",
                  draft.visibility === option.value
                    ? "border-accent bg-accent-wash"
                    : "border-line hover:border-ink-3",
                )}
              >
                <span className="text-xl">{option.icon}</span>
                <p className="mt-2 font-semibold text-ink">{option.title}</p>
                <p className="mt-1 text-sm text-ink-2">{option.body}</p>
              </button>
            ))}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Tone of the page</p>
            <div className="flex gap-3">
              {(
                [
                  ["playful", "Playful 🎉", "Confetti, emoji, celebration."],
                  ["serious", "Understated", "Quiet, plain, no fanfare."],
                ] as const
              ).map(([value, label, body]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("tone", value)}
                  className={cx(
                    "flex-1 rounded-card border p-4 text-left transition",
                    draft.tone === value
                      ? "border-accent bg-accent-wash"
                      : "border-line hover:border-ink-3",
                  )}
                >
                  <p className="font-semibold text-ink">{label}</p>
                  <p className="mt-1 text-sm text-ink-2">{body}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <ToggleRow
              checked={draft.allowWishOnly}
              onChange={(v) => set("allowWishOnly", v)}
              title="Let people leave a wish without doing anything"
              body="Strongly recommended. It's what stops the page feeling like a demand."
            />
            <ToggleRow
              checked={draft.allowExternalGive}
              onChange={(v) => set("allowExternalGive", v)}
              title="Allow give-links to somewhere I trust"
              body="You can add links after creating the mission. Asar never handles the money."
            />
          </div>

          <Card className="p-5">
            <p className="text-sm font-semibold text-ink">Ready to go live</p>
            <p className="mt-2 text-sm text-ink-2">
              <span className="text-lg">{draft.icon}</span> {draft.title || "Your mission"} —{" "}
              <strong className="nums">{tidyNumber(draft.goal)}</strong>{" "}
              {plural(draft.goal, draft.unitSingular || "action", draft.unitPlural || "actions")},
              revealed on your birthday for {ownerName}&apos;s friends.
            </p>
          </Card>
        </section>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-lg bg-danger-100 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
        >
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!stepValid} size="lg">
            Continue
          </Button>
        ) : (
          <Button onClick={submit} disabled={pending} size="lg" variant="accent">
            {pending ? "Creating…" : "Launch my mission"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  checked,
  onChange,
  title,
  body,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  body: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-card border border-line p-4 transition hover:border-ink-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
      />
      <span>
        <span className="block font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-2">{body}</span>
      </span>
    </label>
  );
}
