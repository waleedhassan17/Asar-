-- =====================================================================
-- Asar — 02. Reporting views
-- Everything the dashboard (D-*), reveal (R-*) and transparency log
-- (A-M05) need, expressed once in SQL instead of in application code.
-- All views run with security_invoker so row-level security on the
-- underlying tables still applies to the caller.
-- =====================================================================

-- ---------------------------------------------------------------------
-- mission_stats — the live tally behind D-01, D-02, D-06 and R-01
-- ---------------------------------------------------------------------
create or replace view public.mission_stats
with (security_invoker = on) as
select
  m.id                                  as mission_id,
  m.slug,
  m.goal_amount,
  m.lives_per_unit,
  m.unit_singular,
  m.unit_plural,
  m.reveal_at,
  m.starts_at,

  -- Only confirmed actions move the public tally (C-103 honour system).
  coalesce(sum(c.quantity) filter (
    where c.status = 'fulfilled' and c.track in ('pledge', 'external_give', 'volunteer')
  ), 0)::numeric                        as confirmed_units,

  coalesce(sum(c.quantity) filter (where c.status = 'pledged'), 0)::numeric
                                        as promised_units,

  -- D-01: "You've impacted N lives already"
  floor(coalesce(sum(c.quantity) filter (
    where c.status = 'fulfilled' and c.track in ('pledge', 'external_give', 'volunteer')
  ), 0) * m.lives_per_unit)::integer    as lives_impacted,

  least(100, floor(
    coalesce(sum(c.quantity) filter (
      where c.status = 'fulfilled' and c.track in ('pledge', 'external_give', 'volunteer')
    ), 0) * 100.0 / greatest(m.goal_amount, 1)
  ))::integer                           as goal_percent,

  count(c.id)::integer                                                  as contribution_count,
  count(distinct coalesce(
    c.contributor_id::text,
    lower(nullif(trim(c.contributor_name), '')),
    c.id::text
  ))::integer                                                           as contributor_count,

  -- D-02 category mini-counters
  count(c.id) filter (where c.track = 'pledge')::integer                as pledge_count,
  count(c.id) filter (where c.track = 'external_give')::integer         as external_give_count,
  count(c.id) filter (where c.track = 'volunteer')::integer             as volunteer_count,
  count(c.id) filter (where c.track = 'share')::integer                 as share_count,
  count(c.id) filter (where c.track = 'wish')::integer                  as wish_count,
  coalesce(sum(c.hours) filter (where c.status = 'fulfilled'), 0)::numeric as volunteer_hours,

  -- T-03 / A-M05 proof signals
  count(c.id) filter (where c.proof_url is not null)::integer           as proof_count,
  count(c.id) filter (where c.endorsement_count > 0)::integer           as endorsed_count,

  -- D-06 momentum, deliberately framed as arrivals rather than a deficit
  count(c.id) filter (where c.created_at > now() - interval '24 hours')::integer as joined_last_24h,
  count(c.id) filter (where c.created_at > now() - interval '7 days')::integer   as joined_last_7d,
  max(c.created_at)                                                     as last_contribution_at,

  -- C-203 click-throughs are counted on the link, not the contribution
  coalesce((select sum(l.click_count) from public.external_links l
             where l.mission_id = m.id and l.moderation = 'approved'), 0)::integer as give_link_clicks
from public.missions m
left join public.contributions c
       on c.mission_id = m.id
      and c.is_hidden = false
group by m.id;

comment on view public.mission_stats is 'Live per-mission tally: confirmed units, lives impacted, per-track counts, momentum (D-01..D-06).';

-- ---------------------------------------------------------------------
-- mission_action_breakdown — D-02, grouped by the wording people used
-- ---------------------------------------------------------------------
create or replace view public.mission_action_breakdown
with (security_invoker = on) as
select
  c.mission_id,
  c.track,
  coalesce(nullif(trim(c.action_label), ''), 'Other') as action_label,
  count(*)::integer                                   as entries,
  sum(c.quantity) filter (where c.status = 'fulfilled')::numeric as confirmed_units,
  sum(c.quantity) filter (where c.status = 'pledged')::numeric   as promised_units
from public.contributions c
where c.is_hidden = false
group by c.mission_id, c.track, coalesce(nullif(trim(c.action_label), ''), 'Other');

-- ---------------------------------------------------------------------
-- platform_transparency — A-M05, the public credibility page
--
-- Deliberately NOT security_invoker: the whole point is a single honest
-- platform-wide count, and a visitor cannot read the underlying flag or
-- private-mission rows. It exposes aggregates only — no row ever escapes.
-- ---------------------------------------------------------------------
create or replace view public.platform_transparency as
select
  (select count(*) from public.missions where status <> 'draft')          as missions_total,
  (select count(*) from public.missions where status = 'active')          as missions_active,
  (select count(*) from public.contributions where is_hidden = false)     as contributions_total,
  (select count(*) from public.contributions
     where is_hidden = false and status = 'fulfilled')                    as contributions_confirmed,
  (select count(*) from public.contributions
     where is_hidden = false and proof_url is not null)                   as contributions_with_proof,
  (select count(*) from public.contributions
     where is_hidden = false and endorsement_count > 0)                   as contributions_endorsed,
  (select count(*) from public.contributions
     where is_hidden = false and track = 'wish')                          as wishes_only,
  (select count(*) from public.pledge_flags where status = 'open')        as flags_open,
  (select count(*) from public.pledge_flags where status = 'actioned')    as flags_actioned,
  (select count(*) from public.external_links where moderation = 'approved') as links_approved,
  (select count(*) from public.external_links where moderation = 'rejected') as links_rejected,
  round(
    100.0 * (select count(*) from public.contributions
              where is_hidden = false and proof_url is not null)
    / greatest((select count(*) from public.contributions where is_hidden = false), 1)
  , 1)                                                                    as proof_attached_percent;

comment on view public.platform_transparency is 'Platform-wide self-reported vs proof-attached ratio for the public transparency log (A-M05).';
