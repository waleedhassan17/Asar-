"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Badge, Button, Card, Field, Input, SectionTitle, Textarea, cx } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { Confetti } from "@/components/ui/confetti";
import { Countdown } from "@/components/mission/countdown";
import { CategoryBreakdown, ContributorStack, LiveTally } from "@/components/mission/tally";
import { ShareBar } from "@/components/mission/share-bar";
import { WishWall } from "@/components/mission/wish-wall";
import { formatDate, plural, relativeTime, tidyNumber } from "@/lib/format";
import { OrgCard } from "@/components/directory/org-card";
import { domainOf } from "@/lib/directory";
import type {
  MissionDashboard,
  MissionVisibility,
  Organization,
  TrustRules,
} from "@/lib/types";
import {
  addExternalLinkAction,
  attachMissionOrgAction,
  deleteExternalLinkAction,
  detachMissionOrgAction,
  missionOrgsAction,
  refreshDashboardAction,
  rotateShareTokenAction,
  searchOrganizationsAction,
  updateMissionAction,
} from "../actions";

const REFRESH_MS = 15_000;

export function DashboardView({
  initial,
  initialOrgs,
  origin,
  trustRules,
  justCreated,
}: {
  initial: MissionDashboard;
  /** Directory organizations attached to this mission (Track B). */
  initialOrgs: Organization[];
  origin: string;
  trustRules: TrustRules;
  justCreated: boolean;
}) {
  const toast = useToast();
  const [data, setData] = useState(initial);
  const [orgs, setOrgs] = useState(initialOrgs);
  const [tab, setTab] = useState<"live" | "links" | "settings">("live");
  const [celebrate] = useState(() => (justCreated ? Date.now() : 0));

  const { mission, stats } = data;
  const shareUrl =
    mission.visibility === "public"
      ? `${origin}/m/${mission.slug}`
      : `${origin}/m/${mission.slug}?t=${mission.share_token}`;

  const refresh = useCallback(async () => {
    const fresh = await refreshDashboardAction(mission.slug);
    if (fresh) setData(fresh as MissionDashboard);
  }, [mission.slug]);

  const refreshOrgs = useCallback(async () => {
    setOrgs((await missionOrgsAction(mission.slug)) as Organization[]);
  }, [mission.slug]);

  useEffect(() => {
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_MS);
    return () => clearInterval(tick);
  }, [refresh]);

  return (
    <div data-accent={mission.accent}>
      <Confetti fire={celebrate} pieces={70} />

      {/* ------------------------------------------------------------ */}
      {/* Header                                                        */}
      {/* ------------------------------------------------------------ */}
      <div className="border-b border-line bg-surface-2/60">
        <div className="mx-auto w-full max-w-5xl px-5 py-8">
          <Link href="/dashboard" className="text-sm text-ink-2 transition hover:text-ink">
            ← All missions
          </Link>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{mission.icon}</span>
                <h1 className="font-display text-3xl text-ink">{mission.title}</h1>
              </div>
              <p className="mt-2 text-ink-2">
                Birthday {formatDate(mission.birthday_date)} ·{" "}
                {mission.visibility === "public" ? "Public" : "Private link"}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3">
              {mission.is_revealed ? (
                <Link href={`/r/${mission.slug}`}>
                  <Button variant="accent">Open the reveal →</Button>
                </Link>
              ) : (
                <Countdown target={mission.reveal_at} sprint={mission.is_sprint} />
              )}
            </div>
          </div>

          {justCreated ? (
            <Card className="mt-6 p-5">
              <p className="font-semibold text-ink">Your mission is live 🎉</p>
              <p className="mt-1 text-sm text-ink-2">
                Send this link to the people you&apos;d normally expect a gift from. They
                don&apos;t need an account.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <code className="max-w-full truncate rounded-pill bg-surface-2 px-4 py-2 text-sm text-ink-2">
                  {shareUrl}
                </code>
                <ShareBar
                  url={shareUrl}
                  text={`I'm turning my birthday into ${mission.goal_amount} ${mission.unit_plural}. Join me:`}
                  compact
                />
              </div>
            </Card>
          ) : null}

          <div className="mt-6 flex gap-1 rounded-pill bg-surface p-1 shadow-soft sm:w-fit">
            {(
              [
                ["live", "Live"],
                ["links", `Giving (${data.links.length + orgs.length})`],
                ["settings", "Settings"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cx(
                  "flex-1 rounded-pill px-4 py-2 text-sm font-medium transition sm:flex-none",
                  tab === value ? "bg-ink text-white" : "text-ink-2 hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl space-y-8 px-5 py-8">
        {/* ---------------------------------------------------------- */}
        {/* Live                                                        */}
        {/* ---------------------------------------------------------- */}
        {tab === "live" ? (
          <>
            {data.flags.length > 0 ? (
              <Card className="border-gold-300/40 bg-gold-100 p-4">
                <p className="text-sm text-ink">
                  <strong>{data.flags.length}</strong>{" "}
                  {plural(data.flags.length, "entry has", "entries have")} been reported by
                  visitors. Asar&apos;s admins review these — you don&apos;t have to do anything.
                </p>
              </Card>
            ) : null}

            <LiveTally mission={mission} stats={stats} celebrate={mission.tone === "playful"} />
            <CategoryBreakdown stats={stats} breakdown={data.breakdown} mission={mission} />

            <Card className="p-6">
              <SectionTitle
                title="Momentum"
                hint="Arrivals per day. Quiet stretches are normal — most missions land in bursts."
              />
              <DailyChart daily={data.daily} />
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
                <span>
                  <strong className="nums text-ink">{stats.joined_last_24h}</strong> in the last 24h
                </span>
                <span>
                  <strong className="nums text-ink">{stats.joined_last_7d}</strong> in the last week
                </span>
                <span>
                  <strong className="nums text-ink">{stats.give_link_clicks}</strong> give-link
                  clicks
                </span>
                {stats.last_contribution_at ? (
                  <span>last entry {relativeTime(stats.last_contribution_at)}</span>
                ) : null}
              </div>
            </Card>

            <Card className="p-6">
              <SectionTitle title="Who's joined" hint="Nobody can see who hasn't." />
              <ContributorStack contributions={data.contributions} total={stats.contributor_count} />
            </Card>

            <Card className="p-6">
              <SectionTitle
                title="Share your mission"
                hint={
                  mission.visibility === "public"
                    ? "Anyone with this link can join."
                    : "This link contains a secret token — only send it to people you want in."
                }
              />
              <code className="block max-w-full truncate rounded-pill bg-surface-2 px-4 py-2 text-sm text-ink-2">
                {shareUrl}
              </code>
              <div className="mt-3">
                <ShareBar
                  url={shareUrl}
                  text={`I'm turning my birthday into ${mission.goal_amount} ${mission.unit_plural}. Join me:`}
                />
              </div>
            </Card>

            <WishWall
              contributions={data.contributions}
              slug={mission.slug}
              isOwner
              trustRules={trustRules}
              title="Wishes & actions"
            />
          </>
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Give-links (C-201, A-M03)                                    */}
        {/* ---------------------------------------------------------- */}
        {tab === "links" ? (
          <LinksTab
            data={data}
            orgs={orgs}
            onChanged={refresh}
            onOrgsChanged={refreshOrgs}
            toast={toast}
          />
        ) : null}

        {/* ---------------------------------------------------------- */}
        {/* Settings (M-06, §8)                                          */}
        {/* ---------------------------------------------------------- */}
        {tab === "settings" ? (
          <SettingsTab data={data} onChanged={refresh} origin={origin} />
        ) : null}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* D-06 — arrivals per day                                             */
/* ------------------------------------------------------------------ */
function DailyChart({ daily }: { daily: { day: string; entries: number }[] }) {
  if (daily.length === 0) {
    return <p className="text-sm text-ink-3">No entries yet — the chart fills in as people join.</p>;
  }

  const max = Math.max(...daily.map((d) => d.entries), 1);

  return (
    <div className="flex h-28 items-end gap-1.5">
      {daily.map((d) => (
        <div key={d.day} className="group flex flex-1 flex-col items-center gap-1.5">
          <div
            className="w-full rounded-t-md bg-accent transition-all"
            style={{ height: `${Math.max(6, (d.entries / max) * 88)}px` }}
            title={`${d.entries} on ${formatDate(d.day)}`}
          />
          <span className="text-[0.6rem] text-ink-3">{new Date(d.day).getDate()}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Give-links tab                                                      */
/* ------------------------------------------------------------------ */
function LinksTab({
  data,
  orgs,
  onChanged,
  onOrgsChanged,
  toast,
}: {
  data: MissionDashboard;
  orgs: Organization[];
  onChanged: () => void;
  onOrgsChanged: () => void;
  toast: (message: string, tone?: "info" | "success" | "warn") => void;
}) {
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await addExternalLinkAction({
        mission_id: data.mission.id,
        slug: data.mission.slug,
        label,
        url,
      });
      if (!result.ok) {
        setError(result.error ?? "Couldn't add that link.");
        return;
      }
      setLabel("");
      setUrl("");
      toast(
        result.moderation === "approved"
          ? "Link added and live."
          : "Link added — an admin will check it before it appears.",
        "success",
      );
      onChanged();
    });
  }

  function remove(linkId: string) {
    startTransition(async () => {
      const result = await deleteExternalLinkAction({ linkId, slug: data.mission.slug });
      if (result.ok) onChanged();
      else toast(result.error ?? "Couldn't remove that link.", "warn");
    });
  }

  return (
    <>
      <DirectoryPicker
        mission={data.mission}
        orgs={orgs}
        onChanged={onOrgsChanged}
        toast={toast}
      />

      <Card className="p-6">
        <SectionTitle
          title="Or add your own link"
          hint="Something not in the directory — a smaller organisation's donation page, a hospital's own portal. Asar never touches the money and never takes a cut."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Label">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Give via Edhi Foundation"
              maxLength={80}
            />
          </Field>
          <Field label="Link" hint="Must start with https://">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              maxLength={500}
            />
          </Field>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg bg-danger-100 px-4 py-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button className="mt-4" onClick={add} disabled={pending || !label.trim() || !url.trim()}>
          {pending ? "Adding…" : "Add give-link"}
        </Button>

        <p className="mt-4 text-xs text-ink-3">
          Links to well-known giving platforms go live straight away. Anything else waits for an
          Asar admin — that check is what keeps scam links off other people&apos;s birthdays.
        </p>
      </Card>

      {data.links.length > 0 ? (
        <Card className="p-6">
          <SectionTitle title="Your links" />
          <ul className="space-y-2">
            {data.links.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{link.label}</p>
                  <p className="truncate text-xs text-ink-3">{link.url}</p>
                  {link.review_note ? (
                    <p className="mt-1 text-xs text-danger">Admin note: {link.review_note}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="nums text-xs text-ink-3">{link.click_count} clicks</span>
                  <Badge
                    tone={
                      link.moderation === "approved"
                        ? "success"
                        : link.moderation === "rejected"
                          ? "danger"
                          : "gold"
                    }
                  >
                    {link.moderation === "approved"
                      ? "Live"
                      : link.moderation === "rejected"
                        ? "Rejected"
                        : "Awaiting review"}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => remove(link.id)}
                    className="text-xs text-ink-3 underline transition hover:text-danger"
                  >
                    remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Track B — pick causes from the curated directory                    */
/* ------------------------------------------------------------------ */
function DirectoryPicker({
  mission,
  orgs,
  onChanged,
  toast,
}: {
  mission: MissionDashboard["mission"];
  orgs: Organization[];
  onChanged: () => void;
  toast: (message: string, tone?: "info" | "success" | "warn") => void;
}) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Organization[] | null>(null);
  const [searching, setSearching] = useState(false);

  const attached = new Set(orgs.map((o) => o.id));

  function search() {
    setSearching(true);
    startTransition(async () => {
      setResults((await searchOrganizationsAction(query)) as Organization[]);
      setSearching(false);
    });
  }

  function attach(org: Organization) {
    startTransition(async () => {
      const result = await attachMissionOrgAction({
        missionId: mission.id,
        organizationId: org.id,
        slug: mission.slug,
      });
      if (result.ok) {
        toast(`${org.name} added to your mission.`, "success");
        onChanged();
      } else {
        toast(result.error ?? "Couldn't add that organization.", "warn");
      }
    });
  }

  function detach(org: Organization) {
    startTransition(async () => {
      const result = await detachMissionOrgAction({
        missionId: mission.id,
        organizationId: org.id,
        slug: mission.slug,
      });
      if (result.ok) onChanged();
      else toast(result.error ?? "Couldn't remove that organization.", "warn");
    });
  }

  return (
    <Card className="p-6">
      <SectionTitle
        title="Causes on your mission page"
        hint="Pick from Asar's directory. Friends land on the organisation's own official website and give them directly — nothing is collected here."
      />

      {orgs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {orgs.map((org) => (
            <div key={org.id} className="relative">
              <OrgCard org={org} compact />
              <button
                type="button"
                onClick={() => detach(org)}
                disabled={pending}
                className="absolute right-3 top-3 rounded-pill bg-surface-2 px-2.5 py-1 text-xs text-ink-3 transition hover:text-danger"
              >
                remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-2">
          Nothing picked yet. Search the directory below, or leave this empty — friends can still
          pledge actions, give time, or leave a wish.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <Field label="Search the directory" optional>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  search();
                }
              }}
              placeholder="orphans, water, Edhi…"
              maxLength={80}
            />
          </Field>
        </div>
        <Button variant="outline" onClick={search} disabled={pending}>
          {searching ? "Searching…" : "Search"}
        </Button>
      </div>

      {results ? (
        results.length === 0 ? (
          <p className="mt-4 text-sm text-ink-3">Nothing matched that.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {results.map((org) => (
              <li
                key={org.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {org.name}{" "}
                    {org.is_verified ? (
                      <span className="text-xs font-normal text-success">✓ link checked</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-ink-3">
                    {org.tagline ?? domainOf(org.donate_url)}
                  </p>
                </div>
                {attached.has(org.id) ? (
                  <Badge tone="success">Added</Badge>
                ) : (
                  <Button size="sm" onClick={() => attach(org)} disabled={pending}>
                    Add
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )
      ) : null}

      <p className="mt-4 text-xs text-ink-3">
        Up to eight organisations per mission. Asar never collects, holds or routes any donation —
        every one of these buttons is an outbound link to that organisation&apos;s own site.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Settings tab                                                        */
/* ------------------------------------------------------------------ */
function SettingsTab({
  data,
  onChanged,
  origin,
}: {
  data: MissionDashboard;
  onChanged: () => void;
  origin: string;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const { mission } = data;

  const [title, setTitle] = useState(mission.title);
  const [story, setStory] = useState(mission.story ?? "");
  const [goal, setGoal] = useState(mission.goal_amount);
  const [visibility, setVisibility] = useState<MissionVisibility>(mission.visibility);
  const [tone, setTone] = useState(mission.tone);
  const [wishOnly, setWishOnly] = useState(mission.allow_wish_only);
  const [externalGive, setExternalGive] = useState(mission.allow_external_give);
  const [shareToken, setShareToken] = useState(mission.share_token);

  function save() {
    startTransition(async () => {
      const result = await updateMissionAction({
        mission_id: mission.id,
        slug: mission.slug,
        title,
        story,
        goal_amount: goal,
        visibility,
        tone,
        allow_wish_only: wishOnly,
        allow_external_give: externalGive,
      });
      if (result.ok) {
        toast("Saved", "success");
        onChanged();
      } else {
        toast(result.error ?? "Couldn't save.", "warn");
      }
    });
  }

  function rotate() {
    startTransition(async () => {
      const result = await rotateShareTokenAction({ missionId: mission.id, slug: mission.slug });
      if (result.ok && result.shareToken) {
        setShareToken(result.shareToken);
        toast("New link generated. The old one no longer works.", "success");
      } else {
        toast(result.error ?? "Couldn't refresh the link.", "warn");
      }
    });
  }

  return (
    <>
      <Card className="space-y-5 p-6">
        <SectionTitle title="The mission" />

        <Field label="Name">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </Field>

        <Field label="Why this mission?" optional>
          <Textarea
            rows={4}
            maxLength={2000}
            value={story}
            onChange={(e) => setStory(e.target.value)}
          />
        </Field>

        <Field label={`Goal (${mission.unit_plural})`}>
          <Input
            type="number"
            min={1}
            value={goal}
            onChange={(e) => setGoal(Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Who can see it</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["public", "Public"],
                ["link", "Link only"],
                ["friends", "Friends only"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setVisibility(value)}
                className={cx(
                  "rounded-lg border p-3 text-sm font-medium transition",
                  visibility === value ? "border-accent bg-accent-wash" : "border-line",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Tone</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["playful", "Playful 🎉"],
                ["serious", "Understated"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTone(value)}
                className={cx(
                  "rounded-lg border p-3 text-sm font-medium transition",
                  tone === value ? "border-accent bg-accent-wash" : "border-line",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-4">
          <input
            type="checkbox"
            checked={wishOnly}
            onChange={(e) => setWishOnly(e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-[var(--accent)]"
          />
          <span className="text-sm">
            <span className="block font-medium text-ink">Allow wish-only messages</span>
            <span className="text-ink-2">
              Turning this off makes the page feel like a demand. We&apos;d leave it on.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-4">
          <input
            type="checkbox"
            checked={externalGive}
            onChange={(e) => setExternalGive(e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-[var(--accent)]"
          />
          <span className="text-sm">
            <span className="block font-medium text-ink">Show give-links</span>
            <span className="text-ink-2">Your own trusted external donation pages.</span>
          </span>
        </label>

        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </Card>

      {visibility !== "public" ? (
        <Card className="p-6">
          <SectionTitle
            title="Secret link"
            hint="Anyone holding this exact link can open the mission."
          />
          <code className="block max-w-full truncate rounded-pill bg-surface-2 px-4 py-2 text-sm text-ink-2">
            {`${origin}/m/${mission.slug}?t=${shareToken}`}
          </code>
          <Button variant="outline" className="mt-4" onClick={rotate} disabled={pending}>
            Generate a new link
          </Button>
          <p className="mt-2 text-xs text-ink-3">
            The old link stops working immediately. Contributions already made are kept.
          </p>
        </Card>
      ) : null}

      <Card className="p-6">
        <SectionTitle title="Numbers" />
        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            ["Entries", tidyNumber(data.stats.contribution_count)],
            ["With a photo", tidyNumber(data.stats.proof_count)],
            ["Confirmed by friends", tidyNumber(data.stats.endorsed_count)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-ink-2">{label}</dt>
              <dd className="nums font-display text-2xl text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}
