import Image from "next/image";
import type { ReactNode } from "react";
import { cx } from "@/components/ui";

/**
 * A full-bleed photograph with a scrim over it. Text never sits directly
 * on a raw photo: `hero` darkens towards the bottom so white type stays
 * legible, `soft` fades the image into the white page so ink-coloured
 * type can sit on the lower half.
 */
export function PhotoBackground({
  src,
  alt = "",
  overlay = "hero",
  eager = false,
  grain = true,
  className,
  children,
}: {
  src: string;
  alt?: string;
  overlay?: "hero" | "soft";
  /** Set on the first hero of a page — it is usually the LCP element. */
  eager?: boolean;
  grain?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  // Curated images live in /public and go through the optimizer. An
  // organization's own cover URL is an arbitrary third-party host, so it
  // is served as-is rather than opening the optimizer to any domain.
  const isRemote = /^https?:\/\//.test(src);

  return (
    <section className={cx("relative isolate overflow-hidden", className)}>
      {isRemote ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          className="object-cover"
        />
      )}

      <div
        aria-hidden
        className={cx("absolute inset-0", overlay === "hero" ? "scrim-hero" : "scrim-soft")}
      />
      {grain ? <div aria-hidden className="film-grain absolute inset-0" /> : null}

      <div className="relative">{children}</div>
    </section>
  );
}
