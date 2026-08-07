"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Field, Input, Textarea, cx } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { BirthdayPicker } from "@/components/ui/birthday-picker";
import { getCountdown, parseLocalDate, revealAtFor } from "@/lib/countdown";
import { MissionPreview } from "./mission-preview";
import { formatDate, plural, tidyNumber } from "@/lib/format";
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
 * M-04 / M-05. The reveal instant is computed here rather than on the
 * server because the date is chosen in the visitor's timezone.
 *
 * This used to fall through to `now + 24h` whenever the chosen date had
 * already passed, which is what turned every mission into a sprint. The
 * picker now only offers real upcoming dates and the maths lives in
 * lib/countdown.ts, covered by `npm run check:countdown`.
 */
function computeRevealAt(birthday: string): string {
  const target = parseLocalDate(birthday);
  if (!target) return revealAtFor(new Date(Date.now() + 86_400_000)).toISOString();
  return revealAtFor(target).toISOString();
}

interface DraftState {
  templateSlug: string | null;
  /** Distinguishes "chose to write my own" from "hasn't chosen anything
      yet" — both leave templateSlug null. */
  customChosen: boolean;
  title: string;
  headline: string;
  impactLine: string;
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
    customChosen: false,
    title: preset ? `${preset.title} for my birthday` : "",
    headline: "",
    impactLine: "",
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
        customChosen: true,
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
      customChosen: false,
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
  const resolved = useMemo(() => {
    if (!draft.birthday || now === null) return null;
    const target = parseLocalDate(draft.birthday);
    if (!target) return null;
    const revealAt = revealAtFor(target, new Date(now));
    return {
      target,
      countdown: getCountdown(revealAt, new Date(now)),
      // True when the chosen day is in a later year than today — the
      // picker makes this visible, but say it in words too.
      rolled: target.getFullYear() > new Date(now).getFullYear(),
    };
  }, [draft.birthday, now]);

  // Sprint is now only ever "genuinely within 48 hours".
  const sprint = resolved?.countdown.isSprint ? resolved.countdown : null;

  const stepValid = useMemo(() => {
    // This used to end in `|| true`, which made the check dead code and
    // let someone reach step 1 having chosen nothing at all.
    if (step === 0) return draft.templateSlug !== null || draft.customChosen;
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
        headline:
          draft.headline.trim() ||
          (draft.tone === "serious" ? "Join my purpose" : "Join my purpose 🎉"),
        story: draft.story.trim() || undefined,
        impact_line: draft.impactLine.trim() || undefined,
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

      {/* The form on the left, the page it is building on the right.
          Re-keying on `step` is what replays animate-rise; the global
          prefers-reduced-motion block neutralises it for anyone who
          asked for less movement. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div key={step} className="animate-rise min-w-0">

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

          <Field
            label="The invitation"
            optional
            hint="The small line above the title. Left blank, it says “Join my purpose”."
          >
            <Input
              value={draft.headline}
              onChange={(e) => set("headline", e.target.value)}
              maxLength={120}
              placeholder="Join my purpose 🎉"
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
            label="What one of them means"
            optional
            hint="One sentence, shown under the tally. “Each blanket keeps someone warm this winter.”"
          >
            <Input
              value={draft.impactLine}
              onChange={(e) => set("impactLine", e.target.value)}
              maxLength={160}
              placeholder={`Each ${draft.unitSingular.trim() || "one"} means…`}
            />
          </Field>

          <Field
            label="People helped by each one"
            optional
            hint="Usually 1. Some actions reach more than one person — a blood donation can help three."
          >
            <Input
              type="number"
              min={0}
              max={1000}
              step="0.1"
              value={draft.livesPerUnit}
              onChange={(e) => set("livesPerUnit", Math.max(0, Number(e.target.value) || 0))}
            />
          </Field>

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
            <BirthdayPicker
              value={draft.birthday || null}
              onChange={(iso) => set("birthday", iso)}
            />
          </Field>

          {/* Say the resolved date back, so an eleven-month countdown is
              never a surprise discovered after the mission is live. */}
          {resolved ? (
            <Card className="p-5">
              <p className="text-sm text-ink-2">Reveal on</p>
              <p className="mt-1 font-display text-2xl text-ink">
                {formatDate(resolved.target, { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="nums mt-2 text-ink-2">{resolved.countdown.label}</p>
              {resolved.rolled ? (
                <p className="mt-3 rounded-lg bg-gold-100 px-3 py-2 text-sm text-gold-700">
                  That date has already passed this year, so your mission counts down to{" "}
                  {formatDate(resolved.target, { day: "numeric", month: "long", year: "numeric" })}.
                </p>
              ) : null}
            </Card>
          ) : null}

          {draft.birthday && resolved ? (
            <Card className="p-5">
              {sprint ? (
                <>
                  <Badge tone="gold">Sprint mode</Badge>
                  <p className="mt-3 text-ink">
                    That&apos;s{" "}
                    <strong className="nums">{sprint.label.replace(" — sprint", "")}</strong>{" "}
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
                    <strong className="nums">{resolved.countdown.label}</strong> to gather your
                    people.
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

        {/* Hidden on step 0, where nothing has been chosen yet and the
            preview would be a card full of placeholders. */}
        {step > 0 ? (
          <aside className="hidden lg:block">
            <MissionPreview
              icon={draft.icon}
              title={draft.title}
              headline={draft.headline}
              impactLine={draft.impactLine}
              goal={draft.goal}
              unitSingular={draft.unitSingular}
              unitPlural={draft.unitPlural}
              accent={draft.accent}
              birthday={draft.birthday}
              ownerName={ownerName}
            />
          </aside>
        ) : null}
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
