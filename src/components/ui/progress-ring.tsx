import type { ReactNode } from "react";
import { cx } from "@/components/ui";

/**
 * A circular tally: evergreen stroke on a hairline track.
 *
 * Once a mission is at or past its goal the ring turns gold and picks up a
 * soft glow — the only place gold is allowed to carry meaning rather than
 * decorate, because reaching the goal is exactly the celebration moment
 * the palette reserves it for.
 *
 * Server-renderable: the sweep is a plain stroke-dasharray, and the only
 * animation is a CSS transition, which `prefers-reduced-motion` already
 * neutralises globally.
 */
export function ProgressRing({
  percent,
  size = 76,
  stroke = 6,
  label,
  children,
  className,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  /** Accessible description; the visual centre is `children`. */
  label?: string;
  children?: ReactNode;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const complete = clamped >= 100;

  return (
    <div
      className={cx("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(clamped)}% of the goal`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden focusable="false">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-hairline)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          // The mission's own accent, not the brand primary — the ring sits
          // among elements that all follow data-accent, and evergreen in the
          // middle of a violet mission reads as a mistake. `--accent`
          // defaults to primary-500 at :root, so anything outside a mission
          // context looks exactly as it did.
          stroke={complete ? "var(--color-gold-500)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
          style={
            complete
              ? { filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--color-gold-500) 55%, transparent))" }
              : undefined
          }
        />
      </svg>

      <span className="absolute inset-0 grid place-items-center text-center leading-none">
        {children}
      </span>
    </div>
  );
}
