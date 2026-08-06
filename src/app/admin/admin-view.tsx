"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  SectionTitle,
  Textarea,
  cx,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { describeContribution, relativeTime, tidyNumber } from "@/lib/format";
import { ORG_CATEGORIES, domainOf } from "@/lib/directory";
import type { AdminOverview, MissionTemplate, OrgCategory, Organization } from "@/lib/types";
import {
  deleteOrganizationAction,
  moderateLinkAction,
  resolveFlagAction,
  setSettingAction,
  upsertOrganizationAction,
  upsertTemplateAction,
} from "./actions";

type Tab = "queue" | "links" | "orgs" | "templates" | "trust" | "log";

const TABS: [Tab, string][] = [
  ["queue", "Review queue"],
  ["links", "Give-links"],
  ["orgs", "Organizations"],
  ["templates", "Mission presets"],
  ["trust", "Trust rules"],
  ["log", "Transparency"],
];

export function AdminView({
  overview,
  organizations,
}: {
  overview: AdminOverview;
  organizations: Organization[];
}) {
  const [tab, setTab] = useState<Tab>("queue");

  const counts: Record<Tab, number | null> = {
    queue: overview.review_queue.length + overview.high_volume.length,
    links: overview.pending_links.length,
    orgs: organizations.length,
    templates: overview.templates.length,
    trust: null,
    log: null,
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      <h1 className="font-display text-3xl text-ink">Platform admin</h1>
      <p className="mt-1 text-ink-2">
        Everything here exists because nothing on Asar is institutionally verified yet.
      </p>

      <div className="mt-6 flex flex-wrap gap-1 rounded-card bg-surface-2 p-1">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cx(
              "rounded-pill px-4 py-2 text-sm font-medium transition",
              tab === value ? "bg-surface text-ink shadow-soft" : "text-ink-2 hover:text-ink",
            )}
          >
            {label}
            {counts[value] ? (
              <span className="nums ml-1.5 text-xs text-ink-3">{counts[value]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-6">
        {tab === "queue" ? <ReviewQueue overview={overview} /> : null}
        {tab === "links" ? <LinkModeration overview={overview} /> : null}
        {tab === "orgs" ? <OrganizationManager organizations={organizations} /> : null}
        {tab === "templates" ? <TemplateManager templates={overview.templates} /> : null}
        {tab === "trust" ? <TrustRulesEditor overview={overview} /> : null}
        {tab === "log" ? <TransparencyPanel overview={overview} /> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A-M02 — self-reported pledge review                                 */
/* ------------------------------------------------------------------ */
function ReviewQueue({ overview }: { overview: AdminOverview }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function resolve(flagId: string, status: "dismissed" | "actioned", hide: boolean) {
    startTransition(async () => {
      const result = await resolveFlagAction({ flagId, status, hide });
      if (result.ok) {
        toast(status === "actioned" ? "Entry hidden." : "Report dismissed.", "success");
        router.refresh();
      } else {
        toast(result.error ?? "Couldn't apply that.", "warn");
      }
    });
  }

  return (
    <>
      <Card className="p-6">
        <SectionTitle
          title="Reported entries"
          hint="Raised by visitors via the flag button (T-05). Hiding an entry removes it from the tally and the wish wall."
        />

        {overview.review_queue.length === 0 ? (
          <EmptyState icon="✅" title="Nothing reported" body="The queue is empty." />
        ) : (
          <ul className="space-y-3">
            {overview.review_queue.map((item) => (
              <li key={item.flag_id} className="rounded-lg border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {item.contribution.contributor_name}{" "}
                      <span className="font-normal text-ink-2">
                        {describeContribution(item.contribution)}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-ink-2">{item.contribution.message}</p>
                    <p className="mt-2 text-xs text-ink-3">
                      Reported as <strong>{item.flag_reason}</strong> ·{" "}
                      {relativeTime(item.flagged_at)} · on{" "}
                      <Link href={`/m/${item.mission_slug}`} className="underline">
                        {item.mission_title}
                      </Link>
                    </p>
                    {item.flag_details ? (
                      <p className="mt-1 text-xs text-ink-2">“{item.flag_details}”</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolve(item.flag_id, "dismissed", false)}
                      disabled={pending}
                    >
                      Looks fine
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => resolve(item.flag_id, "actioned", true)}
                      disabled={pending}
                    >
                      Hide entry
                    </Button>
                  </div>
                </div>

                {item.contribution.proof_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.contribution.proof_url}
                    alt="Attached proof"
                    className="mt-3 h-28 rounded-md border border-line object-cover"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <SectionTitle
          title="Large self-reports, unbacked"
          hint="Not reported by anyone — just big enough relative to their goal to be worth a glance. No action is implied."
        />

        {overview.high_volume.length === 0 ? (
          <p className="text-sm text-ink-3">Nothing stands out.</p>
        ) : (
          <ul className="space-y-2">
            {overview.high_volume.map((item) => (
              <li
                key={item.contribution.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4"
              >
                <div>
                  <p className="font-medium text-ink">
                    {item.contribution.contributor_name}{" "}
                    <span className="font-normal text-ink-2">
                      {describeContribution(item.contribution)}
                    </span>
                  </p>
                  <p className="text-xs text-ink-3">
                    {tidyNumber(item.contribution.quantity)} against a goal of{" "}
                    {tidyNumber(item.goal_amount)} ·{" "}
                    <Link href={`/m/${item.mission_slug}`} className="underline">
                      {item.mission_title}
                    </Link>
                  </p>
                </div>
                <Badge tone="gold">No proof, no endorsements</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* A-M03 — external link moderation                                    */
/* ------------------------------------------------------------------ */
function LinkModeration({ overview }: { overview: AdminOverview }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});

  function moderate(linkId: string, status: "approved" | "rejected") {
    startTransition(async () => {
      const result = await moderateLinkAction({ linkId, status, note: notes[linkId] });
      if (result.ok) {
        toast(status === "approved" ? "Link approved." : "Link rejected.", "success");
        router.refresh();
      } else {
        toast(result.error ?? "Couldn't apply that.", "warn");
      }
    });
  }

  return (
    <Card className="p-6">
      <SectionTitle
        title="Give-links awaiting review"
        hint="This check is the only thing standing between a scam link and someone's birthday page."
      />

      {overview.pending_links.length === 0 ? (
        <EmptyState icon="🔗" title="No links waiting" body="Everything submitted has been handled." />
      ) : (
        <ul className="space-y-3">
          {overview.pending_links.map((link) => (
            <li key={link.id} className="rounded-lg border border-line p-4">
              <p className="font-medium text-ink">{link.label}</p>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-1 block break-all text-sm text-primary-600 underline"
              >
                {link.url}
              </a>
              <p className="mt-2 text-xs text-ink-3">
                On{" "}
                <Link href={`/m/${link.mission_slug}`} className="underline">
                  {link.mission_title}
                </Link>{" "}
                by {link.owner} ({link.owner_email})
              </p>
              {link.note ? <p className="mt-1 text-sm text-ink-2">“{link.note}”</p> : null}

              <Input
                className="mt-3"
                placeholder="Note back to the owner (optional)"
                value={notes[link.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [link.id]: e.target.value }))}
                maxLength={300}
              />

              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => moderate(link.id, "approved")} disabled={pending}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moderate(link.id, "rejected")}
                  disabled={pending}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* A-M01 — mission template manager                                    */
/* ------------------------------------------------------------------ */
function TemplateManager({ templates }: { templates: MissionTemplate[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<MissionTemplate> | null>(null);

  function save() {
    if (!editing) return;
    startTransition(async () => {
      const result = await upsertTemplateAction({
        ...editing,
        increments: editing.increments ?? [1, 2, 5],
      });
      if (result.ok) {
        toast("Preset saved.", "success");
        setEditing(null);
        router.refresh();
      } else {
        toast(result.error ?? "Couldn't save the preset.", "warn");
      }
    });
  }

  return (
    <>
      <Card className="p-6">
        <SectionTitle
          title="Mission presets"
          hint="These are the starting points people see. lives_per_unit is the unit conversion — a blood donor counts as 3 lives, a meal as 1."
          action={
            <Button
              size="sm"
              onClick={() =>
                setEditing({
                  title: "",
                  unit_singular: "",
                  unit_plural: "",
                  action_verb: "fund",
                  default_goal: 100,
                  lives_per_unit: 1,
                  icon: "✨",
                  accent: "ember",
                  is_active: true,
                  sort_order: 100,
                })
              }
            >
              New preset
            </Button>
          }
        />

        <ul className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <p className="font-medium text-ink">{t.title}</p>
                  <p className="nums text-xs text-ink-3">
                    {t.default_goal} {t.unit_plural} · {t.lives_per_unit} lives per{" "}
                    {t.unit_singular} · /{t.slug}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {t.is_active ? <Badge tone="success">Active</Badge> : <Badge>Hidden</Badge>}
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                  Edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {editing ? (
        <Card className="space-y-4 p-6">
          <SectionTitle title={editing.id ? "Edit preset" : "New preset"} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <Input
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                maxLength={80}
              />
            </Field>
            <Field label="Icon">
              <Input
                value={editing.icon ?? ""}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                maxLength={8}
              />
            </Field>
            <Field label="Unit (one)">
              <Input
                value={editing.unit_singular ?? ""}
                onChange={(e) => setEditing({ ...editing, unit_singular: e.target.value })}
                maxLength={40}
              />
            </Field>
            <Field label="Unit (many)">
              <Input
                value={editing.unit_plural ?? ""}
                onChange={(e) => setEditing({ ...editing, unit_plural: e.target.value })}
                maxLength={40}
              />
            </Field>
            <Field label="Action verb">
              <Input
                value={editing.action_verb ?? ""}
                onChange={(e) => setEditing({ ...editing, action_verb: e.target.value })}
                maxLength={40}
              />
            </Field>
            <Field label="Default goal">
              <Input
                type="number"
                min={1}
                value={editing.default_goal ?? 100}
                onChange={(e) =>
                  setEditing({ ...editing, default_goal: Number(e.target.value) || 1 })
                }
              />
            </Field>
            <Field label="Lives per unit" hint="Unit conversion for the impact headline.">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={editing.lives_per_unit ?? 1}
                onChange={(e) =>
                  setEditing({ ...editing, lives_per_unit: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                min={0}
                value={editing.sort_order ?? 100}
                onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>

          <Field label="Blurb" optional>
            <Textarea
              rows={2}
              maxLength={200}
              value={editing.blurb ?? ""}
              onChange={(e) => setEditing({ ...editing, blurb: e.target.value })}
            />
          </Field>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={editing.is_active ?? true}
              onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              className="h-5 w-5"
            />
            <span className="text-sm font-medium text-ink">Show this preset to everyone</span>
          </label>

          <div className="flex gap-2">
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save preset"}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* A-M06 — the donation directory                                      */
/*                                                                     */
/* The whole job here is the link. Asar takes no payment, so the only  */
/* way this page can hurt someone is by sending them to a convincing   */
/* fake — hence the verify step is a deliberate, separate action with  */
/* its own warning, not a checkbox tucked into the form.               */
/* ------------------------------------------------------------------ */
const EMPTY_ORG: Partial<Organization> = {
  name: "",
  tagline: "",
  description: "",
  category: "general_welfare",
  causes: [],
  country: "Pakistan",
  website_url: "",
  donate_url: "",
  is_verified: false,
  is_featured: false,
  sort_order: 100,
};

function OrganizationManager({ organizations }: { organizations: Organization[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<Organization> | null>(null);
  const [causesText, setCausesText] = useState("");

  function edit(org: Partial<Organization> | null) {
    setEditing(org);
    setCausesText((org?.causes ?? []).join(", "));
  }

  function save() {
    if (!editing) return;
    startTransition(async () => {
      const result = await upsertOrganizationAction({
        ...editing,
        logo_url: editing.logo_url || undefined,
        cover_url: editing.cover_url || undefined,
        website_url: editing.website_url || undefined,
        tagline: editing.tagline || undefined,
        description: editing.description || undefined,
        trust_note: editing.trust_note || undefined,
        causes: causesText
          .split(",")
          .map((c) => c.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 8),
      });
      if (result.ok) {
        toast("Organization saved.", "success");
        edit(null);
        router.refresh();
      } else {
        toast(result.error ?? "Couldn't save that organization.", "warn");
      }
    });
  }

  function toggleVerified(org: Organization) {
    if (
      !org.is_verified &&
      !window.confirm(
        `Confirm by hand first: open ${domainOf(org.donate_url)} and check it really is ${org.name}'s own official site. Look-alike donation domains exist. Mark as verified?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await upsertOrganizationAction({ ...org, is_verified: !org.is_verified });
      if (result.ok) router.refresh();
      else toast(result.error ?? "Couldn't update that organization.", "warn");
    });
  }

  function remove(org: Organization) {
    if (!window.confirm(`Remove ${org.name} from the directory?`)) return;
    startTransition(async () => {
      const result = await deleteOrganizationAction({ id: org.id });
      if (result.ok) {
        toast("Removed from the directory.", "success");
        router.refresh();
      } else {
        toast(result.error ?? "Couldn't remove that organization.", "warn");
      }
    });
  }

  return (
    <>
      <Card className="p-6">
        <SectionTitle
          title="Donation directory"
          hint="Asar lists and links; it never collects. The only thing to moderate here is whether donate_url is the organization's genuine official page."
          action={
            <Button size="sm" onClick={() => edit(EMPTY_ORG)}>
              New organization
            </Button>
          }
        />

        {organizations.length === 0 ? (
          <EmptyState
            icon="🗂"
            title="No organizations yet"
            body="Add the first one — name, honest description, and the link to their own donation page."
          />
        ) : (
          <ul className="space-y-2">
            {organizations.map((org) => (
              <li
                key={org.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {org.name}
                    {org.is_featured ? (
                      <span className="ml-2 text-xs font-normal text-gold-700">featured</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-ink-3">
                    /give/{org.slug} → {domainOf(org.donate_url)} · {org.country} · {org.clicks}{" "}
                    clicks
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {org.is_verified ? (
                    <Badge tone="success">✓ Link verified</Badge>
                  ) : (
                    <Badge tone="gold">Unverified link</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleVerified(org)}
                    disabled={pending}
                  >
                    {org.is_verified ? "Un-verify" : "Verify…"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => edit(org)}>
                    Edit
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(org)}
                    className="text-xs text-ink-3 underline transition hover:text-danger"
                  >
                    remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing ? (
        <Card className="space-y-4 p-6">
          <SectionTitle title={editing.id ? `Edit ${editing.name}` : "New organization"} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                maxLength={120}
              />
            </Field>
            <Field label="Category">
              <select
                value={editing.category ?? "general_welfare"}
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value as OrgCategory })
                }
                className="w-full rounded-lg border border-line bg-surface px-4 py-3 text-ink"
              >
                {ORG_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tagline" optional>
              <Input
                value={editing.tagline ?? ""}
                onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                maxLength={160}
              />
            </Field>
            <Field label="Country">
              <Input
                value={editing.country ?? ""}
                onChange={(e) => setEditing({ ...editing, country: e.target.value })}
                maxLength={60}
              />
            </Field>
            <Field label="Official website" optional>
              <Input
                value={editing.website_url ?? ""}
                onChange={(e) => setEditing({ ...editing, website_url: e.target.value })}
                placeholder="https://…"
                maxLength={500}
              />
            </Field>
            <Field
              label="Donation page"
              hint="Their own official donate URL — this is where every Donate button lands."
            >
              <Input
                value={editing.donate_url ?? ""}
                onChange={(e) => setEditing({ ...editing, donate_url: e.target.value })}
                placeholder="https://…"
                maxLength={500}
              />
            </Field>
            <Field label="Logo URL" optional>
              <Input
                value={editing.logo_url ?? ""}
                onChange={(e) => setEditing({ ...editing, logo_url: e.target.value })}
                maxLength={500}
              />
            </Field>
            <Field label="Cover image URL" optional>
              <Input
                value={editing.cover_url ?? ""}
                onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })}
                maxLength={500}
              />
            </Field>
            <Field label="Causes" hint="Comma-separated chips: orphans, meals, water…">
              <Input
                value={causesText}
                onChange={(e) => setCausesText(e.target.value)}
                maxLength={200}
              />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                min={0}
                value={editing.sort_order ?? 100}
                onChange={(e) =>
                  setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })
                }
              />
            </Field>
          </div>

          <Field label="Description" hint="Two to four honest sentences. No marketing adjectives.">
            <Textarea
              rows={4}
              maxLength={1200}
              value={editing.description ?? ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </Field>

          <Field label="Trust note" optional hint="e.g. Official site only — beware look-alikes.">
            <Input
              value={editing.trust_note ?? ""}
              onChange={(e) => setEditing({ ...editing, trust_note: e.target.value })}
              maxLength={240}
            />
          </Field>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={editing.is_featured ?? false}
              onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })}
              className="h-5 w-5"
            />
            <span className="text-sm font-medium text-ink">Feature at the top of /give</span>
          </label>

          <p className="rounded-lg bg-gold-100 p-4 text-xs text-ink-2">
            Verification is deliberately not part of this form. Save first, then use
            &ldquo;Verify…&rdquo; in the list once you have opened the donation page yourself and
            confirmed the domain is really theirs.
          </p>

          <div className="flex gap-2">
            <Button onClick={save} disabled={pending || !editing.name || !editing.donate_url}>
              {pending ? "Saving…" : "Save organization"}
            </Button>
            <Button variant="ghost" onClick={() => edit(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* A-M04 — trust score configuration                                   */
/* ------------------------------------------------------------------ */
function TrustRulesEditor({ overview }: { overview: AdminOverview }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [rules, setRules] = useState(() =>
    JSON.stringify(overview.settings.trust_rules ?? {}, null, 2),
  );
  const [domains, setDomains] = useState(() =>
    ((overview.settings.link_autoapprove_domains as string[]) ?? []).join("\n"),
  );
  const [note, setNote] = useState(() =>
    typeof overview.settings.transparency_note === "string"
      ? overview.settings.transparency_note
      : "",
  );
  const [error, setError] = useState<string | null>(null);

  function saveRules() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(rules);
    } catch {
      setError("That isn't valid JSON.");
      return;
    }
    startTransition(async () => {
      const result = await setSettingAction({ key: "trust_rules", value: parsed });
      if (result.ok) {
        toast("Trust rules saved.", "success");
        router.refresh();
      } else toast(result.error ?? "Couldn't save.", "warn");
    });
  }

  function saveDomains() {
    const list = domains
      .split("\n")
      .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
      .filter(Boolean);

    startTransition(async () => {
      const result = await setSettingAction({ key: "link_autoapprove_domains", value: list });
      if (result.ok) {
        toast("Allow-list saved.", "success");
        router.refresh();
      } else toast(result.error ?? "Couldn't save.", "warn");
    });
  }

  function saveNote() {
    startTransition(async () => {
      const result = await setSettingAction({ key: "transparency_note", value: note });
      if (result.ok) {
        toast("Transparency note saved.", "success");
        router.refresh();
      } else toast(result.error ?? "Couldn't save.", "warn");
    });
  }

  return (
    <>
      <Card className="p-6">
        <SectionTitle
          title="Trust rules"
          hint="How many friend-confirmations count as “Friends confirmed”, and when an entry lands in the review queue. Labels shown to visitors come from here."
        />
        <Textarea
          rows={14}
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          className="font-mono text-sm"
          spellCheck={false}
        />
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        <Button className="mt-4" onClick={saveRules} disabled={pending}>
          Save trust rules
        </Button>
      </Card>

      <Card className="p-6">
        <SectionTitle
          title="Auto-approved give-link domains"
          hint="One host per line. Links to these skip the moderation queue; everything else waits for a human."
        />
        <Textarea
          rows={10}
          value={domains}
          onChange={(e) => setDomains(e.target.value)}
          className="font-mono text-sm"
          spellCheck={false}
        />
        <Button className="mt-4" onClick={saveDomains} disabled={pending}>
          Save allow-list
        </Button>
      </Card>

      <Card className="p-6">
        <SectionTitle
          title="Transparency note (T-04)"
          hint="Appears on every mission page. Keep it honest — this is the sentence that sets expectations."
        />
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        <Button className="mt-4" onClick={saveNote} disabled={pending}>
          Save note
        </Button>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* A-M05 — the numbers behind the public log                           */
/* ------------------------------------------------------------------ */
function TransparencyPanel({ overview }: { overview: AdminOverview }) {
  const t = overview.transparency;

  const rows: [string, string | number][] = [
    ["Missions", t.missions_total],
    ["Active missions", t.missions_active],
    ["Contributions", t.contributions_total],
    ["Confirmed", t.contributions_confirmed],
    ["With a photo attached", t.contributions_with_proof],
    ["Confirmed by a friend", t.contributions_endorsed],
    ["Wish-only messages", t.wishes_only],
    ["Proof-attached share", `${t.proof_attached_percent}%`],
    ["Open reports", t.flags_open],
    ["Reports actioned", t.flags_actioned],
    ["Give-links approved", t.links_approved],
    ["Give-links rejected", t.links_rejected],
  ];

  return (
    <Card className="p-6">
      <SectionTitle
        title="Platform totals"
        hint="These are exactly the numbers published at /transparency. There is no second set."
        action={
          <Link href="/transparency">
            <Button size="sm" variant="outline">
              View public page
            </Button>
          </Link>
        }
      />
      <dl className="grid gap-4 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line p-4">
            <dt className="text-sm text-ink-2">{label}</dt>
            <dd className="nums mt-1 font-display text-2xl text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
