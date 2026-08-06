# Asar — Fix & Complete Prompt (v3, for Claude Code)

> Four fixes: (1) audit the app and complete the blank dashboard + any missing screens, (2) add a background image to login & sign-up, (3) replace the hero copy with meaningful, Islamic-resonant messaging, (4) replace the placeholder asterisk with a real custom logo. Keep the existing white theme (evergreen `#0E7C66` + gold `#C39A3E`, Fraunces + Inter). Do the fixes in order and report what was missing.

---

## FIX 1 — Audit the whole app and complete the Dashboard + any missing screens

`localhost:3000/dashboard` currently renders blank. Fix it, then sweep the rest of the app for incomplete/blank screens.

### 1a. First, audit
Walk every route and produce a short report: for each page, mark **Complete / Stubbed / Blank / Missing**, and note what data or states are absent. Cover: landing, how-it-works, about, login, signup, auth callback, dashboard, mission create flow, mission public page (+ live dashboard), mission manage, mission reveal, settings, give directory, org detail, `/go/[slug]` redirect, and all admin pages. Then complete everything not "Complete."

### 1b. Build the Dashboard (`app/(app)/dashboard/page.tsx`)
Server Component. Load the signed-in user's profile + their missions joined with the `mission_totals` view. Layout:

- **Header row:** a warm greeting — `Assalamu alaikum, {first name}` (fall back to `Welcome back` if no name) — and a primary pill CTA **"Start a mission"** on the right.
- **Stats strip** (only if the user has ≥1 mission): three quiet stat tiles — total **lives touched** across all missions, total **contributors**, and **next birthday countdown**. Numbers in Fraunces, tabular-nums, count-up on mount.
- **Empty state** (no missions): a centered, elegant block — the logo mark, a warm line (`Your first mission is waiting. Turn this birthday into something that lasts.`), and the **"Start a mission"** CTA. No empty grid, no bare white page.
- **Active missions:** a responsive grid of `MissionCard`s. Each card shows: mission icon + title, a small **progress ring** with the live tally in the center, a **countdown chip** (days to birthday, or "Sprint" if <48h, or "Completed"), a **status badge** (Active / Completed), visibility icon, and a row of quiet actions: **View**, **Manage**, **Copy link**, **Share**. Card is fully clickable to the mission page.
- **Completed missions:** a second section below, same cards but with a **"View reveal"** action linking to `/[slug]/reveal`.
- Wrap data reads in `<Suspense>` with dimension-matched skeleton cards. Handle the error state (a calm retry block, never a stack trace).

Build `components/mission/MissionCard.tsx` and a `DashboardStats.tsx` (client leaf for the count-up). Reuse the existing `ProgressRing`/`TallyCounter` if present; if they're missing, build them per the design system (evergreen ring on hairline track, gold glow at milestones).

### 1c. Complete every other incomplete screen
For anything marked Stubbed/Blank/Missing in 1a, finish it end-to-end and ensure **every** page has proper **loading (skeleton), empty, and error** states, is mobile-responsive, RSC-first, RLS-backed, and matches the white theme. Pay special attention to: the mission public page live dashboard, the three contribution tracks, the wish wall, the reveal, and the give directory + `/go` redirect.

**Definition of Done:** `/dashboard` shows the greeting, stats, and mission cards (or a beautiful empty state) with live tallies and countdowns; no route in the app renders blank; every page has loading/empty/error states; audit report delivered.

---

## FIX 2 — Add a background image to Login & Sign-up

The auth pages are plain. Make them feel like the landing page.

- Wrap `app/(auth)/login/page.tsx` and `signup/page.tsx` in the existing `PhotoBackground` component using a warm image from `/public/backgrounds/` (candles / soft warm bokeh reads best behind a form), with the `--scrim-hero` overlay so text stays legible.
- Center a `GlassCard` (frosted white, `backdrop-blur`, hairline border) holding the form. Top of the card: the **logo** (mark + wordmark) and a one-line welcome (`Welcome back` / `Create your Asar`). Inputs and buttons use the normal theme tokens with ink text — never light text on glass.
- Keep the magic-link + Google buttons; ensure focus-visible rings and AA contrast over the glass.
- Mobile: image goes full-bleed, card is near-full-width and vertically centered; never let the form sit on a raw photo without the scrim.

**Definition of Done:** both auth pages show a warm background photo with a legible glass card, the logo at the top, and fully accessible inputs on mobile and desktop.

---

## FIX 3 — Replace the hero copy with meaningful, Islamic-resonant messaging

Replace **"Don't ask for gifts. Ask people to join your purpose."** with copy grounded in the meaning of the name and in *sadaqah jariyah* (ongoing charity). Put all strings in `lib/copy.ts` so they're easy to edit, and keep the two existing CTAs.

**Framing to hold onto:** *Asar (أثر)* literally means **the trace, mark, or impact you leave behind** — which is the very idea of *sadaqah jariyah*: good that keeps benefiting people. The tone is warm and sincere, **not preachy**. Keep it inclusive enough that a non-Muslim friend still feels welcome to join.

### Primary (recommended)
- **Eyebrow:** `No payments. No pressure. Just sincere good.`
- **Headline** (Fraunces; two lines, second line in evergreen like the current design):
  - line 1 (ink): `This year, don't just turn a year older —`
  - line 2 (evergreen): `leave a mark that keeps giving.`
- **Sub:** `Asar (أثر) means the trace you leave behind. In the weeks before your birthday, invite friends to pledge an act of good — a meal, a planted tree, clean water, a kind word — and on the day, see the ongoing charity you built together.`
- **CTAs:** `Start my mission` · `Browse causes`
- **Micro:** `Free. Takes about two minutes. Your friends don't need an account.`

### Alternates (include as options in copy.ts)
- **Alt A** — `Turn your birthday into sadaqah jariyah.` / sub: `Ongoing charity that keeps benefiting people long after the day — the best gift to give, and to receive.`
- **Alt B** — `Don't count another candle. Light one that keeps burning.` / sub about ongoing good.

### Add a quiet hadith band (new section under the hero)
Build `components/brand/HadithBand.tsx` — a calm, centered band on `--color-surface-2` with a thin gold top-hairline. Tasteful, small, not shouty:

- (Optional) Arabic line, elegantly set: `إِذَا مَاتَ الْإِنْسَانُ انْقَطَعَ عَمَلُهُ إِلَّا مِنْ ثَلَاثٍ …`
- English (Fraunces italic): `"When a person dies, their deeds come to an end except three: an ongoing charity, beneficial knowledge, and a righteous child who prays for them."`
- Attribution (small, ink-500): `— Prophet Muhammad ﷺ · reported in Sahih Muslim`

**Optional nice touch:** in the "how it works" or causes section, note that Asar's mission types echo deeds the Sunnah describes as ongoing — *planting a tree, giving water, sharing knowledge, feeding others.* Keep it one line, not a lecture.

> **Accuracy note for the founder (do not skip):** the hadith above is authentic (reported in Sahih Muslim; also Riyad as-Salihin 1383 and Sunan an-Nasa'i 3651). Translations vary slightly — before publishing, confirm the exact English wording you want against an authentic source such as sunnah.com, and consider having a local scholar glance over the religious copy. Keep the ﷺ symbol after the Prophet's name.

**Definition of Done:** the hero shows the new meaningful copy; a tasteful hadith band appears with correct attribution and the ﷺ symbol; all strings live in `lib/copy.ts`; tone is sincere and not preachy.

---

## FIX 4 — Replace the placeholder asterisk with a custom logo

Pick ONE mark below (recommended: **Athar flame**), build a proper `Logo` component, and replace the asterisk everywhere (header, footer, auth card, favicon, OG image).

### 4a. Build `components/brand/Logo.tsx`
- Props: `variant` (`full` = mark + "Asar" wordmark in Fraunces evergreen · `mark` = mark only), `size` (px, default 28), `className`.
- The wordmark is the word **Asar** set in Fraunces, weight 500, color `--color-primary-500`, slight negative tracking, vertically centered with the mark.
- Export the raw SVG so it can also be used for `app/icon.svg` (favicon), `app/apple-icon.png`, and the OG mark. Use the **mark on an evergreen rounded-square token** for favicon/app-icon sizes (reads better tiny); use the plain mark inline in the header.

### 4b. The four marks (drop-in SVG, evergreen `#0E7C66` / dark `#0B5F4F`, gold `#C39A3E` / light `#E4CC8A`)

**① Athar flame — recommended** (birthday candle + leaf; celebration that keeps growing)
```svg
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Asar">
  <rect x="4" y="4" width="40" height="40" rx="12" fill="#0E7C66"/>
  <path d="M24 13 C27 18 31 21 31 26 C31 30.5 28 34 24 34 C20 34 17 30.5 17 26 C17 21 21 18 24 13 Z" fill="#C39A3E"/>
  <path d="M24 20 C26 23 27.5 25 27.5 27.5 C27.5 30 26 32 24 32 C22 32 20.5 30 20.5 27.5 C20.5 25 22 23 24 20 Z" fill="#E4CC8A"/>
</svg>
```
*(Inline/header variant: drop the `<rect>` token and render the flame in evergreen `#0E7C66` on transparent, or keep the token — your call.)*

**② Impact ripple** (one act at the center, spreading outward — the trace a deed leaves)
```svg
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Asar">
  <circle cx="24" cy="24" r="17" fill="none" stroke="#0E7C66" stroke-width="2" opacity="0.32"/>
  <circle cx="24" cy="24" r="11" fill="none" stroke="#0E7C66" stroke-width="2.5"/>
  <circle cx="24" cy="24" r="5" fill="#C39A3E"/>
</svg>
```

**③ Eight-point star / khatam** (classic Islamic geometry — rooted and elegant)
```svg
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Asar">
  <rect x="12" y="12" width="24" height="24" rx="4" fill="#0E7C66"/>
  <rect x="12" y="12" width="24" height="24" rx="4" fill="#0B5F4F" transform="rotate(45 24 24)"/>
  <circle cx="24" cy="24" r="5" fill="#C39A3E"/>
</svg>
```

**④ A-spark monogram** (letter A + a celebratory spark; great at favicon size)
```svg
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Asar">
  <text x="24" y="35" font-family="Fraunces, Georgia, serif" font-size="34" font-weight="600" fill="#0E7C66" text-anchor="middle">A</text>
  <path d="M35 9 L36 12.2 L39 13 L36 13.8 L35 17 L34 13.8 L31 13 L34 12.2 Z" fill="#C39A3E"/>
</svg>
```
*(For the monogram favicon, convert the "A" to an outlined path or self-host Fraunces so the glyph renders without the web font.)*

### 4c. Wire it up
- Replace every current asterisk/logo usage with `<Logo />` (`full` in header/footer/auth card, `mark` where space is tight).
- Add `app/icon.svg` (the mark on the evergreen token) and an `apple-icon`, and use the mark in the dynamic OG image.
- Remove the old placeholder SVG asset.

**Definition of Done:** the chosen custom mark appears in the header, footer, auth card, favicon/tab icon, and OG image; the old asterisk is gone; the logo is crisp from favicon size up to hero size.

---

## Order & reporting
Do the fixes in order **1 → 2 → 3 → 4**. After Fix 1, paste the audit report. After each fix, self-check against its Definition of Done before moving on. Keep everything on the white theme, RSC-first, RLS-backed, and accessible (AA contrast, focus-visible, `prefers-reduced-motion`).