-- =====================================================================
-- Asar — 01. Core schema
-- Mission-based birthday model (no payment gateway, no NGO partners yet)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type mission_visibility as enum ('public', 'link', 'friends');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mission_tone as enum ('playful', 'serious');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mission_status as enum ('draft', 'active', 'revealed', 'archived');
exception when duplicate_object then null; end $$;

-- The three participation tracks of section 3 of the spec.
--   pledge        -> Track A  (C-101..C-104)
--   external_give -> Track B  (C-201..C-203)
--   volunteer     -> Track C  (C-301)
--   share         -> Track C  (C-302)
--   wish          -> Track C  (C-304) wish-only, zero pressure
do $$ begin
  create type contribution_track as enum ('pledge', 'external_give', 'volunteer', 'share', 'wish');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contribution_status as enum ('pledged', 'fulfilled', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type flag_status as enum ('open', 'dismissed', 'actioned');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- profiles — one row per authenticated account (campaign owners + admins)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text        not null default 'Friend',
  email        text,
  avatar_url   text,
  birthday     date,
  is_admin     boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Account profile for campaign owners. Created automatically on sign-up.';

-- ---------------------------------------------------------------------
-- mission_templates — preset missions (M-01), admin-managed (A-M01)
-- ---------------------------------------------------------------------
create table if not exists public.mission_templates (
  id              uuid primary key default gen_random_uuid(),
  slug            text        not null unique,
  title           text        not null,                 -- "Feed 100 people"
  short_label     text        not null,                 -- "Feed people"
  icon            text        not null default '🎁',
  category        text        not null default 'general',
  unit_singular   text        not null,                 -- "meal"
  unit_plural     text        not null,                 -- "meals"
  action_verb     text        not null default 'fund',  -- "fund 5 meals"
  default_goal    integer     not null default 100 check (default_goal > 0),
  -- Unit conversion (A-M01): how many "lives touched" one unit represents.
  lives_per_unit  numeric(10, 3) not null default 1 check (lives_per_unit >= 0),
  -- Low-friction small asks (section 8): default pledge chips.
  increments      integer[]   not null default '{1,2,5}',
  accent          text        not null default 'ember',
  blurb           text,
  is_active       boolean     not null default true,
  sort_order      integer     not null default 100,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.mission_templates is 'Preset missions offered in the mission selector; editable by platform admins (A-M01).';

-- ---------------------------------------------------------------------
-- missions — one birthday campaign
-- ---------------------------------------------------------------------
create table if not exists public.missions (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  template_id    uuid references public.mission_templates (id) on delete set null,

  slug           text not null unique,
  -- Unguessable token for 'link' / 'friends' visibility (M-06).
  share_token    uuid not null default gen_random_uuid(),

  title          text not null,
  headline       text not null default 'Join my purpose',
  story          text,

  -- Denormalised from the template so an admin edit never rewrites history,
  -- and so custom missions (M-02) use exactly the same columns.
  icon           text not null default '🎁',
  unit_singular  text not null,
  unit_plural    text not null,
  action_verb    text not null default 'fund',
  lives_per_unit numeric(10, 3) not null default 1 check (lives_per_unit >= 0),
  increments     integer[] not null default '{1,2,5}',
  goal_amount    integer not null check (goal_amount > 0),

  birthday_date  date not null,
  -- M-03: start = creation. M-04/M-05: the countdown target.
  starts_at      timestamptz not null default now(),
  reveal_at      timestamptz not null,

  visibility     mission_visibility not null default 'public',
  tone           mission_tone       not null default 'playful',
  status         mission_status     not null default 'active',
  accent         text not null default 'ember',

  -- Section 8 guardrails, owner-controlled.
  allow_wish_only     boolean not null default true,
  allow_external_give boolean not null default true,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint missions_reveal_after_start check (reveal_at > starts_at)
);

create index if not exists missions_owner_idx      on public.missions (owner_id, created_at desc);
create index if not exists missions_slug_idx       on public.missions (slug);
create index if not exists missions_reveal_idx     on public.missions (reveal_at);
create index if not exists missions_visibility_idx on public.missions (visibility, status);

comment on column public.missions.share_token is 'Secret token required to open a link-only or friends-only mission (M-06).';

-- ---------------------------------------------------------------------
-- external_links — Track B destinations (C-201), moderated (A-M03)
-- ---------------------------------------------------------------------
create table if not exists public.external_links (
  id           uuid primary key default gen_random_uuid(),
  mission_id   uuid not null references public.missions (id) on delete cascade,
  label        text not null,
  url          text not null,
  provider     text,                                   -- 'upi' | 'paypal' | 'gofundme' | 'ngo' | 'other'
  note         text,
  moderation   moderation_status not null default 'pending',
  review_note  text,
  reviewed_by  uuid references public.profiles (id) on delete set null,
  reviewed_at  timestamptz,
  click_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  constraint external_links_url_is_https check (url ~* '^https?://')
);

create index if not exists external_links_mission_idx    on public.external_links (mission_id);
create index if not exists external_links_moderation_idx on public.external_links (moderation, created_at desc);

-- ---------------------------------------------------------------------
-- link_clicks — C-203 click-through tracking (anonymous, hashed visitor)
-- ---------------------------------------------------------------------
create table if not exists public.link_clicks (
  id           bigserial primary key,
  link_id      uuid not null references public.external_links (id) on delete cascade,
  mission_id   uuid not null references public.missions (id) on delete cascade,
  visitor_hash text not null,
  created_at   timestamptz not null default now()
);

create index if not exists link_clicks_mission_idx on public.link_clicks (mission_id, created_at desc);
create unique index if not exists link_clicks_unique_visitor
  on public.link_clicks (link_id, visitor_hash);

-- ---------------------------------------------------------------------
-- contributions — every act of participation, all five tracks, one table.
-- Each row always carries a message (W-03 "wish + action" is inseparable).
-- ---------------------------------------------------------------------
create table if not exists public.contributions (
  id                uuid primary key default gen_random_uuid(),
  mission_id        uuid not null references public.missions (id) on delete cascade,
  track             contribution_track not null,

  contributor_name  text not null default 'A friend',
  contributor_id    uuid references public.profiles (id) on delete set null,
  is_anonymous      boolean not null default false,

  -- What was promised, in the mission's own unit.
  quantity          numeric(12, 2) not null default 0 check (quantity >= 0),
  unit              text,
  action_label      text,                       -- "fund 5 meals", "donate blood"
  hours             numeric(6, 2) default null, -- C-301 volunteer hours

  status            contribution_status not null default 'pledged',
  fulfilled_at      timestamptz,

  -- C-104 / T-03 proof (never called "verified" — see T-01)
  proof_url         text,
  proof_note        text,

  -- Track B
  external_link_id  uuid references public.external_links (id) on delete set null,
  reported_amount   text,                       -- C-202 free text, e.g. "PKR 2,000"

  message           text,                       -- W-01 combo message
  owner_reaction    text,                       -- W-04 owner's emoji reaction

  endorsement_count integer not null default 0, -- T-02
  open_flag_count   integer not null default 0, -- T-05
  is_hidden         boolean not null default false,

  -- Secret handed back to the (anonymous) contributor so they can later
  -- self-confirm the pledge (C-102). Never exposed to readers.
  manage_token      uuid not null default gen_random_uuid(),
  visitor_hash      text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint contributions_fulfilled_consistency
    check ((status = 'fulfilled') = (fulfilled_at is not null)),
  -- Wishes and shares never move the tally; only real actions do.
  constraint contributions_zero_quantity_tracks
    check (track not in ('wish', 'share') or quantity = 0)
);

create index if not exists contributions_mission_idx on public.contributions (mission_id, created_at desc);
create index if not exists contributions_track_idx   on public.contributions (mission_id, track, status);
create index if not exists contributions_recent_idx  on public.contributions (created_at desc);

comment on column public.contributions.manage_token is 'Bearer secret for anonymous contributors to confirm their own pledge. Not granted to anon/authenticated roles.';

-- ---------------------------------------------------------------------
-- endorsements — T-02 "2 friends confirmed this happened"
-- ---------------------------------------------------------------------
create table if not exists public.endorsements (
  id              uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  mission_id      uuid not null references public.missions (id) on delete cascade,
  endorser_name   text not null default 'A friend',
  endorser_hash   text not null,
  created_at      timestamptz not null default now(),
  unique (contribution_id, endorser_hash)
);

-- ---------------------------------------------------------------------
-- pledge_flags — T-05 anti-fraud flagging, feeds the admin queue (A-M02)
-- ---------------------------------------------------------------------
create table if not exists public.pledge_flags (
  id              uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  mission_id      uuid not null references public.missions (id) on delete cascade,
  reason          text not null,
  details         text,
  reporter_hash   text,
  status          flag_status not null default 'open',
  resolution_note text,
  reviewed_by     uuid references public.profiles (id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (contribution_id, reporter_hash)
);

create index if not exists pledge_flags_status_idx on public.pledge_flags (status, created_at desc);

-- ---------------------------------------------------------------------
-- platform_settings — A-M04 trust-score configuration, key/value
-- ---------------------------------------------------------------------
create table if not exists public.platform_settings (
  key        text primary key,
  value      jsonb not null,
  label      text,
  -- Some settings are deliberately public: the transparency note and the
  -- trust labels are shown on every mission page, and hiding the rules by
  -- which pledges are labelled would defeat the point of them.
  is_public  boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists missions_touch on public.missions;
create trigger missions_touch before update on public.missions
  for each row execute function public.touch_updated_at();

drop trigger if exists contributions_touch on public.contributions;
create trigger contributions_touch before update on public.contributions
  for each row execute function public.touch_updated_at();

drop trigger if exists mission_templates_touch on public.mission_templates;
create trigger mission_templates_touch before update on public.mission_templates
  for each row execute function public.touch_updated_at();

-- Profile bootstrap: every auth user gets a profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, birthday)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'birthday', '')::date
  )
  on conflict (id) do update
    set email        = excluded.email,
        display_name = coalesce(nullif(public.profiles.display_name, 'Friend'), excluded.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the denormalised trust counters honest.
create or replace function public.sync_endorsement_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.contribution_id, old.contribution_id);
begin
  update public.contributions c
     set endorsement_count = (select count(*) from public.endorsements e where e.contribution_id = target)
   where c.id = target;
  return null;
end;
$$;

drop trigger if exists endorsements_sync on public.endorsements;
create trigger endorsements_sync
  after insert or delete on public.endorsements
  for each row execute function public.sync_endorsement_count();

create or replace function public.sync_flag_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.contribution_id, old.contribution_id);
begin
  update public.contributions c
     set open_flag_count = (
           select count(*) from public.pledge_flags f
            where f.contribution_id = target and f.status = 'open'
         )
   where c.id = target;
  return null;
end;
$$;

drop trigger if exists pledge_flags_sync on public.pledge_flags;
create trigger pledge_flags_sync
  after insert or update or delete on public.pledge_flags
  for each row execute function public.sync_flag_count();

-- Track B click counter stays in step with the click log.
create or replace function public.sync_link_click_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.external_links l
     set click_count = (select count(*) from public.link_clicks c where c.link_id = new.link_id)
   where l.id = new.link_id;
  return null;
end;
$$;

drop trigger if exists link_clicks_sync on public.link_clicks;
create trigger link_clicks_sync
  after insert on public.link_clicks
  for each row execute function public.sync_link_click_count();
