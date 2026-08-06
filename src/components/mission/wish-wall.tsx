"use client";

import { useState, useTransition } from "react";
import { Avatar, Badge, Button, Card, EmptyState, Textarea, cx } from "@/components/ui";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { describeContribution, relativeTime, trustLabel } from "@/lib/format";
import { getVisitorHash, readStoredName } from "@/lib/visitor";
import type { Contribution, TrustRules } from "@/lib/types";
import { endorseAction, flagAction, reactAction } from "@/app/m/[slug]/actions";

const REACTIONS = ["❤️", "🙏", "🥹", "🎉", "✨"];

const FLAG_REASONS = [
  { value: "not-real", label: "I don't think this happened" },
  { value: "duplicate", label: "Duplicate entry" },
  { value: "inappropriate", label: "The message is inappropriate" },
  { value: "spam", label: "Spam or advertising" },
];

export function WishWall({
  contributions,
  slug,
  isOwner,
  trustRules,
  title,
}: {
  contributions: Contribution[];
  slug: string;
  isOwner: boolean;
  trustRules: TrustRules;
  title: string;
}) {
  const [filter, setFilter] = useState<"all" | "actions" | "wishes">("all");

  const visible = contributions.filter((c) => {
    if (filter === "actions") return c.track !== "wish";
    if (filter === "wishes") return Boolean(c.message);
    return true;
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-ink">{title}</h2>
        <div className="flex gap-1 rounded-pill bg-surface-2 p-1">
          {(
            [
              ["all", "Everything"],
              ["actions", "Actions"],
              ["wishes", "Messages"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cx(
                "rounded-pill px-3 py-1.5 text-sm font-medium transition",
                filter === value ? "bg-surface text-ink shadow-soft" : "text-ink-2 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="💌"
          title="Nothing here yet"
          body="The first message is always the hardest. It could be yours."
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((c) => (
            <li key={c.id}>
              <WishCard
                contribution={c}
                slug={slug}
                isOwner={isOwner}
                trustRules={trustRules}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WishCard({
  contribution,
  slug,
  isOwner,
  trustRules,
}: {
  contribution: Contribution;
  slug: string;
  isOwner: boolean;
  trustRules: TrustRules;
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [reaction, setReaction] = useState(contribution.owner_reaction);
  const [endorsements, setEndorsements] = useState(contribution.endorsement_count);
  const [endorsed, setEndorsed] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);

  const trust = trustLabel(
    { ...contribution, endorsement_count: endorsements },
    trustRules,
  );
  const isPromise = contribution.status === "pledged";

  function react(emoji: string) {
    const next = reaction === emoji ? null : emoji;
    setReaction(next);
    startTransition(async () => {
      const result = await reactAction({ id: contribution.id, reaction: next, slug });
      if (!result.ok) {
        setReaction(contribution.owner_reaction);
        toast(result.error ?? "Couldn't save that reaction.", "warn");
      }
    });
  }

  function endorse() {
    if (endorsed) return;
    setEndorsed(true);
    setEndorsements((n) => n + 1);
    startTransition(async () => {
      const result = await endorseAction({
        id: contribution.id,
        name: readStoredName() || "A friend",
        visitorHash: getVisitorHash(),
      });
      if (result.ok && typeof result.count === "number") setEndorsements(result.count);
      else if (!result.ok) {
        setEndorsed(false);
        setEndorsements(contribution.endorsement_count);
        toast(result.error ?? "Couldn't record that.", "warn");
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex gap-3">
        <Avatar name={contribution.contributor_name} size={40} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-semibold text-ink">{contribution.contributor_name}</span>
            <span className="text-sm text-ink-2">{describeContribution(contribution)}</span>
            <span className="text-xs text-ink-3">· {relativeTime(contribution.created_at)}</span>
          </div>

          {contribution.message ? (
            <p className="mt-2 whitespace-pre-line leading-relaxed text-ink">
              {contribution.message}
            </p>
          ) : null}

          {contribution.proof_url ? (
            <a
              href={contribution.proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block w-fit"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={contribution.proof_url}
                alt={contribution.proof_note ?? "Proof photo"}
                loading="lazy"
                className="max-h-56 rounded-lg border border-line object-cover"
              />
            </a>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* T-01: the default label on everything. */}
            <Badge
              tone={trust.tone === "neutral" ? "neutral" : trust.tone}
              title="Asar does not independently verify contributions."
            >
              {trust.text}
            </Badge>

            {isPromise ? <Badge tone="gold">Pledged — not yet ticked off</Badge> : null}

            {endorsements > 0 ? (
              <span className="text-xs text-ink-3">
                {endorsements} {endorsements === 1 ? "friend" : "friends"} confirmed
              </span>
            ) : null}

            <div className="ml-auto flex items-center gap-1">
              {/* T-02 */}
              {contribution.track !== "wish" ? (
                <button
                  type="button"
                  onClick={endorse}
                  disabled={endorsed}
                  className="rounded-pill px-2.5 py-1 text-xs font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
                >
                  {endorsed ? "Confirmed ✓" : "I saw this happen"}
                </button>
              ) : null}

              {/* T-05 */}
              <button
                type="button"
                onClick={() => setFlagOpen(true)}
                aria-label="Report this entry"
                title="Report this entry"
                className="rounded-full p-1.5 text-ink-3 transition hover:bg-surface-2 hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M3 14V2.5h9L10 6l2 3.5H3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* W-04 */}
          {isOwner ? (
            <div className="mt-3 flex items-center gap-1 border-t border-line pt-3">
              <span className="mr-1 text-xs text-ink-3">React:</span>
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => react(emoji)}
                  className={cx(
                    "rounded-full px-2 py-1 text-base transition",
                    reaction === emoji ? "bg-accent-wash" : "hover:bg-surface-2",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : reaction ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-ink-2">
              <span className="rounded-full bg-accent-wash px-2 py-0.5 text-base">{reaction}</span>
              <span className="text-xs">reacted by the birthday person</span>
            </div>
          ) : null}
        </div>
      </div>

      <FlagSheet
        open={flagOpen}
        onClose={() => setFlagOpen(false)}
        contributionId={contribution.id}
      />
    </Card>
  );
}

function FlagSheet({
  open,
  onClose,
  contributionId,
}: {
  open: boolean;
  onClose: () => void;
  contributionId: string;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState(FLAG_REASONS[0].value);
  const [details, setDetails] = useState("");

  function submit() {
    startTransition(async () => {
      const result = await flagAction({
        id: contributionId,
        reason,
        details: details.trim() || undefined,
        visitorHash: getVisitorHash(),
      });
      if (result.ok) {
        toast("Thanks — an admin will take a look.", "success");
        onClose();
      } else {
        toast(result.error ?? "Couldn't send that report.", "warn");
      }
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Report this entry"
      subtitle="This goes to Asar's admins, not to the birthday person."
    >
      <div className="space-y-2">
        {FLAG_REASONS.map((option) => (
          <label
            key={option.value}
            className={cx(
              "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition",
              reason === option.value ? "border-ink bg-surface-2" : "border-line",
            )}
          >
            <input
              type="radio"
              name="flag-reason"
              value={option.value}
              checked={reason === option.value}
              onChange={() => setReason(option.value)}
              className="h-4 w-4"
            />
            <span className="text-sm text-ink">{option.label}</span>
          </label>
        ))}
      </div>

      <Textarea
        rows={3}
        maxLength={500}
        className="mt-4"
        placeholder="Anything else we should know? (optional)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />

      <div className="mt-5 flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={submit} disabled={pending}>
          {pending ? "Sending…" : "Send report"}
        </Button>
      </div>
    </Sheet>
  );
}
