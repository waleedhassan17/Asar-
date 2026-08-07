import { joinUs } from "@/lib/copy";
import { ContactForm } from "./contact-form";

/**
 * "Be part of Asar" — an invitation, not a job listing.
 *
 * This used to be a single `mailto:` link, on the reasoning that a form
 * implies a staffed inbox. That was wrong in practice: a mailto does
 * nothing at all for anyone without a mail client configured, which on a
 * phone browser is the common case — the button simply appeared dead.
 *
 * Messages now go to the database and appear on the admin dashboard.
 * There is still no outbound mail, because there is no SMTP: an admin
 * replies from their own mail client.
 */
export function JoinBand({ className }: { className?: string }) {
  return (
    <section className={className}>
      <div className="rounded-card border border-line bg-surface-2 px-6 py-10 text-center sm:px-10 sm:py-12">
        <p className="text-sm font-semibold tracking-wide text-primary-600 uppercase">
          {joinUs.eyebrow}
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl leading-tight text-balance text-ink">
          {joinUs.headline}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-ink-2">{joinUs.body}</p>

        <ContactForm className="mt-7" />

        <p className="mt-4 text-sm text-ink-3">{joinUs.micro}</p>
      </div>
    </section>
  );
}
