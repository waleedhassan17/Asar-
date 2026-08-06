-- =====================================================================
-- Asar — 03. Row level security
--
-- Security model
--   * Every table has RLS enabled and denies by default.
--   * anon / authenticated get READ access only, and only to columns that
--     are safe to publish (manage_token and visitor_hash are never granted).
--   * Every write goes through a SECURITY DEFINER function in migration 04,
--     which re-checks ownership/visibility itself. So a stolen anon key
--     cannot insert, update or delete anything directly.
--   * The service_role key (server-only, never shipped to the browser)
--     bypasses RLS and is used for admin operations and link-only reads.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.mission_is_readable(p_mission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.missions m
     where m.id = p_mission_id
       and (
         (m.visibility = 'public' and m.status <> 'draft')
         or m.owner_id = auth.uid()
       )
  );
$$;

-- ---------------------------------------------------------------------
-- Strip the permissive defaults Supabase applies to the public schema.
-- ---------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_platform_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()));

grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, birthday) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- mission_templates (M-01, A-M01)
-- ---------------------------------------------------------------------
alter table public.mission_templates enable row level security;

drop policy if exists templates_read on public.mission_templates;
create policy templates_read on public.mission_templates
  for select to anon, authenticated
  using (is_active or public.is_platform_admin());

grant select on public.mission_templates to anon, authenticated;

-- ---------------------------------------------------------------------
-- missions
-- ---------------------------------------------------------------------
alter table public.missions enable row level security;

drop policy if exists missions_read on public.missions;
create policy missions_read on public.missions
  for select to anon, authenticated
  using (
    (visibility = 'public' and status <> 'draft')
    or owner_id = auth.uid()
    or public.is_platform_admin()
  );

-- share_token stays out of the grant list: a public reader must never be
-- able to harvest the secret links of link-only missions.
grant select (
  id, owner_id, template_id, slug, title, headline, story, icon,
  unit_singular, unit_plural, action_verb, lives_per_unit, increments,
  goal_amount, birthday_date, starts_at, reveal_at, visibility, tone,
  status, accent, allow_wish_only, allow_external_give, created_at, updated_at
) on public.missions to anon, authenticated;

-- ---------------------------------------------------------------------
-- contributions
-- ---------------------------------------------------------------------
alter table public.contributions enable row level security;

drop policy if exists contributions_read on public.contributions;
create policy contributions_read on public.contributions
  for select to anon, authenticated
  using (
    public.mission_is_readable(mission_id)
    and (
      is_hidden = false
      or public.is_platform_admin()
      or exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = auth.uid())
    )
  );

grant select (
  id, mission_id, track, contributor_name, contributor_id, is_anonymous,
  quantity, unit, action_label, hours, status, fulfilled_at, proof_url,
  proof_note, external_link_id, reported_amount, message, owner_reaction,
  endorsement_count, open_flag_count, is_hidden, created_at, updated_at
) on public.contributions to anon, authenticated;

-- ---------------------------------------------------------------------
-- external_links (C-201, A-M03)
-- ---------------------------------------------------------------------
alter table public.external_links enable row level security;

drop policy if exists external_links_read on public.external_links;
create policy external_links_read on public.external_links
  for select to anon, authenticated
  using (
    (moderation = 'approved' and public.mission_is_readable(mission_id))
    or exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = auth.uid())
    or public.is_platform_admin()
  );

grant select (
  id, mission_id, label, url, provider, note, moderation, review_note,
  click_count, created_at
) on public.external_links to anon, authenticated;

-- ---------------------------------------------------------------------
-- link_clicks (C-203) — aggregate only; raw log is not public
-- ---------------------------------------------------------------------
alter table public.link_clicks enable row level security;

drop policy if exists link_clicks_read on public.link_clicks;
create policy link_clicks_read on public.link_clicks
  for select to authenticated
  using (
    exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = auth.uid())
    or public.is_platform_admin()
  );

grant select on public.link_clicks to authenticated;

-- ---------------------------------------------------------------------
-- endorsements (T-02)
-- ---------------------------------------------------------------------
alter table public.endorsements enable row level security;

drop policy if exists endorsements_read on public.endorsements;
create policy endorsements_read on public.endorsements
  for select to anon, authenticated
  using (public.mission_is_readable(mission_id));

grant select (id, contribution_id, mission_id, endorser_name, created_at)
  on public.endorsements to anon, authenticated;

-- ---------------------------------------------------------------------
-- pledge_flags (T-05, A-M02) — reporters stay private
-- ---------------------------------------------------------------------
alter table public.pledge_flags enable row level security;

drop policy if exists pledge_flags_read on public.pledge_flags;
create policy pledge_flags_read on public.pledge_flags
  for select to authenticated
  using (
    exists (select 1 from public.missions m where m.id = mission_id and m.owner_id = auth.uid())
    or public.is_platform_admin()
  );

grant select (id, contribution_id, mission_id, reason, details, status,
              resolution_note, reviewed_at, created_at)
  on public.pledge_flags to authenticated;

-- ---------------------------------------------------------------------
-- platform_settings (A-M04) — admin only, except the handful of keys
-- flagged is_public, which every mission page needs to render honestly.
-- ---------------------------------------------------------------------
alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_read on public.platform_settings;
create policy platform_settings_read on public.platform_settings
  for select to anon, authenticated
  using (is_public or public.is_platform_admin());

grant select (key, value, label, is_public, updated_at)
  on public.platform_settings to anon, authenticated;

-- ---------------------------------------------------------------------
-- Views inherit the caller's rights (security_invoker), so a plain
-- SELECT grant is enough.
-- ---------------------------------------------------------------------
grant select on public.mission_stats             to anon, authenticated;
grant select on public.mission_action_breakdown  to anon, authenticated;
grant select on public.platform_transparency     to anon, authenticated;

grant execute on function public.is_platform_admin()          to anon, authenticated;
grant execute on function public.mission_is_readable(uuid)    to anon, authenticated;
