# Asar

Turn a birthday into a mission. Instead of asking for gifts, you pick a purpose —
feed 100 people, plant 50 trees, find 20 blood donors — and friends pledge an
action toward it. On your birthday the page turns into a "Because of you…"
reveal showing what all of you did together.

Built for the MVP stage described in [`task.md`](./task.md), extended by
[`task1.md`](./task1.md): **no payment gateway and no NGO partnerships**.
Nothing is claimed to be verified, no money moves through the platform, and
giving money is never required to take part.

Since `task1.md` it also carries a curated **donation directory** at `/give`.
Every "Donate" control there is an outbound link to that organization's *own*
official donation page — Asar counts the click and nothing else. And a
first-person founder story at `/about`, whose copy lives in
[`src/lib/copy.ts`](./src/lib/copy.ts).

- **Stack** — Next.js 16 (App Router, TypeScript, Tailwind v4) + Supabase
  (Postgres, Auth, Storage). One deployable app, no separate API server.
- **Deploys to** — Vercel, with Supabase as the managed database.
- **Design** — white-first: evergreen `#0E7C66` for every action, gold only for
  celebration, Fraunces + Inter. Tokens live in
  [`src/app/globals.css`](./src/app/globals.css); the photographic heroes and
  their licences are in [`public/backgrounds/`](./public/backgrounds/).
- **Logo** — a crescent with a young branch growing out of it, traced from the
  Sukoon app's icon and recoloured onto Asar's tokens. One `Logo` component
  (`mark` / `tile` / `full`) feeds the header, footer, auth cards, favicon,
  apple icon and OG image.
- **Copy** — every editable string lives in [`src/lib/copy.ts`](./src/lib/copy.ts),
  including the hero (with two alternates), the hadith, and the money
  disclaimer. The house rules at the top of that file are not decorative.

---

## Getting it running

### 1. Create a Supabase project

<https://supabase.com/dashboard> → New project. Note the database password;
you'll need it once, in step 3.

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` from **Project Settings → API**.

> The service-role key bypasses row level security entirely. It belongs in
> `.env.local` and in Vercel's encrypted environment variables — nowhere else.
> If it ever appears in a committed file, a script, or a chat window, rotate it
> in the dashboard immediately.

### 3. Apply the database

Either way works, and both are safe to re-run — every migration is idempotent.

**Option A — paste it (no network setup, always works).**

```bash
npm install
npm run db:bundle     # writes supabase/bundle.sql
```

Open the Supabase SQL editor, paste the whole file, run it once.

**Option B — push it from the command line.**

Put the connection string in `SUPABASE_DB_URL` in `.env.local` (the script
reads that file automatically), then `npm run db:push`.

Use the **Session pooler** string from *Project Settings → Database →
Connection string*, not the direct one:

```
postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```

Three things that catch people out here:

- The direct host `db.PROJECT.supabase.co` is **IPv6-only** on current Supabase
  projects. On an IPv4-only network it fails with "Network is unreachable"
  regardless of the password. The pooler is IPv4.
- Don't use the **transaction** pooler on port `6543`; it can't run this DDL.
- The dashboard prints `[YOUR-PASSWORD]` as a placeholder. You have to
  substitute the real one.

### 4. Run it

```bash
npm run dev
```

Register an account, and you're at the mission builder.

### 5. Make yourself an admin

The admin panel (`/admin`) is gated on a flag, not a role guess:

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

---

## How the database is organised

All of it lives in `supabase/migrations/`, applied in filename order.

| File | What's in it |
|---|---|
| `…000100_schema.sql` | Tables, enums, triggers. `profiles`, `mission_templates`, `missions`, `contributions`, `external_links`, `link_clicks`, `endorsements`, `pledge_flags`, `platform_settings`. |
| `…000200_views.sql` | `mission_stats` (the live tally), `mission_action_breakdown`, `platform_transparency`. Every number in the UI comes from these, not from application-side arithmetic. |
| `…000300_rls.sql` | Row level security, plus column-level grants. |
| `…000400_api_functions.sql` | The `api_*` functions. This is the entire write surface. |
| `…000500_storage.sql` | The `proofs` bucket: public read, server-only write. |
| `…000600_directory.sql` | The donation directory: `organizations`, `mission_orgs`, `increment_org_click`, and the admin/owner `api_*` functions for both. |
| `seed.sql` | The four preset missions, the platform defaults, and the starter list of organizations (all seeded **unverified** on purpose). |

### The security model

The anon key ships to the browser, so it is treated as public:

1. **Every table has RLS on and denies by default.**
2. **`anon` and `authenticated` get `SELECT` only**, and only on columns that
   are safe to publish. `missions.share_token` and `contributions.manage_token`
   are never granted to either role, so a private mission's secret link and a
   contributor's pledge token cannot be harvested.
3. **Every write goes through a `SECURITY DEFINER` function** that re-checks
   ownership, visibility, quotas and input length itself. There is no
   `INSERT`/`UPDATE`/`DELETE` grant anywhere for the anon key.
4. **Internal helpers are revoked**, because Supabase's default privileges
   grant `EXECUTE` on new functions to `anon` — the migration takes that back
   and then re-grants exactly the intended list.
5. **The service-role key is server-only.** `src/lib/supabase/admin.ts` imports
   `server-only`, so importing it from a client component is a build error.

These properties are covered by negative tests — direct writes, token
harvesting, admin access from `anon`, and confirming a pledge without its token
all fail. See "Verifying the SQL" below.

### Contributors never sign up

Only the person creating a mission needs an account. Friends contribute
anonymously; their pledge comes back with a `manage_token` kept in
`localStorage`, which is the only thing that lets them mark it as done later
(C-102). Rate limiting and endorsement de-duplication use a random
browser-generated id, not an IP or device fingerprint.

---

## Where the spec lives in the code

| Spec | Where |
|---|---|
| M-01 · Mission selector | `mission_templates`, `src/app/create/mission-builder.tsx` |
| M-02 · Custom mission | Same builder, "Write my own" |
| M-03/04/05 · Start date, countdown, sprint mode | `missions.starts_at` / `reveal_at`, `src/components/mission/countdown.tsx` |
| M-06 · Visibility | `missions.visibility` + `share_token`, `resolve_mission()` |
| C-101…104 · Track A, pledge & self-report | `api_add_contribution`, `api_confirm_contribution`, `src/app/api/proofs/route.ts` |
| C-201…203 · Track B, redirect to give | `external_links`, `api_record_link_click`; directory orgs via `mission_orgs` + `/go/[slug]` |
| C-301…304 · Track C, non-monetary | `contribute-sheet.tsx` (volunteer / share / wish-only) |
| W-01…04 · Wish + action | `suggestMessage()`, `wish-wall.tsx`, `api_react_to_contribution` |
| D-01…06 · Live dashboard | `mission_stats` view, `tally.tsx`, `dashboard-view.tsx` |
| R-01…06 · Impact reveal | `api_reveal`, `src/app/r/[slug]/`, `share-card.tsx` |
| T-01…05 · Trust & proof | `trustLabel()`, `endorsements`, `pledge_flags`, `/transparency` |
| A-M01…05 · Admin | `api_admin_*`, `src/app/admin/` |
| A-M06 · Organizations manager | `api_admin_upsert_organization`, `src/app/admin/admin-view.tsx` |
| Founder story | `src/lib/copy.ts` (`aboutStory`), `src/app/(marketing)/about/` |
| Hero copy + hadith band | `src/lib/copy.ts` (`heroCopy`, `heroAlternates`, `hadith`), `src/components/brand/hadith-band.tsx` |
| Logo | `src/components/brand/logo.tsx`, `src/app/icon.svg`, `src/app/apple-icon.png`, `src/app/opengraph-image.tsx` |
| Owner dashboard | `src/app/dashboard/` + `src/components/mission/mission-card.tsx`, `src/components/ui/progress-ring.tsx` |
| Account settings | `src/app/settings/` |
| Donation directory | `src/app/(marketing)/give/`, `src/components/directory/`, `src/app/go/[slug]/route.ts` |

### Tone rules, enforced in code

Section 8 of the spec is design intent that's easy to lose, so it's pinned down:

- Wish-only sits in the same row, at the same size, as pledging — never greyed
  out or moved to the bottom.
- The tally reads "73 lives and counting", never "73 of 100 raised".
- The countdown uses body-text ink. There is no alarm red anywhere in the
  palette, and no push notifications.
- The contributor list can only ever show who *did* join.
- Trust labels never say "Verified" — the strongest label is
  "Friends confirmed".

---

## Verifying the SQL

The migrations were developed against a throwaway Postgres with a small
`auth`/`storage` shim, exercising the whole flow (create → contribute across
all tracks → confirm → endorse → flag → reveal → admin) plus negative security
checks. To repeat that against a scratch database:

```bash
docker run -d --name asar-pg -e POSTGRES_PASSWORD=asar -p 55432:5432 postgres:16
SUPABASE_DB_URL="postgresql://postgres:asar@localhost:55432/postgres" npm run db:push

docker exec asar-pg psql -U postgres -q -f /tmp/01_smoke.sql      # core contract
docker exec asar-pg psql -U postgres -q -f /tmp/02_directory.sql  # directory contract
```

`supabase/tests/README.md` has the full recipe. `02_directory.sql` is the one
that matters for the give directory: it proves the anon key cannot rewrite a
`donate_url` or set `is_verified`, and that only a mission's owner can choose
its causes.

A bare Postgres has no `auth` schema and no `anon`/`authenticated` roles, so
that needs a shim first — against a real Supabase project it just works.

---

## Deploying to Vercel

1. Push the repo to GitHub and import it at <https://vercel.com/new>.
2. Environment variables — `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Leave
   `NEXT_PUBLIC_SITE_URL` unset and Vercel's own URL is used; set it once you
   have a custom domain, since share links are built from it.
   Do **not** set `SUPABASE_DB_URL` in Vercel — migrations aren't run from the app.
3. In Supabase → Authentication → URL Configuration, set your Vercel URL as the
   Site URL and add `https://your-app.vercel.app/auth/callback` to the redirect
   allow-list, or email confirmation links will bounce.
4. Deploy.

Everything is server-rendered on demand (`force-dynamic`) because the tally is
live, so no ISR configuration is needed.

### Is it safe to deploy?

Yes, with the two operational caveats above (service-role key stays in Vercel's
env, auth redirect URLs configured). The app assumes the anon key is public and
is built accordingly; the database enforces its own rules rather than trusting
the client.

Two things to be aware of before real users arrive:

- **Give-link moderation is a human queue.** Links to well-known giving
  platforms auto-approve from an admin-editable allow-list; everything else
  waits at `/admin`. If nobody watches that queue, owners' links never go live.
- **Proof photos are world-readable by URL.** They're shown publicly on wish
  walls and in the reveal collage, which is the intent, but the URLs are
  unguessable rather than access-controlled.

---

## Scripts

```bash
npm run dev        # local development
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run db:bundle  # write supabase/bundle.sql for the SQL editor
npm run db:push    # apply migrations + seed (needs SUPABASE_DB_URL in .env.local)
```

---

## Every route

| Route | What it is |
|---|---|
| `/` | Landing: photo hero, hadith band, reframing, tracks, presets, honesty block |
| `/how-it-works` | The three steps and the three tracks, plus where the money goes |
| `/about` | First-person founder story |
| `/give`, `/give/[slug]` | Donation directory and organization detail |
| `/go/[slug]` | Counts a click, 302s to the organization's own donation page |
| `/transparency` | Platform-wide numbers, including how much carries proof |
| `/login`, `/register` | Auth over a photo background, in a glass card |
| `/auth/callback` | Email-confirmation exchange |
| `/create` | Mission builder (presets or custom) |
| `/dashboard` | Greeting, stats strip, mission cards with progress rings |
| `/dashboard/[slug]` | One mission: live tally, giving options, settings |
| `/settings` | Name, birthday, account, sign out |
| `/m/[slug]` | The public mission page — tally, three tracks, wish wall |
| `/r/[slug]` | The reveal (locked until the birthday) |
| `/admin` | Review queue, give-links, organizations, presets, trust rules |
| `/api/proofs` | Signed upload for pledge photos |

Every one of them has a loading skeleton, an empty state and an error state;
`src/app/error.tsx` and `src/app/not-found.tsx` catch anything else, so no route
can render blank.

---

## What isn't built

Deliberately out of scope for this stage, and noted so nobody goes looking:

- **No payment processing, and none planned for the directory.** Asar lists
  organizations and links out to their own official donation pages; it never
  collects, holds, processes or routes money. `/go/[slug]` counts the click and
  302s to the organization's site — that is the entire "payment" path.
- **No NGO verification.** `organizations.is_verified` means one narrow thing:
  a human opened the site and confirmed the domain really belongs to that
  organization. It is not a judgement on their programmes, and every seeded row
  starts `false` until someone does that check in the admin manager.
- **Asar claims no legal status.** It is an early platform, not a registered
  nonprofit, NGO, charity or tax-exempt body, and no copy anywhere may say
  otherwise — see the house rules at the top of `src/lib/copy.ts`.
- **R-05's auto-reel is an in-page story player, not an exported video file.**
  Rendering video needs a server-side encoder; the shareable artefact today is
  the 1080×1080 card from R-04, which is what actually gets posted anyway.
- **Live updates are polling**, every 15–20 seconds and paused on hidden tabs,
  rather than Supabase Realtime. Realtime needs the publication configured and
  interacts awkwardly with the column-level grants that keep `manage_token`
  private; polling is simpler and costs nothing on Vercel.
