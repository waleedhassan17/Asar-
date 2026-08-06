import Link from "next/link";
import { Badge, Card, LinkButton, cx } from "@/components/ui";
import { categoryIcon, categoryLabel, causeLabel, domainOf, goHref } from "@/lib/directory";
import type { Organization } from "@/lib/types";

/**
 * One organization in the directory.
 *
 * The "Donate" control is an outbound link to /go/{slug}, which redirects
 * to the organization's own official donation page. Asar collects
 * nothing: the muted line under the button says so on every single card,
 * because that is the sentence people need before they click.
 */
export function OrgCard({
  org,
  className,
  compact = false,
}: {
  org: Organization;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Card className={cx("flex h-full flex-col p-5", className)}>
      <div className="flex items-start gap-3">
        <OrgMark org={org} />

        <div className="min-w-0 flex-1">
          <Link href={`/give/${org.slug}`} className="group block">
            <h3 className="truncate font-semibold text-ink transition group-hover:text-primary-600">
              {org.name}
            </h3>
          </Link>
          {org.tagline ? <p className="mt-0.5 text-sm text-ink-2">{org.tagline}</p> : null}
        </div>
      </div>

      {!compact && org.description ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-2">{org.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral">
          {categoryIcon(org.category)} {categoryLabel(org.category)}
        </Badge>
        {org.causes.slice(0, 3).map((cause) => (
          <Badge key={cause} tone="primary">
            {causeLabel(cause)}
          </Badge>
        ))}
      </div>

      <div className="mt-4 flex-1" />

      <VerificationLine org={org} />

      <LinkButton
        href={goHref(org.slug)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 w-full"
      >
        Donate ↗
      </LinkButton>

      <p className="mt-2 text-center text-xs text-ink-3">
        Opens {org.name}&apos;s official site ({domainOf(org.donate_url)}) — you pay them directly.
      </p>
    </Card>
  );
}

/** Logo if the org has one, initials if it doesn't. */
export function OrgMark({ org, size = 44 }: { org: Organization; size?: number }) {
  const initials = org.name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (org.logo_url) {
    return (
      // Logos are arbitrary third-party URLs, so they are served as-is
      // rather than through the image optimizer.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={org.logo_url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-md border border-line bg-white object-contain p-1"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-md bg-primary-100 font-display font-semibold text-primary-600"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials || "♡"}
    </span>
  );
}

/**
 * T-01 applies here too: "verified" only ever means a human confirmed the
 * link is the organization's real official domain. It is never a claim
 * about the organization's programmes, and un-verified orgs say so
 * plainly rather than silently omitting the tick.
 */
export function VerificationLine({ org }: { org: Organization }) {
  return org.is_verified ? (
    <p className="flex items-center gap-1.5 text-xs font-medium text-success">
      <span aria-hidden>✓</span> Verified official link
    </p>
  ) : (
    <p className="text-xs text-ink-3">Official link not checked by us yet — verify before giving.</p>
  );
}
