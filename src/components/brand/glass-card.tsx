import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@/components/ui";

/**
 * Content that sits over a photograph. Frosted white so the ink tokens
 * keep their contrast whatever the image underneath is doing.
 */
export function GlassCard({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div"> & { children: ReactNode }) {
  return (
    <div
      {...props}
      className={cx(
        "rounded-card border border-white/50 bg-white/72 p-7 text-ink shadow-md backdrop-blur-[16px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
