import type { ComponentPropsWithoutRef, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */
type ButtonVariant = "primary" | "accent" | "soft" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  // whitespace-nowrap matters more than it looks: every size below sets a
  // fixed height, so a label that wraps to two lines overflows its own
  // pill instead of growing it. That is what "Start a mission" was doing
  // in a narrow header.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition " +
  "disabled:opacity-45 disabled:pointer-events-none active:scale-[0.98] select-none";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  // Evergreen carries every primary action; secondary buttons are a
  // hairline outline on white, never a grey fill.
  primary: "bg-primary-500 text-white hover:bg-primary-600 shadow-soft",
  accent: "bg-accent text-white hover:brightness-110 shadow-soft",
  soft: "bg-accent-wash text-accent hover:brightness-95",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  outline: "border border-line bg-surface text-ink hover:border-primary-500 hover:text-primary-600",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-13 px-7 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      {...props}
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
    />
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentPropsWithoutRef<"a"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <a
      {...props}
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */
export function Card({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div"> & { children: ReactNode }) {
  return (
    <div
      {...props}
      className={cx(
        "rounded-card border border-line bg-surface shadow-soft",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-ink-2">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */
const BADGE_TONES = {
  neutral: "bg-surface-2 text-ink-2 border-line",
  primary: "bg-primary-100 text-primary-600 border-transparent",
  success: "bg-success-100 text-success border-transparent",
  // Gold is celebratory, so its text step is the darker gold-700 — the
  // decorative gold-500 would not pass AA at badge size.
  gold: "bg-gold-100 text-gold-700 border-transparent",
  warning: "bg-warning-100 text-warning border-transparent",
  danger: "bg-danger-100 text-danger border-transparent",
  accent: "bg-accent-wash text-accent border-transparent",
} as const;

export function Badge({
  tone = "neutral",
  className,
  children,
  title,
}: {
  tone?: keyof typeof BADGE_TONES;
  className?: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center gap-1 rounded-pill border px-2.5 py-1 text-xs font-medium",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */
const FIELD_BASE =
  "w-full rounded-lg border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-3 " +
  "transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500";

export function Field({
  label,
  hint,
  error,
  children,
  optional,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-2">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {optional ? <span className="text-xs text-ink-3">optional</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-sm text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-sm text-ink-2">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <input {...props} className={cx(FIELD_BASE, className)} />;
}

export function Textarea({ className, ...props }: ComponentPropsWithoutRef<"textarea">) {
  return <textarea {...props} className={cx(FIELD_BASE, "resize-none", className)} />;
}

export function Select({ className, ...props }: ComponentPropsWithoutRef<"select">) {
  return <select {...props} className={cx(FIELD_BASE, "appearance-none pr-10", className)} />;
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */
export function Progress({
  percent,
  label,
  className,
}: {
  percent: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={className}>
      <div
        className="h-2.5 w-full overflow-hidden rounded-pill bg-surface-2"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Mission progress"}
      >
        <div
          className="h-full rounded-pill bg-accent transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line px-6 py-12 text-center">
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <p className="mt-3 font-display text-lg text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-ink-2">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */
const AVATAR_TONES = [
  "bg-primary-100 text-primary-600",
  "bg-gold-100 text-gold-700",
  "bg-success-100 text-success",
  "bg-surface-2 text-ink-2",
  "bg-[#ecebfa] text-[#4a3aad]",
];

export function Avatar({
  name,
  size = 36,
  src,
}: {
  name: string;
  size?: number;
  /** An uploaded picture. Initials remain the fallback when absent. */
  src?: string | null;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);

  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface font-semibold",
        AVATAR_TONES[sum % AVATAR_TONES.length],
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {src ? (
        // A raw <img>: avatars live on the Supabase storage domain, and
        // PhotoBackground already establishes that arbitrary remote hosts
        // are served as-is rather than opening the image optimizer to them.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        (initials || "♡")
      )}
    </span>
  );
}
