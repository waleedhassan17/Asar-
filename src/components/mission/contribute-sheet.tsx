"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Badge, Button, Field, Input, Textarea, cx } from "@/components/ui";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { TRACK_META, plural, suggestMessage, tidyNumber } from "@/lib/format";
import { getVisitorHash, rememberName, readStoredName, savePledge } from "@/lib/visitor";
import type { Contribution, ContributionTrack, ExternalLink, Mission } from "@/lib/types";
import { addContributionAction, recordClickAction } from "@/app/m/[slug]/actions";

const VOLUNTEER_PRESETS = [
  { label: "Donate blood", hours: 1 },
  { label: "Volunteer 2 hours", hours: 2 },
  { label: "Volunteer half a day", hours: 4 },
  { label: "Teach or mentor someone", hours: 1 },
];

export function ContributeSheet({
  open,
  onClose,
  mission,
  links,
  ownerName,
  token,
  initialTrack,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  mission: Mission;
  links: ExternalLink[];
  ownerName: string;
  token?: string | null;
  initialTrack: ContributionTrack;
  onAdded: (contribution: Contribution) => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [track, setTrack] = useState<ContributionTrack>(initialTrack);
  const [name, setName] = useState(readStoredName);
  const [anonymous, setAnonymous] = useState(false);
  const [quantity, setQuantity] = useState<number>(mission.increments[0] ?? 1);
  const [hours, setHours] = useState<number>(2);
  const [volunteerLabel, setVolunteerLabel] = useState(VOLUNTEER_PRESETS[0].label);
  const [alreadyDone, setAlreadyDone] = useState(false);
  // W-01: the composed message is only stored once the contributor edits
  // it. Until then it *is* the suggestion, which keeps the two in step
  // without an effect copying one into the other.
  const [editedMessage, setEditedMessage] = useState<string | null>(null);
  const [reportedAmount, setReportedAmount] = useState("");
  const [linkId, setLinkId] = useState<string | null>(links[0]?.id ?? null);
  const [clickedThrough, setClickedThrough] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // W-02: keep the suggested wording in step with the action, until the
  // contributor edits it — then it's theirs and we stop touching it.
  const suggestion = useMemo(
    () =>
      suggestMessage({
        track,
        quantity,
        unitSingular: mission.unit_singular,
        unitPlural: mission.unit_plural,
        actionVerb: mission.action_verb,
        hours,
        ownerName,
      }),
    [track, quantity, hours, mission, ownerName],
  );

  const message = editedMessage ?? suggestion;

  const availableTracks = useMemo(() => {
    const list: ContributionTrack[] = ["pledge"];
    if (mission.allow_external_give && links.length > 0) list.push("external_give");
    list.push("volunteer", "share");
    if (mission.allow_wish_only) list.push("wish");
    return list;
  }, [mission.allow_external_give, mission.allow_wish_only, links.length]);

  async function uploadProof(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/proofs", { method: "POST", body });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Upload failed");
      setProofUrl(json.url as string);
      toast("Photo attached", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That upload didn't work.");
    } finally {
      setUploading(false);
    }
  }

  function openGiveLink() {
    const link = links.find((l) => l.id === linkId);
    if (!link) return;

    // Open synchronously so the browser doesn't treat it as a popup, then
    // point it at the destination once the click is counted (C-203).
    const tab = window.open("", "_blank", "noopener,noreferrer");
    startTransition(async () => {
      const result = await recordClickAction({ linkId: link.id, visitorHash: getVisitorHash() });
      const destination = result.url ?? link.url;
      if (tab) tab.location.href = destination;
      else window.open(destination, "_blank", "noopener,noreferrer");
      setClickedThrough(true);
    });
  }

  function submit() {
    setError(null);
    rememberName(name);

    const actionLabel =
      track === "pledge"
        ? `${mission.action_verb} ${tidyNumber(quantity)} ${plural(quantity, mission.unit_singular, mission.unit_plural)}`
        : track === "volunteer"
          ? volunteerLabel
          : track === "external_give"
            ? "gave directly"
            : track === "share"
              ? "shared the mission"
              : undefined;

    startTransition(async () => {
      const result = await addContributionAction({
        slug: mission.slug,
        token: token ?? undefined,
        track,
        contributor_name: name.trim() || "A friend",
        is_anonymous: anonymous,
        quantity: track === "pledge" ? quantity : track === "volunteer" ? 1 : 0,
        hours: track === "volunteer" ? hours : undefined,
        action_label: actionLabel,
        message: message.trim() || undefined,
        external_link_id: track === "external_give" ? linkId : undefined,
        reported_amount: track === "external_give" ? reportedAmount.trim() || undefined : undefined,
        proof_url: proofUrl ?? undefined,
        already_done: track === "external_give" ? true : alreadyDone,
        visitor_hash: getVisitorHash(),
        unit: track === "volunteer" ? "volunteer session" : mission.unit_plural,
      });

      if (!result.ok || !result.contribution) {
        setError(result.error ?? "That didn't go through.");
        return;
      }

      if (result.id && result.manageToken) {
        savePledge({
          id: result.id,
          manageToken: result.manageToken,
          missionSlug: mission.slug,
          status: result.contribution.status,
          label: actionLabel ?? "your wish",
          createdAt: new Date().toISOString(),
        });
      }

      onAdded(result.contribution);
      toast(
        result.contribution.status === "pledged"
          ? "Pledged. Come back and tick it off when it's done 💛"
          : "Added — thank you 💛",
        "success",
      );

      // Reset the parts that shouldn't persist into a second entry.
      setProofUrl(null);
      setAlreadyDone(false);
      setEditedMessage(null);
      setClickedThrough(false);
      setReportedAmount("");
      onClose();
    });
  }

  const canSubmit =
    !pending &&
    !uploading &&
    (track !== "pledge" || quantity > 0) &&
    (track !== "external_give" || Boolean(linkId));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Join ${ownerName}'s mission`}
      subtitle="Pick whichever of these actually suits you. They all count."
      wide
    >
      {/* Track picker — same size, same order, nothing greyed out (§8). */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {availableTracks.map((t) => {
          const meta = TRACK_META[t];
          const active = track === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTrack(t)}
              data-accent={meta.accent}
              className={cx(
                "rounded-lg border p-3 text-left transition",
                active ? "border-accent bg-accent-wash" : "border-line hover:border-ink-3",
              )}
            >
              <span className="text-lg">{meta.icon}</span>
              <p className="mt-1 text-sm font-semibold leading-tight text-ink">{meta.label}</p>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-ink-2">{TRACK_META[track].blurb}</p>

      <div className="mt-6 space-y-5">
        {/* ---------------------------------------------------------- */}
        {/* Track A — pledge (C-101)                                    */}
        {/* ---------------------------------------------------------- */}
        {track === "pledge" ? (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              How many {mission.unit_plural}?
            </p>
            <div className="flex flex-wrap gap-2">
              {mission.increments.map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setQuantity(inc)}
                  className={cx(
                    "rounded-pill border px-4 py-2 text-sm font-semibold transition",
                    quantity === inc
                      ? "border-accent bg-accent text-white"
                      : "border-line hover:border-ink-3",
                  )}
                >
                  {inc} {plural(inc, mission.unit_singular, mission.unit_plural)}
                </button>
              ))}
              <input
                type="number"
                min={1}
                aria-label="Custom amount"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="w-24 rounded-pill border border-line bg-surface px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <p className="mt-2 text-xs text-ink-3">
              Small is genuinely fine. One {mission.unit_singular} still moves the number.
            </p>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3">
              <input
                type="checkbox"
                checked={alreadyDone}
                onChange={(e) => setAlreadyDone(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-[var(--accent)]"
              />
              <span className="text-sm">
                <span className="block font-medium text-ink">I&apos;ve already done this</span>
                <span className="text-ink-2">
                  Otherwise it&apos;s recorded as a pledge and you can tick it off later.
                </span>
              </span>
            </label>
          </div>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Track B — redirect to give (C-201 → C-202)                  */}
        {/* ---------------------------------------------------------- */}
        {track === "external_give" ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-gold-100 p-4 text-sm text-ink-2">
              These links go somewhere {ownerName} chose and trusts. Asar doesn&apos;t process the
              payment and never sees it — we only count that you went.
            </div>

            <div className="space-y-2">
              {links.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => setLinkId(link.id)}
                  className={cx(
                    "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition",
                    linkId === link.id ? "border-accent bg-accent-wash" : "border-line",
                  )}
                >
                  <span>
                    <span className="block font-medium text-ink">{link.label}</span>
                    <span className="block text-xs text-ink-3">{hostOf(link.url)}</span>
                  </span>
                  <span className="text-xs text-ink-3">{link.click_count} went</span>
                </button>
              ))}
            </div>

            <Button variant="outline" className="w-full" onClick={openGiveLink} disabled={!linkId}>
              Open the give page ↗
            </Button>

            {clickedThrough ? (
              <Field label="What did you give?" optional hint="Free text — nobody checks it.">
                <Input
                  value={reportedAmount}
                  onChange={(e) => setReportedAmount(e.target.value)}
                  placeholder="e.g. PKR 2,000 / 3 meals"
                  maxLength={60}
                />
              </Field>
            ) : (
              <p className="text-xs text-ink-3">
                Once you&apos;ve been, come back here and tell us what you gave — or don&apos;t.
                It&apos;s entirely up to you.
              </p>
            )}
          </div>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Track C — volunteer (C-301)                                 */}
        {/* ---------------------------------------------------------- */}
        {track === "volunteer" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {VOLUNTEER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setVolunteerLabel(preset.label);
                    setHours(preset.hours);
                  }}
                  className={cx(
                    "rounded-pill border px-4 py-2 text-sm font-medium transition",
                    volunteerLabel === preset.label
                      ? "border-accent bg-accent text-white"
                      : "border-line hover:border-ink-3",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="What will you do?">
                <Input
                  value={volunteerLabel}
                  onChange={(e) => setVolunteerLabel(e.target.value)}
                  maxLength={120}
                />
              </Field>
              <Field label="Roughly how many hours?" optional>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, Number(e.target.value) || 0))}
                />
              </Field>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3">
              <input
                type="checkbox"
                checked={alreadyDone}
                onChange={(e) => setAlreadyDone(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-[var(--accent)]"
              />
              <span className="text-sm font-medium text-ink">I&apos;ve already done this</span>
            </label>
          </div>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Track C — share (C-302)                                     */}
        {/* ---------------------------------------------------------- */}
        {track === "share" ? (
          <div className="rounded-lg bg-primary-100 p-4 text-sm text-ink-2">
            Sharing genuinely helps — most missions grow from one person forwarding the link. Share
            it however you like, then log it here so it counts toward the reach of this mission.
          </div>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Wish-only (C-304)                                           */}
        {/* ---------------------------------------------------------- */}
        {track === "wish" ? (
          <div className="rounded-lg bg-surface-2 p-4 text-sm text-ink-2">
            No action, no explanation, no follow-up. A message on its own is a real contribution to
            somebody&apos;s birthday.
          </div>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Proof (C-104) — optional, and never framed as required      */}
        {/* ---------------------------------------------------------- */}
        {track === "pledge" || track === "volunteer" || track === "external_give" ? (
          <div className="rounded-lg border border-dashed border-line p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">Attach a photo?</p>
                <p className="text-xs text-ink-2">
                  Optional. A receipt or a snapshot adds a “proof attached” tag — never a
                  verification stamp.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : proofUrl ? "Replace" : "Choose"}
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadProof(file);
                e.target.value = "";
              }}
            />
            {proofUrl ? (
              <div className="mt-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofUrl}
                  alt="Attached proof"
                  className="h-16 w-16 rounded-md object-cover"
                />
                <Badge tone="primary">Proof attached</Badge>
                <button
                  type="button"
                  onClick={() => setProofUrl(null)}
                  className="text-xs text-ink-3 underline"
                >
                  remove
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* W-01 combo message                                          */}
        {/* ---------------------------------------------------------- */}
        <Field label="Your message" hint="This is what appears on the wish wall.">
          <Textarea
            rows={3}
            maxLength={1000}
            value={message}
            onChange={(e) => setEditedMessage(e.target.value)}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Your name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Who's this from?"
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-3 self-end rounded-lg border border-line p-3">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="h-5 w-5 accent-[var(--accent)]"
            />
            <span className="text-sm font-medium text-ink">Show me as anonymous</span>
          </label>
        </div>

        {error ? (
          <p className="rounded-lg bg-danger-100 px-4 py-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button variant="accent" size="lg" className="w-full" onClick={submit} disabled={!canSubmit}>
          {pending ? "Sending…" : track === "wish" ? "Send my wish" : "Count me in"}
        </Button>

        <p className="text-center text-xs text-ink-3">
          Everything here is self-reported and labelled that way. No account needed.
        </p>
      </div>
    </Sheet>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
