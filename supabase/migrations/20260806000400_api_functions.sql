-- =====================================================================
-- Asar — 04. SQL API
--
-- Every mutation lives here as a SECURITY DEFINER function that
-- re-validates ownership, visibility, quotas and input length itself.
-- The anon key can therefore only ever call these functions; it holds no
-- direct insert/update/delete privilege on any table (see migration 03).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Small helpers
-- ---------------------------------------------------------------------
create or replace function public.slugify(p_text text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.unique_mission_slug(p_text text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base      text := left(nullif(public.slugify(p_text), ''), 40);
  candidate text;
  n         integer := 0;
begin
  base := coalesce(nullif(base, ''), 'mission');
  candidate := base;
  while exists (select 1 from public.missions m where m.slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 4);
    exit when n > 25;
  end loop;
  return candidate;
end;
$$;

-- Resolves the mission a visitor is allowed to open: public missions by
-- slug, link-only / friends-only missions only when the share token
-- matches, and always the owner's own missions (M-06).
create or replace function public.resolve_mission(p_slug text, p_token uuid default null)
returns public.missions
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  m public.missions;
begin
  select * into m from public.missions where slug = p_slug;
  if not found then
    raise exception 'MISSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if m.owner_id = auth.uid() or public.is_platform_admin() then
    return m;
  end if;

  if m.status = 'draft' then
    raise exception 'MISSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if m.visibility = 'public' then
    return m;
  end if;

  if p_token is not null and p_token = m.share_token then
    return m;
  end if;

  raise exception 'MISSION_PRIVATE' using errcode = '42501';
end;
$$;

-- Shapes a contribution row for public display: honours anonymity (C-303)
-- and never leaks manage_token / visitor_hash.
create or replace function public.contribution_to_json(c public.contributions)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id',                c.id,
    'track',             c.track,
    'contributor_name',  case when c.is_anonymous then 'Someone kind' else c.contributor_name end,
    'is_anonymous',      c.is_anonymous,
    'quantity',          c.quantity,
    'unit',              c.unit,
    'action_label',      c.action_label,
    'hours',             c.hours,
    'status',            c.status,
    'fulfilled_at',      c.fulfilled_at,
    'has_proof',         c.proof_url is not null,
    'proof_url',         c.proof_url,
    'proof_note',        c.proof_note,
    'reported_amount',   c.reported_amount,
    'message',           c.message,
    'owner_reaction',    c.owner_reaction,
    'endorsement_count', c.endorsement_count,
    'created_at',        c.created_at
  );
$$;

-- =====================================================================
-- Mission creation & management (M-01 .. M-06)
-- =====================================================================
create or replace function public.api_create_mission(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid       uuid := auth.uid();
  m         public.missions;
  v_title   text := left(trim(coalesce(p ->> 'title', '')), 120);
  v_goal    integer := coalesce((p ->> 'goal_amount')::integer, 0);
  v_bday    date := (p ->> 'birthday_date')::date;
  v_reveal  timestamptz;
  -- Template defaults, kept as scalars so a custom mission (M-02) simply
  -- leaves them null and falls through to the literals below.
  t_id      uuid;
  t_title   text;
  t_icon    text;
  t_unit_s  text;
  t_unit_p  text;
  t_verb    text;
  t_goal    integer;
  t_lpu     numeric;
  t_incr    integer[];
  t_accent  text;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if (select count(*) from public.missions where owner_id = uid and status <> 'archived') >= 25 then
    raise exception 'MISSION_LIMIT_REACHED' using errcode = '54000';
  end if;

  if nullif(p ->> 'template_slug', '') is not null then
    select id, title, icon, unit_singular, unit_plural, action_verb,
           default_goal, lives_per_unit, increments, accent
      into t_id, t_title, t_icon, t_unit_s, t_unit_p, t_verb,
           t_goal, t_lpu, t_incr, t_accent
      from public.mission_templates
     where slug = p ->> 'template_slug' and is_active;
    if not found then
      raise exception 'TEMPLATE_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  if v_bday is null then
    raise exception 'BIRTHDAY_REQUIRED' using errcode = '22004';
  end if;

  v_title := coalesce(nullif(v_title, ''), t_title, 'My birthday mission');
  v_goal  := case when v_goal > 0 then v_goal else coalesce(t_goal, 100) end;
  if v_goal > 1000000 then
    raise exception 'GOAL_TOO_LARGE' using errcode = '22003';
  end if;

  -- M-04 / M-05: the countdown target. The client sends the birthday in
  -- its own timezone; if that instant has already passed we fall into
  -- 24-hour sprint mode rather than rejecting a last-minute mission.
  v_reveal := coalesce((p ->> 'reveal_at')::timestamptz, (v_bday + time '09:00') at time zone 'UTC');
  if v_reveal <= now() then
    v_reveal := now() + interval '24 hours';
  end if;

  insert into public.missions (
    owner_id, template_id, slug, title, headline, story, impact_line, icon,
    unit_singular, unit_plural, action_verb, lives_per_unit, increments,
    goal_amount, birthday_date, starts_at, reveal_at,
    visibility, tone, accent, allow_wish_only, allow_external_give, status
  ) values (
    uid,
    t_id,
    public.unique_mission_slug(coalesce(nullif(p ->> 'slug', ''), v_title)),
    v_title,
    left(coalesce(nullif(trim(p ->> 'headline'), ''), 'Join my purpose'), 120),
    left(nullif(trim(p ->> 'story'), ''), 2000),
    left(nullif(trim(p ->> 'impact_line'), ''), 160),
    coalesce(nullif(p ->> 'icon', ''), t_icon, '🎁'),
    left(coalesce(nullif(p ->> 'unit_singular', ''), t_unit_s, 'action'), 40),
    left(coalesce(nullif(p ->> 'unit_plural', ''), t_unit_p, 'actions'), 40),
    left(coalesce(nullif(p ->> 'action_verb', ''), t_verb, 'complete'), 40),
    coalesce((p ->> 'lives_per_unit')::numeric, t_lpu, 1),
    coalesce(
      (select array_agg(x::integer) from jsonb_array_elements_text(
         case when jsonb_typeof(p -> 'increments') = 'array' then p -> 'increments' else '[]'::jsonb end
       ) x where x ~ '^[0-9]+$' and x::integer between 1 and 1000),
      t_incr,
      '{1,2,5}'
    ),
    v_goal,
    v_bday,
    now(),
    v_reveal,
    coalesce((p ->> 'visibility')::mission_visibility, 'public'),
    coalesce((p ->> 'tone')::mission_tone, 'playful'),
    coalesce(nullif(p ->> 'accent', ''), t_accent, 'ember'),
    coalesce((p ->> 'allow_wish_only')::boolean, true),
    coalesce((p ->> 'allow_external_give')::boolean, true),
    'active'
  )
  returning * into m;

  return jsonb_build_object('id', m.id, 'slug', m.slug, 'share_token', m.share_token);
end;
$$;

create or replace function public.api_update_mission(p_mission_id uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  m   public.missions;
begin
  select * into m from public.missions where id = p_mission_id;
  if not found then
    raise exception 'MISSION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if m.owner_id <> uid and not public.is_platform_admin() then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;

  update public.missions set
    title               = left(coalesce(nullif(trim(p ->> 'title'), ''), title), 120),
    headline            = left(coalesce(nullif(trim(p ->> 'headline'), ''), headline), 120),
    story               = case when p ? 'story' then left(nullif(trim(p ->> 'story'), ''), 2000) else story end,
    icon                = coalesce(nullif(p ->> 'icon', ''), icon),
    goal_amount         = greatest(1, least(1000000, coalesce((p ->> 'goal_amount')::integer, goal_amount))),
    visibility          = coalesce((p ->> 'visibility')::mission_visibility, visibility),
    tone                = coalesce((p ->> 'tone')::mission_tone, tone),
    accent              = coalesce(nullif(p ->> 'accent', ''), accent),
    allow_wish_only     = coalesce((p ->> 'allow_wish_only')::boolean, allow_wish_only),
    allow_external_give = coalesce((p ->> 'allow_external_give')::boolean, allow_external_give),
    status              = coalesce((p ->> 'status')::mission_status, status),
    reveal_at           = coalesce((p ->> 'reveal_at')::timestamptz, reveal_at),
    birthday_date       = coalesce((p ->> 'birthday_date')::date, birthday_date)
  where id = p_mission_id
  returning * into m;

  return jsonb_build_object('id', m.id, 'slug', m.slug);
end;
$$;

create or replace function public.api_rotate_share_token(p_mission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  t uuid;
begin
  update public.missions
     set share_token = gen_random_uuid()
   where id = p_mission_id and owner_id = auth.uid()
  returning share_token into t;

  if t is null then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  return jsonb_build_object('share_token', t);
end;
$$;

-- =====================================================================
-- Reading a mission page (public + link-token aware)
-- =====================================================================
create or replace function public.api_get_mission(p_slug text, p_token uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  m      public.missions;
  result jsonb;
begin
  m := public.resolve_mission(p_slug, p_token);

  select jsonb_build_object(
    'mission', jsonb_build_object(
      'id', m.id, 'slug', m.slug, 'title', m.title, 'headline', m.headline,
      'story', m.story, 'impact_line', m.impact_line, 'icon', m.icon,
      'unit_singular', m.unit_singular, 'unit_plural', m.unit_plural,
      'action_verb', m.action_verb, 'lives_per_unit', m.lives_per_unit,
      'increments', m.increments, 'goal_amount', m.goal_amount,
      'birthday_date', m.birthday_date, 'starts_at', m.starts_at, 'reveal_at', m.reveal_at,
      'visibility', m.visibility, 'tone', m.tone, 'status', m.status, 'accent', m.accent,
      'allow_wish_only', m.allow_wish_only, 'allow_external_give', m.allow_external_give,
      'is_revealed', now() >= m.reveal_at,
      -- M-05: a mission created hours before the birthday runs as a sprint.
      -- Sprint means the reveal is genuinely imminent, not that the
      -- mission happened to be created close to it. The old form
      -- compared against starts_at, so a mission created late stayed
      -- "sprint" for its whole life while a normal mission never
      -- entered sprint in its final hours.
      'is_sprint', (m.reveal_at - now()) <= interval '48 hours' and m.reveal_at > now(),
      'created_at', m.created_at
    ),
    'owner', (
      select jsonb_build_object('display_name', pr.display_name, 'avatar_url', pr.avatar_url)
        from public.profiles pr where pr.id = m.owner_id
    ),
    'is_owner', coalesce(m.owner_id = auth.uid(), false),
    'stats', (select to_jsonb(s) - 'mission_id' from public.mission_stats s where s.mission_id = m.id),
    'breakdown', coalesce((
      select jsonb_agg(to_jsonb(b) - 'mission_id' order by b.confirmed_units desc nulls last)
        from public.mission_action_breakdown b where b.mission_id = m.id
    ), '[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'label', l.label, 'url', l.url, 'provider', l.provider,
               'note', l.note, 'click_count', l.click_count, 'moderation', l.moderation
             ) order by l.created_at)
        from public.external_links l
       where l.mission_id = m.id
         and (l.moderation = 'approved' or m.owner_id = auth.uid())
    ), '[]'::jsonb),
    -- W-03 wish wall, most recent first
    'contributions', coalesce((
      select jsonb_agg(public.contribution_to_json(c) order by c.created_at desc)
        from (
          select * from public.contributions
           where mission_id = m.id and is_hidden = false
           order by created_at desc
           limit 200
        ) c
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- =====================================================================
-- Contributing — the three tracks (C-1xx, C-2xx, C-3xx)
-- =====================================================================
create or replace function public.api_add_contribution(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m         public.missions;
  v_track   contribution_track := coalesce((p ->> 'track')::contribution_track, 'wish');
  v_qty     numeric := greatest(0, coalesce((p ->> 'quantity')::numeric, 0));
  v_hash    text := left(coalesce(nullif(p ->> 'visitor_hash', ''), md5(random()::text)), 64);
  v_link_id uuid;
  v_status  contribution_status;
  c         public.contributions;
begin
  m := public.resolve_mission(p ->> 'slug', nullif(p ->> 'token', '')::uuid);

  if m.status not in ('active', 'revealed') then
    raise exception 'MISSION_CLOSED' using errcode = '22023';
  end if;

  -- After the reveal moment the tally is sealed, but warm words are
  -- always welcome (C-304).
  if now() >= m.reveal_at and v_track <> 'wish' then
    raise exception 'MISSION_CLOSED' using errcode = '22023';
  end if;

  if v_track = 'wish' and not m.allow_wish_only then
    raise exception 'WISH_ONLY_DISABLED' using errcode = '22023';
  end if;

  if v_track = 'external_give' and not m.allow_external_give then
    raise exception 'EXTERNAL_GIVE_DISABLED' using errcode = '22023';
  end if;

  -- Light abuse guard: 12 entries per visitor per mission per hour.
  if (
    select count(*) from public.contributions
     where mission_id = m.id and visitor_hash = v_hash and created_at > now() - interval '1 hour'
  ) >= 12 then
    raise exception 'RATE_LIMITED' using errcode = '54000';
  end if;

  -- Wishes and shares are never counted in the goal tally.
  if v_track in ('wish', 'share') then
    v_qty := 0;
  end if;

  if v_qty > greatest(m.goal_amount, 1000) then
    raise exception 'QUANTITY_TOO_LARGE' using errcode = '22003';
  end if;

  if nullif(p ->> 'external_link_id', '') is not null then
    select id into v_link_id from public.external_links
     where id = (p ->> 'external_link_id')::uuid and mission_id = m.id and moderation = 'approved';
    if v_link_id is null then
      raise exception 'LINK_NOT_AVAILABLE' using errcode = 'P0002';
    end if;
  end if;

  -- C-102: a share or a wish is complete the moment it happens; a pledge
  -- starts as a promise and is confirmed later by the contributor.
  v_status := case
    when v_track in ('wish', 'share') then 'fulfilled'
    when coalesce((p ->> 'already_done')::boolean, false) then 'fulfilled'
    else 'pledged'
  end;

  insert into public.contributions (
    mission_id, track, contributor_name, contributor_id, is_anonymous,
    quantity, unit, action_label, hours, status, fulfilled_at,
    proof_url, proof_note, external_link_id, reported_amount, message, visitor_hash
  ) values (
    m.id,
    v_track,
    left(coalesce(nullif(trim(p ->> 'contributor_name'), ''), 'A friend'), 80),
    auth.uid(),
    coalesce((p ->> 'is_anonymous')::boolean, false),
    v_qty,
    left(coalesce(nullif(p ->> 'unit', ''), m.unit_plural), 40),
    left(nullif(trim(p ->> 'action_label'), ''), 120),
    nullif(p ->> 'hours', '')::numeric,
    v_status,
    case when v_status = 'fulfilled' then now() end,
    left(nullif(trim(p ->> 'proof_url'), ''), 500),
    left(nullif(trim(p ->> 'proof_note'), ''), 300),
    v_link_id,
    left(nullif(trim(p ->> 'reported_amount'), ''), 60),
    left(nullif(trim(p ->> 'message'), ''), 1000),
    v_hash
  )
  returning * into c;

  return jsonb_build_object(
    'id', c.id,
    'manage_token', c.manage_token,
    'status', c.status,
    'contribution', public.contribution_to_json(c)
  );
end;
$$;

-- C-102 / C-104: the contributor marks their own pledge as done.
create or replace function public.api_confirm_contribution(
  p_id uuid,
  p_manage_token uuid,
  p_proof_url text default null,
  p_proof_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c public.contributions;
begin
  update public.contributions
     set status       = 'fulfilled',
         fulfilled_at = coalesce(fulfilled_at, now()),
         proof_url    = coalesce(left(nullif(trim(p_proof_url), ''), 500), proof_url),
         proof_note   = coalesce(left(nullif(trim(p_proof_note), ''), 300), proof_note)
   where id = p_id
     and manage_token = p_manage_token
     and status <> 'withdrawn'
  returning * into c;

  if c.id is null then
    raise exception 'CONTRIBUTION_NOT_FOUND' using errcode = 'P0002';
  end if;

  return jsonb_build_object('contribution', public.contribution_to_json(c));
end;
$$;

create or replace function public.api_withdraw_contribution(p_id uuid, p_manage_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c public.contributions;
begin
  update public.contributions
     set status = 'withdrawn', fulfilled_at = null, quantity = 0
   where id = p_id and manage_token = p_manage_token
  returning * into c;

  if c.id is null then
    raise exception 'CONTRIBUTION_NOT_FOUND' using errcode = 'P0002';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- C-203: count the click, then hand back the destination.
create or replace function public.api_record_link_click(p_link_id uuid, p_visitor_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l public.external_links;
begin
  select * into l from public.external_links where id = p_link_id and moderation = 'approved';
  if not found then
    raise exception 'LINK_NOT_AVAILABLE' using errcode = 'P0002';
  end if;

  insert into public.link_clicks (link_id, mission_id, visitor_hash)
  values (l.id, l.mission_id, left(coalesce(nullif(p_visitor_hash, ''), md5(random()::text)), 64))
  on conflict (link_id, visitor_hash) do nothing;

  return jsonb_build_object('url', l.url);
end;
$$;

-- =====================================================================
-- Wish wall & trust (W-04, T-02, T-05)
-- =====================================================================
create or replace function public.api_react_to_contribution(p_id uuid, p_reaction text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c public.contributions;
begin
  update public.contributions c2
     set owner_reaction = left(nullif(p_reaction, ''), 8)
   where c2.id = p_id
     and exists (
       select 1 from public.missions m
        where m.id = c2.mission_id and m.owner_id = auth.uid()
     )
  returning * into c;

  if c.id is null then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  return jsonb_build_object('contribution', public.contribution_to_json(c));
end;
$$;

create or replace function public.api_endorse_contribution(
  p_id uuid,
  p_endorser_name text,
  p_endorser_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c public.contributions;
begin
  select * into c from public.contributions where id = p_id and is_hidden = false;
  if not found then
    raise exception 'CONTRIBUTION_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.endorsements (contribution_id, mission_id, endorser_name, endorser_hash)
  values (
    c.id, c.mission_id,
    left(coalesce(nullif(trim(p_endorser_name), ''), 'A friend'), 80),
    left(coalesce(nullif(p_endorser_hash, ''), md5(random()::text)), 64)
  )
  on conflict (contribution_id, endorser_hash) do nothing;

  return jsonb_build_object(
    'endorsement_count',
    (select count(*) from public.endorsements where contribution_id = c.id)
  );
end;
$$;

create or replace function public.api_flag_contribution(
  p_id uuid,
  p_reason text,
  p_details text default null,
  p_reporter_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c public.contributions;
begin
  select * into c from public.contributions where id = p_id;
  if not found then
    raise exception 'CONTRIBUTION_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.pledge_flags (contribution_id, mission_id, reason, details, reporter_hash)
  values (
    c.id, c.mission_id,
    left(coalesce(nullif(trim(p_reason), ''), 'other'), 60),
    left(nullif(trim(p_details), ''), 500),
    left(coalesce(nullif(p_reporter_hash, ''), md5(random()::text)), 64)
  )
  on conflict (contribution_id, reporter_hash) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

-- =====================================================================
-- External give links (C-201) — owner side
-- =====================================================================
create or replace function public.api_add_external_link(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m         public.missions;
  l         public.external_links;
  v_url     text := trim(coalesce(p ->> 'url', ''));
  v_auto    boolean;
  v_allow   text[];
begin
  select * into m from public.missions where id = (p ->> 'mission_id')::uuid and owner_id = auth.uid();
  if not found then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;

  if v_url !~* '^https://' then
    raise exception 'URL_MUST_BE_HTTPS' using errcode = '22023';
  end if;

  if (select count(*) from public.external_links where mission_id = m.id) >= 6 then
    raise exception 'LINK_LIMIT_REACHED' using errcode = '54000';
  end if;

  -- A-M03: links to well-known destinations go live immediately, anything
  -- else waits for a human. The allow-list is admin-configurable.
  select coalesce(array(select jsonb_array_elements_text(value)), '{}')
    into v_allow
    from public.platform_settings where key = 'link_autoapprove_domains';

  v_auto := exists (
    select 1 from unnest(coalesce(v_allow, '{}'::text[])) d
     where v_url ~* ('^https://([a-z0-9-]+\.)*' || replace(d, '.', '\.') || '(/|$)')
  );

  insert into public.external_links (mission_id, label, url, provider, note, moderation)
  values (
    m.id,
    left(coalesce(nullif(trim(p ->> 'label'), ''), 'Give directly'), 80),
    left(v_url, 500),
    left(nullif(p ->> 'provider', ''), 30),
    left(nullif(trim(p ->> 'note'), ''), 200),
    case when v_auto then 'approved'::moderation_status else 'pending'::moderation_status end
  )
  returning * into l;

  return jsonb_build_object('id', l.id, 'moderation', l.moderation);
end;
$$;

create or replace function public.api_delete_external_link(p_link_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n integer;
begin
  delete from public.external_links l
   where l.id = p_link_id
     and exists (select 1 from public.missions m where m.id = l.mission_id and m.owner_id = auth.uid());
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- =====================================================================
-- Owner dashboard (D-01 .. D-06)
-- =====================================================================
create or replace function public.api_mission_dashboard(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  m public.missions;
begin
  select * into m from public.missions where slug = p_slug;
  if not found then
    raise exception 'MISSION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if m.owner_id <> auth.uid() and not public.is_platform_admin() then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'mission', to_jsonb(m),
    'stats', (select to_jsonb(s) - 'mission_id' from public.mission_stats s where s.mission_id = m.id),
    'breakdown', coalesce((
      select jsonb_agg(to_jsonb(b) - 'mission_id' order by b.confirmed_units desc nulls last)
        from public.mission_action_breakdown b where b.mission_id = m.id
    ), '[]'::jsonb),
    'contributions', coalesce((
      select jsonb_agg(public.contribution_to_json(c) order by c.created_at desc)
        from (select * from public.contributions
               where mission_id = m.id order by created_at desc limit 300) c
    ), '[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'label', l.label, 'url', l.url, 'provider', l.provider,
               'moderation', l.moderation, 'review_note', l.review_note,
               'click_count', l.click_count, 'created_at', l.created_at
             ) order by l.created_at)
        from public.external_links l where l.mission_id = m.id
    ), '[]'::jsonb),
    -- D-06: a timeline of arrivals, framed as momentum not as a shortfall.
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'entries', d.entries) order by d.day)
        from (
          select date_trunc('day', created_at)::date as day, count(*)::integer as entries
            from public.contributions
           where mission_id = m.id and is_hidden = false
           group by 1 order by 1 desc limit 30
        ) d
    ), '[]'::jsonb),
    'flags', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'contribution_id', f.contribution_id, 'reason', f.reason,
               'status', f.status, 'created_at', f.created_at) order by f.created_at desc)
        from public.pledge_flags f where f.mission_id = m.id and f.status = 'open'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.api_my_missions()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(row order by (row ->> 'created_at') desc)
      from (
        select jsonb_build_object(
          'id', m.id, 'slug', m.slug, 'title', m.title, 'icon', m.icon,
          'goal_amount', m.goal_amount, 'unit_plural', m.unit_plural,
          'reveal_at', m.reveal_at, 'birthday_date', m.birthday_date,
          'visibility', m.visibility, 'status', m.status, 'accent', m.accent,
          'share_token', m.share_token, 'created_at', m.created_at,
          'is_revealed', now() >= m.reveal_at,
          'stats', (select to_jsonb(s) - 'mission_id' from public.mission_stats s where s.mission_id = m.id)
        ) as row
        from public.missions m
       where m.owner_id = auth.uid()
      ) t
  ), '[]'::jsonb);
end;
$$;

-- =====================================================================
-- The reveal — "Because of You" (R-01 .. R-06)
-- =====================================================================
create or replace function public.api_reveal(p_slug text, p_token uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  m public.missions;
  s record;
begin
  m := public.resolve_mission(p_slug, p_token);
  select * into s from public.mission_stats where mission_id = m.id;

  return jsonb_build_object(
    'mission', jsonb_build_object(
      'id', m.id, 'slug', m.slug, 'title', m.title, 'icon', m.icon,
      'unit_singular', m.unit_singular, 'unit_plural', m.unit_plural,
      'impact_line', m.impact_line,
      'goal_amount', m.goal_amount, 'reveal_at', m.reveal_at, 'tone', m.tone,
      'accent', m.accent, 'birthday_date', m.birthday_date
    ),
    'owner', (select jsonb_build_object('display_name', pr.display_name, 'avatar_url', pr.avatar_url)
                from public.profiles pr where pr.id = m.owner_id),
    -- Owners may preview their own reveal before the day.
    'is_unlocked', coalesce((now() >= m.reveal_at) or m.owner_id = auth.uid(), false),
    'is_owner', coalesce(m.owner_id = auth.uid(), false),
    'stats', to_jsonb(s) - 'mission_id',
    -- R-01 headline: the single number that carries the story.
    'headline', jsonb_build_object(
      'value', s.lives_impacted,
      'unit_value', s.confirmed_units,
      'unit', case when s.confirmed_units = 1 then m.unit_singular else m.unit_plural end,
      'people', s.contributor_count
    ),
    -- R-02 slides
    'breakdown', coalesce((
      select jsonb_agg(to_jsonb(b) - 'mission_id' order by b.confirmed_units desc nulls last)
        from public.mission_action_breakdown b where b.mission_id = m.id
    ), '[]'::jsonb),
    -- R-03 proof collage
    'proofs', coalesce((
      select jsonb_agg(jsonb_build_object(
               'url', c.proof_url,
               'note', c.proof_note,
               'name', case when c.is_anonymous then 'Someone kind' else c.contributor_name end,
               'action_label', c.action_label) order by c.created_at desc)
        from public.contributions c
       where c.mission_id = m.id and c.proof_url is not null and c.is_hidden = false
       limit 60
    ), '[]'::jsonb),
    -- R-05 reel content
    'wishes', coalesce((
      select jsonb_agg(public.contribution_to_json(c) order by c.created_at desc)
        from (select * from public.contributions
               where mission_id = m.id and is_hidden = false
                 and coalesce(trim(message), '') <> ''
               order by created_at desc limit 60) c
    ), '[]'::jsonb),
    'contributors', coalesce((
      select jsonb_agg(distinct case when c.is_anonymous then 'Someone kind' else c.contributor_name end)
        from public.contributions c where c.mission_id = m.id and c.is_hidden = false
    ), '[]'::jsonb)
  );
end;
$$;

-- =====================================================================
-- Admin (A-M01 .. A-M05)
-- =====================================================================
create or replace function public.api_admin_upsert_template(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  t public.mission_templates;
begin
  if not public.is_platform_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  insert into public.mission_templates (
    id, slug, title, short_label, icon, category, unit_singular, unit_plural,
    action_verb, default_goal, lives_per_unit, increments, accent, blurb, is_active, sort_order
  ) values (
    coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid()),
    public.slugify(coalesce(nullif(p ->> 'slug', ''), p ->> 'title')),
    left(trim(p ->> 'title'), 80),
    left(coalesce(nullif(trim(p ->> 'short_label'), ''), trim(p ->> 'title')), 40),
    coalesce(nullif(p ->> 'icon', ''), '🎁'),
    coalesce(nullif(p ->> 'category', ''), 'general'),
    left(coalesce(nullif(p ->> 'unit_singular', ''), 'action'), 40),
    left(coalesce(nullif(p ->> 'unit_plural', ''), 'actions'), 40),
    left(coalesce(nullif(p ->> 'action_verb', ''), 'complete'), 40),
    greatest(1, coalesce((p ->> 'default_goal')::integer, 100)),
    greatest(0, coalesce((p ->> 'lives_per_unit')::numeric, 1)),
    coalesce(
      (select array_agg(x::integer) from jsonb_array_elements_text(
         case when jsonb_typeof(p -> 'increments') = 'array' then p -> 'increments' else '[]'::jsonb end
       ) x where x ~ '^[0-9]+$'),
      '{1,2,5}'
    ),
    coalesce(nullif(p ->> 'accent', ''), 'ember'),
    left(nullif(trim(p ->> 'blurb'), ''), 200),
    coalesce((p ->> 'is_active')::boolean, true),
    coalesce((p ->> 'sort_order')::integer, 100)
  )
  on conflict (id) do update set
    slug = excluded.slug, title = excluded.title, short_label = excluded.short_label,
    icon = excluded.icon, category = excluded.category,
    unit_singular = excluded.unit_singular, unit_plural = excluded.unit_plural,
    action_verb = excluded.action_verb, default_goal = excluded.default_goal,
    lives_per_unit = excluded.lives_per_unit, increments = excluded.increments,
    accent = excluded.accent, blurb = excluded.blurb,
    is_active = excluded.is_active, sort_order = excluded.sort_order
  returning * into t;

  return to_jsonb(t);
end;
$$;

create or replace function public.api_admin_moderate_link(
  p_link_id uuid, p_status moderation_status, p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  l public.external_links;
begin
  if not public.is_platform_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  update public.external_links
     set moderation = p_status,
         review_note = left(nullif(trim(p_note), ''), 300),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_link_id
  returning * into l;

  return to_jsonb(l);
end;
$$;

create or replace function public.api_admin_resolve_flag(
  p_flag_id uuid, p_status flag_status, p_note text default null, p_hide boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  f public.pledge_flags;
begin
  if not public.is_platform_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  update public.pledge_flags
     set status = p_status,
         resolution_note = left(nullif(trim(p_note), ''), 300),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_flag_id
  returning * into f;

  if f.id is null then
    raise exception 'FLAG_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_hide then
    update public.contributions set is_hidden = true where id = f.contribution_id;
  elsif p_status = 'dismissed' then
    update public.contributions set is_hidden = false where id = f.contribution_id;
  end if;

  return to_jsonb(f);
end;
$$;

create or replace function public.api_admin_set_setting(p_key text, p_value jsonb, p_label text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s public.platform_settings;
begin
  if not public.is_platform_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;

  insert into public.platform_settings (key, value, label, updated_by, updated_at)
  values (p_key, p_value, p_label, auth.uid(), now())
  on conflict (key) do update
    set value = excluded.value,
        label = coalesce(excluded.label, public.platform_settings.label),
        updated_by = excluded.updated_by,
        updated_at = now()
  returning * into s;

  return to_jsonb(s);
end;
$$;

create or replace function public.api_admin_overview()
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

  return jsonb_build_object(
    'transparency', (select to_jsonb(t) from public.platform_transparency t),
    'templates', coalesce((
      select jsonb_agg(to_jsonb(mt) order by mt.sort_order, mt.title) from public.mission_templates mt
    ), '[]'::jsonb),
    'settings', coalesce((
      select jsonb_object_agg(ps.key, ps.value) from public.platform_settings ps
    ), '{}'::jsonb),
    -- A-M03 moderation queue
    'pending_links', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'label', l.label, 'url', l.url, 'provider', l.provider,
               'note', l.note, 'moderation', l.moderation, 'created_at', l.created_at,
               'mission_slug', m.slug, 'mission_title', m.title,
               'owner', pr.display_name, 'owner_email', pr.email)
             order by l.created_at)
        from public.external_links l
        join public.missions m on m.id = l.mission_id
        join public.profiles pr on pr.id = m.owner_id
       where l.moderation = 'pending'
    ), '[]'::jsonb),
    -- A-M02 self-reported pledge review queue: flagged first, then
    -- unusually large self-reports that no one has vouched for.
    'review_queue', coalesce((
      select jsonb_agg(jsonb_build_object(
               'flag_id', f.id, 'flag_reason', f.reason, 'flag_details', f.details,
               'flagged_at', f.created_at,
               'contribution', public.contribution_to_json(c),
               'mission_slug', m.slug, 'mission_title', m.title)
             order by f.created_at desc)
        from public.pledge_flags f
        join public.contributions c on c.id = f.contribution_id
        join public.missions m on m.id = f.mission_id
       where f.status = 'open'
    ), '[]'::jsonb),
    'high_volume', coalesce((
      select jsonb_agg(jsonb_build_object(
               'contribution', public.contribution_to_json(c),
               'mission_slug', m.slug, 'mission_title', m.title,
               'goal_amount', m.goal_amount)
             order by c.quantity desc)
        from public.contributions c
        join public.missions m on m.id = c.mission_id
       where c.is_hidden = false
         and c.quantity >= greatest(m.goal_amount * 0.25, 10)
         and c.proof_url is null
         and c.endorsement_count = 0
       limit 40
    ), '[]'::jsonb)
  );
end;
$$;

-- =====================================================================
-- Execute grants — this is the entire public write surface.
--
-- Postgres grants EXECUTE to PUBLIC on new functions, and Supabase's
-- default privileges additionally grant it to anon and authenticated. We
-- take all of that back first and then hand out exactly what each role
-- needs, so internal helpers (slugify, resolve_mission,
-- contribution_to_json, …) stay unreachable from the anon key.
-- =====================================================================
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

grant execute on function public.is_platform_admin()                            to anon, authenticated;
grant execute on function public.mission_is_readable(uuid)                      to anon, authenticated;

grant execute on function public.api_get_mission(text, uuid)                    to anon, authenticated;
grant execute on function public.api_add_contribution(jsonb)                    to anon, authenticated;
grant execute on function public.api_confirm_contribution(uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.api_withdraw_contribution(uuid, uuid)          to anon, authenticated;
grant execute on function public.api_record_link_click(uuid, text)              to anon, authenticated;
grant execute on function public.api_endorse_contribution(uuid, text, text)     to anon, authenticated;
grant execute on function public.api_flag_contribution(uuid, text, text, text)  to anon, authenticated;
grant execute on function public.api_reveal(text, uuid)                         to anon, authenticated;

grant execute on function public.api_create_mission(jsonb)                      to authenticated;
grant execute on function public.api_update_mission(uuid, jsonb)                to authenticated;
grant execute on function public.api_rotate_share_token(uuid)                   to authenticated;
grant execute on function public.api_add_external_link(jsonb)                   to authenticated;
grant execute on function public.api_delete_external_link(uuid)                 to authenticated;
grant execute on function public.api_react_to_contribution(uuid, text)          to authenticated;
grant execute on function public.api_mission_dashboard(text)                    to authenticated;
grant execute on function public.api_my_missions()                              to authenticated;

grant execute on function public.api_admin_upsert_template(jsonb)                        to authenticated;
grant execute on function public.api_admin_moderate_link(uuid, moderation_status, text)  to authenticated;
grant execute on function public.api_admin_resolve_flag(uuid, flag_status, text, boolean) to authenticated;
grant execute on function public.api_admin_set_setting(text, jsonb, text)                to authenticated;
grant execute on function public.api_admin_overview()                                    to authenticated;
