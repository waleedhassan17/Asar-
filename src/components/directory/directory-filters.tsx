"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cx } from "@/components/ui";
import { causeLabel } from "@/lib/directory";

/**
 * Cause / country filter. A client leaf that only writes to the URL —
 * the directory itself stays a Server Component, so a filtered view is a
 * shareable link and works with the back button.
 */
export function DirectoryFilters({
  causes,
  countries,
}: {
  causes: string[];
  countries: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeCause = params.get("cause");
  const activeCountry = params.get("country");

  function apply(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    next.delete("missing");
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  }

  return (
    <div className={cx("space-y-4", pending && "opacity-70")} aria-busy={pending}>
      <FilterRow
        label="Cause"
        options={causes.map((c) => ({ value: c, label: causeLabel(c) }))}
        active={activeCause}
        onPick={(value) => apply("cause", value)}
      />
      {countries.length > 1 ? (
        <FilterRow
          label="Where"
          options={countries.map((c) => ({ value: c, label: c }))}
          active={activeCountry}
          onPick={(value) => apply("country", value)}
        />
      ) : null}
    </div>
  );
}

function FilterRow({
  label,
  options,
  active,
  onPick,
}: {
  label: string;
  options: { value: string; label: string }[];
  active: string | null;
  onPick: (value: string | null) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <div className="no-scrollbar flex flex-wrap gap-2">
        <Chip selected={active === null} onClick={() => onPick(null)}>
          All
        </Chip>
        {options.map((option) => (
          <Chip
            key={option.value}
            selected={active === option.value}
            onClick={() => onPick(active === option.value ? null : option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "rounded-pill border px-3.5 py-1.5 text-sm font-medium capitalize transition",
        selected
          ? "border-transparent bg-primary-500 text-white"
          : "border-line bg-surface text-ink-2 hover:border-primary-500 hover:text-primary-600",
      )}
    >
      {children}
    </button>
  );
}
