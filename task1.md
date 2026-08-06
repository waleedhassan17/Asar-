# Asar v2 — Theme, Founder Story & Donation Directory (Claude Code Prompts)

> Hand these to Claude Code **after** the base build from `asar-claude-code-implementation-prompt.md`. Three self-contained prompts (A, B, C) plus the seed data and photo sources they need. Obey the existing Design System rules; these only change the palette and add features.

---

## PROMPT A — Retheme to an elegant WHITE palette

> **Task:** Replace the warm-paper theme with a clean, elegant, **white-background** system (evergreen + gold on white). Keep Fraunces (display) + Inter (UI). Update the `@theme` tokens, re-theme shadcn, and add support for photographic hero/section backgrounds with legibility scrims.

Replace the token block in `app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  /* Surfaces — white-first, elegant */
  --color-canvas:      #FFFFFF;   /* app background */
  --color-surface:     #FFFFFF;   /* cards */
  --color-surface-2:   #FAFAF8;   /* subtle alternating-section tint */
  --color-hairline:    #ECEBE7;   /* borders / dividers */

  /* Ink — soft near-black (never pure #000) */
  --color-ink-900:     #18181B;   /* headings */
  --color-ink-700:     #3F3F46;   /* body */
  --color-ink-500:     #71717A;   /* muted / captions */

  /* Primary — "Evergreen" jewel-tone (growth + generosity, premium on white) */
  --color-primary-600: #0B5F4F;   /* hover/active */
  --color-primary-500: #0E7C66;   /* PRIMARY */
  --color-primary-100: #E4F1ED;   /* soft tint bg */

  /* Accent — refined gold for celebration, milestones, birthday glow */
  --color-gold-500:    #C39A3E;
  --color-gold-300:    #E4CC8A;
  --color-gold-100:    #F6EFDD;

  /* Semantic */
  --color-success:     #15803D;
  --color-warning:     #B45309;
  --color-danger:      #C0392B;

  /* Radii — soft, elegant */
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 24px; --radius-2xl: 32px;

  /* Shadows — very soft, neutral (elegance = restraint) */
  --shadow-sm: 0 1px 2px rgba(24,24,27,.04), 0 6px 20px rgba(24,24,27,.05);
  --shadow-md: 0 2px 6px rgba(24,24,27,.06), 0 14px 40px rgba(24,24,27,.07);
  --shadow-lg: 0 10px 50px rgba(24,24,27,.10);

  /* Type */
  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-sans:    "Inter", ui-sans-serif, system-ui, sans-serif;

  /* Photo-background scrims (keep overlaid text legible) */
  --scrim-hero:   linear-gradient(180deg, rgba(24,24,27,.10) 0%, rgba(24,24,27,.58) 100%);
  --scrim-soft:   linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.85) 90%);
}
```

Rules for this theme:
- **Background is white.** Use `--color-surface-2` only for gentle section separation; never a heavy gray. Rely on whitespace + hairlines, not boxes, to structure the page.
- **Primary = evergreen** for buttons, links, active states, and the progress ring stroke. **Gold** is reserved for celebration moments (milestone glows, the birthday reveal, "confirmed" sparkles) — never for large fills or body text (low contrast on white).
- Keep primary CTAs pill-shaped and confident; secondary buttons are hairline-outline on white.
- Ensure **WCAG AA** contrast: evergreen `#0E7C66` and ink tokens all pass on white; gold is decorative only.
- *(One-line swaps if a different mood is wanted later: primary → deep indigo `#3730A3` or plum `#6D28D9`. Change only `--color-primary-*`.)*

Photographic backgrounds (support "multiple background pics"):
- Create `components/brand/PhotoBackground.tsx`: renders a full-bleed `next/image` (priority on hero) + a `--scrim-hero` overlay + optional faint film grain. Props: `src`, `overlay` (`hero` | `soft`), `children`.
- Create `components/brand/GlassCard.tsx` for content sitting **over** a photo: `background: rgba(255,255,255,.72)`, `backdrop-blur: 16px`, hairline border, `--shadow-md`. Text inside uses ink tokens.
- Store curated images in `/public/backgrounds/` (e.g. `hero-01.jpg` … `hero-06.jpg`) and export a small `lib/backgrounds.ts` array so the landing hero, mission hero, and reveal can rotate/randomize among them. Always place a scrim between photo and text — never text directly on a raw photo.
- Download the images from the licensed sources in the **Background photos** section at the bottom of this file, then drop them into `/public/backgrounds/`.

**Definition of Done:** white background throughout; evergreen primary + gold accents; Fraunces headlines intact; hero renders a background photo with a legible scrim and a glass card; contrast passes AA; no leftover ember/paper tokens anywhere.

---

## PROMPT B — Founder story / "Our Story" page

> **Task:** Add an honest, personal founder-story page at `app/(marketing)/about/page.tsx` (and link it in the header/footer). Warm, first-person, quietly confident — **not** corporate boilerplate. It must be truthful about Asar's early stage and must NOT claim any legal status Asar doesn't hold.

Content & tone requirements:
- First-person voice from the founder. Lead with the *why*, e.g.: *"I started Asar because I believe a birthday can create impact, not just collect wishes."*
- State the stage honestly: *"Asar is an early platform I started to turn birthdays into acts of impact."* **Do not** write "registered nonprofit," "NGO," "charity," or "tax-exempt" anywhere unless it is literally true and provable. Overstating legal status is the one real liability — avoid it.
- Explain the model plainly and reassuringly: *"Asar doesn't collect or hold any money. When you choose to give, you donate directly on the organization's own official website. We simply help you find trusted causes and turn a birthday into a reason to act."*
- Include the transparency line used elsewhere: *"We track pledges and self-reported impact, and we're growing our network of verified partners."*
- Keep it human and unpolished-in-a-good-way: a short origin paragraph, what Asar is today, what it hopes to become. No stock corporate "About Us" clichés.

Design:
- Editorial layout on the white theme: a `PhotoBackground` hero (warm, human image) with a `GlassCard` holding the headline in Fraunces; then a centered reading column (`max-w-[640px]`) of first-person prose; optional small founder portrait + signature; a closing CTA ("Start your first mission").
- Provide the copy as a `lib/copy.ts` export (`aboutStory`) so it's easy to edit. Leave a clearly-marked `{/* FOUNDER: edit this paragraph */}` block for the personal origin story so the real founder can drop in their own words.

**Definition of Done:** `/about` reads as a sincere, first-person note; contains the "Asar never handles your money / donate on the org's own site" clarification; makes **no** false legal-status claims; matches the white theme; is linked from header + footer.

---

## PROMPT C — Curated Donation Directory (click-through to each org's OWN official donate page)

> **Task:** Build a curated directory of vetted organizations. Each org has a description and its **own official donation link**. When a visitor clicks "Donate," they are taken **directly to that specific organization's official website to pay there**. **Asar never collects, holds, processes, or routes any funds** — it only lists organizations and links out. Every surface must make this explicit.

### C.1 — Database (extend the Supabase schema; migration `0002_directory.sql`)

```sql
create type org_category as enum (
  'orphan_care','food_hunger','health_medical','education',
  'water','emergency_relief','microfinance','general_welfare'
);

create table organizations (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  tagline      text,                 -- one short line
  description  text,                 -- 2–4 honest sentences
  logo_url     text,
  cover_url    text,
  category     org_category not null,
  causes       text[] not null default '{}',  -- ['orphans','meals','water']
  country      text not null default 'Pakistan',
  website_url  text,
  donate_url   text not null,        -- the ORG'S OWN official donation page (destination of the click)
  is_verified  boolean not null default false, -- admin confirmed the link is the org's real official site
  is_featured  boolean not null default false,
  trust_note   text,                 -- e.g. "Official site only — beware of look-alike domains"
  clicks       int not null default 0,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
alter table organizations enable row level security;
create policy "orgs public read"   on organizations for select using (true);
create policy "admins manage orgs" on organizations for all    using (public.is_admin());

-- Optional: a mission owner curates which listed orgs their friends can give to (feeds Track B)
create table mission_orgs (
  id              uuid primary key default gen_random_uuid(),
  mission_id      uuid not null references missions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (mission_id, organization_id)
);
alter table mission_orgs enable row level security;
create policy "mission_orgs readable" on mission_orgs for select using (
  exists (select 1 from missions m where m.id = mission_id
          and (m.visibility in ('public','link') or m.owner_id = auth.uid()))
);
create policy "owner manages mission_orgs" on mission_orgs for all using (
  exists (select 1 from missions m where m.id = mission_id and m.owner_id = auth.uid())
);

-- Fire-and-forget click counter (no auth required; counts a click without exposing writes)
create function public.increment_org_click(p_slug text)
returns void language sql security definer set search_path = public as $$
  update organizations set clicks = clicks + 1 where slug = p_slug;
$$;
```

### C.2 — The click-through mechanic (this is the core behavior)

Build a redirect route handler `app/go/[slug]/route.ts`:
1. Look up the organization by `slug`.
2. Call `increment_org_click(slug)` (fire-and-forget — never block the redirect on it).
3. **302-redirect to that organization's `donate_url`** (its own official site).
4. If the org isn't found, redirect to `/give` with a gentle message.

Every "Donate" control in the app is an anchor to `/go/{slug}` with `target="_blank"` and `rel="noopener noreferrer"`, so the person lands **directly on that organization's official donation page in a new tab** and pays there. Asar is never in the money path.

### C.3 — Pages & components

- `app/(marketing)/give/page.tsx` — **the directory**. Server Component. Sections/filter by **cause** and **country** (chips or a simple segmented filter). Grid of `OrgCard`s. Featured orgs first, then `sort_order`. Include a persistent banner: *"You'll donate on each organization's **own official website**. Asar never handles or processes your donation."*
- `app/(marketing)/give/[slug]/page.tsx` — **org detail**. Cover (`PhotoBackground`), logo, name, `is_verified` badge, full description, cause chips, `trust_note`, and a large primary CTA: **"Donate on {name}'s official website ↗"** → `/go/{slug}`. Add `generateMetadata` for nice link previews.
- `components/directory/OrgCard.tsx` — logo, name, tagline, category chip, up to 3 cause chips, a subtle "Verified official link" tick when `is_verified`, and a **"Donate ↗"** button (→ `/go/{slug}`, new tab). Directly under the button, small muted text: *"Opens {org}'s official site — you pay them directly."*
- `components/directory/DirectoryFilters.tsx` — cause/country filter (client leaf).
- Wire into missions: on the mission page **Track B**, if the mission has `mission_orgs`, render those orgs as give options using the same `OrgCard`/`/go/{slug}` flow. In `manage`, let the owner search the directory and attach orgs to their mission.
- Admin: extend `app/admin/` with an **Organizations manager** (CRUD): add/edit orgs, set `donate_url`, toggle `is_verified` (only after a human confirms it's the real official site), feature/reorder, and moderate. Reuse the `is_admin()` gate.

### C.4 — Non-negotiable trust rules for the directory
- **Asar never touches money.** No payment fields, no amounts collected in-app, no "process donation" anywhere. Only outbound links to official org sites.
- Show the "you donate on their own official site" disclaimer on the directory page, every card, and the detail page.
- Only set `is_verified = true` after a human confirms the `donate_url` is the organization's genuine official domain (scam look-alike donation sites are a real problem — e.g. fake "Edhi" sites exist). Un-verified orgs still list but without the verified tick.
- Never display an org's logo/name in a way that implies partnership or endorsement by them; the copy is "We link you to trusted organizations," not "Our partners."

**Definition of Done:** `/give` lists orgs with descriptions and cause filters; clicking "Donate" opens **that org's own official donation page in a new tab** (via `/go/{slug}`, click counted); no payment ever happens inside Asar; disclaimers appear on directory, card, and detail; admins can CRUD orgs and mark verified; mission Track B can pull from the directory.

---

## Seed data — vetted organizations (starter list)

> Seed these into `organizations`. **Before going live: open each site, confirm it's the organization's genuine official domain, copy the *current* donate-page URL into `donate_url`, and get listing permission where appropriate.** Set `is_verified = true` only after you've confirmed the link by hand. Domains below are the organizations' official sites as researched; treat deep `donate_url`s as "confirm the live path."

### Pakistan-based

| Name | Category / causes | What to say (description seed) | Official site → donate |
|---|---|---|---|
| **Edhi Foundation** | emergency_relief · orphan_care | Pakistan's largest humanitarian NGO — 24/7 ambulances, shelters, and care for abandoned infants and orphans. | edhi.org → donate.edhi.org |
| **Alkhidmat Foundation — Orphan Care / Aghosh Homes** | orphan_care · education | Runs Aghosh orphanage homes and an orphan-family support program: housing, schooling, healthcare for thousands of orphaned children. | alkhidmat.org → alkhidmat.org/orphan · alkhidmat.org/aghosh |
| **SOS Children's Villages Pakistan** | orphan_care | Family-based homes for orphaned and abandoned children since 1977 (villages, schools, youth homes); "sponsor a child" model. | sos.org.pk → sos.org.pk/Donations |
| **Saylani Welfare** | food_hunger · health_medical · education | Large-scale meal programs (from ~PKR 300/meal), food, healthcare, vocational training, clean water. | saylaniwelfare.com → saylaniwelfare.com (donate) |
| **The Citizens Foundation (TCF)** | education | One of Pakistan's largest nonprofit school networks — quality education for children in low-income communities. | tcf.org.pk → tcf.org.pk (donate) |
| **Shaukat Khanum Memorial Cancer Hospital** | health_medical | Free, world-class cancer diagnosis and treatment for underprivileged patients. *(Confirm official donate URL.)* | shaukatkhanum.org.pk |
| **SIUT** (Sindh Institute of Urology & Transplantation) | health_medical | Free kidney, urology, and transplant care — "no one is turned away." *(Confirm official donate URL.)* | siut.org |
| **Indus Hospital & Health Network** | health_medical | Free, high-quality hospital care across a growing national network. *(Confirm official donate URL.)* | indushospital.org.pk |
| **Transparent Hands** | health_medical | Healthcare crowdfunding — fund a specific patient's surgery and see the case. Great fit for concrete missions. *(Confirm.)* | transparenthands.org |
| **Akhuwat Foundation** | microfinance · education | Interest-free microloans that help families start businesses and become self-sufficient. *(Confirm.)* | akhuwat.org.pk |
| **LRBT** (Layton Rahmatulla Benevolent Trust) | health_medical | Pakistan's largest free eye-care network — restoring sight for those who can't afford it. *(Confirm.)* | lrbt.org.pk |
| **Chhipa Welfare** | emergency_relief · food_hunger · orphan_care | Ambulances, food distribution, and shelter for orphans, women, and the elderly. *(Confirm.)* | chhipa.org |
| **JDC Foundation** | emergency_relief · food_hunger | Ambulance service, food, and welfare relief. *(Confirm.)* | jdcwelfare.org |

### International

| Name | Category / causes | Description seed | Official site |
|---|---|---|---|
| **Islamic Relief Worldwide** | orphan_care · water · food_hunger · emergency_relief | Global NGO (since 1984) — orphan sponsorship, clean water, food, and emergency response in 40+ countries. | islamic-relief.org |
| **Muslim Hands** | orphan_care · education · water | International charity — orphan care, schools, and water projects worldwide. | muslimhands.org.uk |
| **UNICEF** | general_welfare · health_medical · education | The UN agency for children — health, nutrition, education, and protection globally. | unicef.org |
| **charity: water** | water | 100%-model nonprofit funding clean-water projects in the developing world. | charitywater.org |
| **ShareTheMeal (UN WFP)** | food_hunger | UN World Food Programme app — fund meals for hungry children with a tap. | sharethemeal.org |
| **Save the Children** | general_welfare · education · emergency_relief | Global children's charity — education, health, and crisis response. | savethechildren.net |

Suggested `causes` vocabulary (for chips/filters): `orphans`, `meals`, `water`, `education`, `health`, `cancer`, `eye-care`, `emergency`, `microfinance`, `shelter`, `children`.

---

## Background photos (licensed, free for commercial use)

Download from these sources, then drop into `/public/backgrounds/`. **Unsplash License** and **Pexels License** both allow free commercial + personal use with no attribution required (a credit is appreciated). **Pixabay Content License** is similar. Note: for photos with clearly identifiable people used in *marketing*, prefer images marked with model releases, or choose hands/scenery/candles to stay safe.

Use these exact search URLs (each returns many usable images):

**Celebration / birthday warmth**
- https://unsplash.com/s/photos/birthday-candles
- https://www.pexels.com/search/birthday%20celebration/
- https://unsplash.com/s/photos/warm-bokeh

**Giving / helping hands (safe, no faces)**
- https://unsplash.com/s/photos/helping-hands
- https://www.pexels.com/search/helping%20hands/
- https://pixabay.com/images/search/helping%20hands/

**Community & volunteers**
- https://unsplash.com/s/photos/community-volunteer
- https://www.pexels.com/search/volunteers/

**Children & education**
- https://unsplash.com/s/photos/children-classroom
- https://www.pexels.com/search/children%20learning/

**Shared meal / food for others**
- https://unsplash.com/s/photos/sharing-food
- https://www.pexels.com/search/community%20meal/

**Trees / growth / nature (for "plant" missions)**
- https://unsplash.com/s/photos/planting-tree
- https://www.pexels.com/search/planting%20tree/

**Soft abstract / warm gradient backgrounds (best for text-heavy heroes)**
- https://unsplash.com/s/photos/soft-gradient-warm
- https://www.pexels.com/search/warm%20abstract%20background/

Picking tips: for hero sections with overlaid text, favor **soft, low-detail, warmer-lit** images (a busy photo fights the type) and always apply the `--scrim-hero` overlay. Aim for landscape ≥ 2000px wide; compress before committing.

---

## Reminders (important, not legal advice)
- **Confirm every `donate_url` by hand** and set `is_verified` only then — scam look-alike donation sites exist even for major charities.
- **Get permission** before featuring an organization's name/logo, and present Asar as "we link you to trusted causes," not "our partners."
- **Never claim a legal status Asar doesn't have** (nonprofit/NGO/charity/tax-exempt) anywhere in the product.
- Keep Asar strictly out of the money path: list + describe + link out only.