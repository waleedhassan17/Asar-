-- =====================================================================
-- Asar — 06. Curated donation directory
--
-- Asar lists organizations and links out to them. It never collects,
-- holds, processes or routes a single unit of currency: the "Donate"
-- control is an outbound link to the organization's OWN official
-- donation page, and the only thing stored on this side is a click
-- counter.
--
-- Same security model as the rest of the schema: RLS denies by default,
-- anon/authenticated get read-only column grants, and every write goes
-- through a SECURITY DEFINER function that re-checks who is calling.
-- =====================================================================

do $$ begin
  create type org_category as enum (
    'orphan_care','food_hunger','health_medical','education',
    'water','emergency_relief','microfinance','general_welfare'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------
create table if not exists public.organizations (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  tagline      text,                                    -- one short line
  description  text,                                    -- 2–4 honest sentences
  logo_url     text,
  cover_url    text,
  category     org_category not null,
  causes       text[] not null default '{}',            -- ['orphans','meals','water']
  country      text not null default 'Pakistan',
  website_url  text,
  -- The destination of the click: the ORG'S OWN official donation page.
  donate_url   text not null,
  -- True only once a human has opened the site and confirmed the domain
  -- is genuinely the organization's. Look-alike donation domains exist
  -- for well-known charities, so this flag is never set automatically.
  is_verified  boolean not null default false,
  is_featured  boolean not null default false,
  trust_note   text,
  clicks       int not null default 0,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint organizations_donate_url_is_http check (donate_url ~* '^https?://'),
  constraint organizations_website_url_is_http check (website_url is null or website_url ~* '^https?://')
);

create index if not exists organizations_category_idx on public.organizations (category, sort_order);
create index if not exists organizations_country_idx  on public.organizations (country);
create index if not exists organizations_causes_idx   on public.organizations using gin (causes);
create index if not exists organizations_order_idx    on public.organizations (is_featured desc, sort_order, name);

comment on column public.organizations.donate_url is
  'The organization''s own official donation page. Asar only ever redirects here; no payment happens inside Asar.';
comment on column public.organizations.is_verified is
  'A human confirmed donate_url is the organization''s genuine official domain. Never set this from an import.';

drop trigger if exists organizations_touch on public.organizations;
create trigger organizations_touch before update on public.organizations
  for each row execute function public.touch_updated_at();

alter table public.organizations enable row level security;

-- Supabase's default privileges hand every new table in `public` to anon
-- and authenticated. Take that back before granting the read-only
-- columns: a client that could UPDATE this table could point a "Donate"
-- button at a look-alike site.
revoke all on public.organizations from anon, authenticated;

drop policy if exists organizations_public_read on public.organizations;
create policy organizations_public_read on public.organizations
  for select to anon, authenticated
  using (true);

-- Writes are deliberately not granted to any client role: the admin CRUD
-- below runs as SECURITY DEFINER and re-checks is_platform_admin().
grant select (
  id, slug, name, tagline, description, logo_url, cover_url, category,
  causes, country, website_url, donate_url, is_verified, is_featured,
  trust_note, clicks, sort_order, created_at
) on public.organizations to anon, authenticated;

-- ---------------------------------------------------------------------
-- mission_orgs — a mission owner curates which listed organizations
-- their friends see on the mission page (feeds Track B).
-- ---------------------------------------------------------------------
create table if not exists public.mission_orgs (
  id              uuid primary key default gen_random_uuid(),
  mission_id      uuid not null references public.missions (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  unique (mission_id, organization_id)
);

create index if not exists mission_orgs_mission_idx on public.mission_orgs (mission_id, sort_order);

alter table public.mission_orgs enable row level security;

revoke all on public.mission_orgs from anon, authenticated;

drop policy if exists mission_orgs_read on public.mission_orgs;
create policy mission_orgs_read on public.mission_orgs
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.missions m
       where m.id = mission_id
         and (
           (m.visibility in ('public', 'link') and m.status <> 'draft')
           or m.owner_id = auth.uid()
           or public.is_platform_admin()
         )
    )
  );

grant select (id, mission_id, organization_id, sort_order, created_at)
  on public.mission_orgs to anon, authenticated;

-- ---------------------------------------------------------------------
-- Click counting (C.2 step 2)
--
-- Fire-and-forget: the redirect must never wait on, or fail because of,
-- a counter. No auth required and no write privilege is exposed.
-- ---------------------------------------------------------------------
create or replace function public.increment_org_click(p_slug text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.organizations set clicks = clicks + 1 where slug = p_slug;
$$;

-- ---------------------------------------------------------------------
-- Reads
-- ---------------------------------------------------------------------

-- The organizations a mission owner has attached to their mission,
-- resolved through the same visibility rules as the mission itself.
create or replace function public.api_mission_orgs(p_slug text, p_token uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  m public.missions;
begin
  m := public.resolve_mission(p_slug, p_token);

  return coalesce((
    select jsonb_agg(to_jsonb(o) order by mo.sort_order, o.name)
      from public.mission_orgs mo
      join public.organizations o on o.id = mo.organization_id
     where mo.mission_id = m.id
  ), '[]'::jsonb);
end;
$$;

-- Directory search used by the mission owner's manage screen.
create or replace function public.api_search_organizations(p_query text default null, p_limit int default 12)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.is_featured desc, x.sort_order, x.name), '[]'::jsonb)
    from (
      select o.*
        from public.organizations o
       where coalesce(trim(p_query), '') = ''
          or o.name ilike '%' || trim(p_query) || '%'
          or o.tagline ilike '%' || trim(p_query) || '%'
          or exists (select 1 from unnest(o.causes) c where c ilike '%' || trim(p_query) || '%')
       order by o.is_featured desc, o.sort_order, o.name
       limit greatest(1, least(coalesce(p_limit, 12), 50))
    ) x;
$$;

-- ---------------------------------------------------------------------
-- Mission owner: attach / detach directory organizations
-- ---------------------------------------------------------------------
create or replace function public.api_attach_mission_org(p_mission_id uuid, p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner uuid;
  row_count int;
begin
  select m.owner_id into owner from public.missions m where m.id = p_mission_id;
  if owner is null then
    raise exception 'MISSION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if owner <> auth.uid() then
    raise exception 'NOT_MISSION_OWNER' using errcode = '42501';
  end if;

  select count(*) into row_count from public.mission_orgs where mission_id = p_mission_id;
  if row_count >= 8 then
    raise exception 'TOO_MANY_ORGS' using errcode = '23514';
  end if;

  if not exists (select 1 from public.organizations o where o.id = p_organization_id) then
    raise exception 'ORG_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.mission_orgs (mission_id, organization_id, sort_order)
  values (p_mission_id, p_organization_id, row_count)
  on conflict (mission_id, organization_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.api_detach_mission_org(p_mission_id uuid, p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.missions m where m.id = p_mission_id and m.owner_id = auth.uid()
  ) then
    raise exception 'NOT_MISSION_OWNER' using errcode = '42501';
  end if;

  delete from public.mission_orgs
   where mission_id = p_mission_id and organization_id = p_organization_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- Admin CRUD (A-M06)
-- ---------------------------------------------------------------------
create or replace function public.api_admin_upsert_organization(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  o public.organizations;
begin
  if not public.is_platform_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  insert into public.organizations (
    id, slug, name, tagline, description, logo_url, cover_url, category,
    causes, country, website_url, donate_url, is_verified, is_featured,
    trust_note, sort_order
  ) values (
    coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid()),
    public.slugify(coalesce(nullif(p ->> 'slug', ''), p ->> 'name')),
    left(trim(p ->> 'name'), 120),
    left(nullif(trim(p ->> 'tagline'), ''), 160),
    left(nullif(trim(p ->> 'description'), ''), 1200),
    nullif(trim(p ->> 'logo_url'), ''),
    nullif(trim(p ->> 'cover_url'), ''),
    coalesce(nullif(p ->> 'category', ''), 'general_welfare')::org_category,
    coalesce(
      (select array_agg(distinct left(trim(c), 40)) from jsonb_array_elements_text(
         case when jsonb_typeof(p -> 'causes') = 'array' then p -> 'causes' else '[]'::jsonb end
       ) c where trim(c) <> ''),
      '{}'
    ),
    left(coalesce(nullif(trim(p ->> 'country'), ''), 'Pakistan'), 60),
    nullif(trim(p ->> 'website_url'), ''),
    trim(p ->> 'donate_url'),
    coalesce((p ->> 'is_verified')::boolean, false),
    coalesce((p ->> 'is_featured')::boolean, false),
    left(nullif(trim(p ->> 'trust_note'), ''), 240),
    coalesce((p ->> 'sort_order')::integer, 100)
  )
  on conflict (id) do update set
    slug = excluded.slug, name = excluded.name, tagline = excluded.tagline,
    description = excluded.description, logo_url = excluded.logo_url,
    cover_url = excluded.cover_url, category = excluded.category,
    causes = excluded.causes, country = excluded.country,
    website_url = excluded.website_url, donate_url = excluded.donate_url,
    is_verified = excluded.is_verified, is_featured = excluded.is_featured,
    trust_note = excluded.trust_note, sort_order = excluded.sort_order
  returning * into o;

  return to_jsonb(o);
end;
$$;

create or replace function public.api_admin_delete_organization(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  delete from public.organizations where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- Everything an admin needs to run the directory, in one round-trip.
create or replace function public.api_admin_organizations()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(o) order by o.is_featured desc, o.sort_order, o.name)
      from public.organizations o
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------
-- Grants
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default, so
-- every function above starts out callable by anon. Take that back
-- first, then hand out exactly what each role needs. (A blanket
-- `revoke ... on all functions` would also undo migration 04's grants,
-- so these are named one by one.)
-- ---------------------------------------------------------------------
revoke all on function public.increment_org_click(text)             from public, anon, authenticated;
revoke all on function public.api_mission_orgs(text, uuid)          from public, anon, authenticated;
revoke all on function public.api_search_organizations(text, int)   from public, anon, authenticated;
revoke all on function public.api_attach_mission_org(uuid, uuid)    from public, anon, authenticated;
revoke all on function public.api_detach_mission_org(uuid, uuid)    from public, anon, authenticated;
revoke all on function public.api_admin_upsert_organization(jsonb)  from public, anon, authenticated;
revoke all on function public.api_admin_delete_organization(uuid)   from public, anon, authenticated;
revoke all on function public.api_admin_organizations()             from public, anon, authenticated;

grant execute on function public.increment_org_click(text)                  to anon, authenticated;
grant execute on function public.api_mission_orgs(text, uuid)               to anon, authenticated;
grant execute on function public.api_search_organizations(text, int)        to authenticated;
grant execute on function public.api_attach_mission_org(uuid, uuid)         to authenticated;
grant execute on function public.api_detach_mission_org(uuid, uuid)         to authenticated;
grant execute on function public.api_admin_upsert_organization(jsonb)       to authenticated;
grant execute on function public.api_admin_delete_organization(uuid)        to authenticated;
grant execute on function public.api_admin_organizations()                  to authenticated;
grant execute on all functions in schema public to service_role;
