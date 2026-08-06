\set ON_ERROR_STOP on
\pset pager off

-- =====================================================================
-- Donation directory contract (migration 06).
--
-- Run after 01_smoke.sql on the same throwaway database — it reuses the
-- owner and mission that test created.
--
-- The whole point of this feature is that Asar is never in the money
-- path, so what these checks really protect is the link: who may change
-- a donate_url, and who may mark one "verified".
-- =====================================================================

-- ============ the seed landed, and nothing is verified ============
select '1. seeded' as step,
       count(*) as organizations,
       count(*) filter (where is_verified) as verified,
       count(*) filter (where is_featured) as featured
  from public.organizations;

do $$ begin
  if exists (select 1 from public.organizations where is_verified) then
    raise exception 'FAIL: seed marked an organization verified — that needs a human';
  end if;
  raise notice 'PASS: every seeded organization starts unverified';
end $$;

-- every donate_url must be a real http(s) URL: it becomes a redirect
do $$ begin
  if exists (select 1 from public.organizations where donate_url !~* '^https?://') then
    raise exception 'FAIL: a donate_url is not an http(s) URL';
  end if;
  raise notice 'PASS: every donate_url is a well-formed link';
end $$;

-- ============ what the anon key may do ============
set role anon;
select set_config('request.jwt.claim.sub', '', false);

select '2. anon reads the directory' as step, count(*) > 0 as ok from public.organizations;

-- clicking is anonymous and must work without any write grant
select public.increment_org_click('edhi-foundation');
reset role;
select '3. click counted' as step, clicks from public.organizations where slug = 'edhi-foundation';

set role anon;
do $$ begin
  begin
    insert into public.organizations (slug, name, category, donate_url)
    values ('evil', 'Evil', 'general_welfare', 'https://evil.example');
    raise exception 'FAIL: anon inserted an organization';
  exception when insufficient_privilege then
    raise notice 'PASS: direct insert into organizations denied';
  end;
end $$;

do $$ begin
  begin
    update public.organizations set donate_url = 'https://evil.example' where slug = 'edhi-foundation';
    raise exception 'FAIL: anon rewrote a donate_url';
  exception when insufficient_privilege then
    raise notice 'PASS: direct update of a donate_url denied';
  end;
end $$;

do $$ begin
  begin
    update public.organizations set is_verified = true where slug = 'edhi-foundation';
    raise exception 'FAIL: anon marked an organization verified';
  exception when insufficient_privilege then
    raise notice 'PASS: direct verification denied';
  end;
end $$;

do $$ begin
  begin
    perform public.api_admin_upsert_organization('{"name":"Evil","donate_url":"https://evil.example","category":"general_welfare"}'::jsonb);
    raise exception 'FAIL: anon called the admin org upsert';
  exception when insufficient_privilege then
    raise notice 'PASS: api_admin_upsert_organization requires an account';
  end;
end $$;

do $$ begin
  begin
    perform public.api_admin_organizations();
    raise exception 'FAIL: anon listed the admin org view';
  exception when insufficient_privilege then
    raise notice 'PASS: api_admin_organizations requires an account';
  end;
end $$;

-- ============ a signed-in non-admin is still not an admin ============
reset role;
insert into auth.users (id, email, raw_user_meta_data)
values ('33333333-3333-3333-3333-333333333333', 'nadia@example.com', '{"display_name":"Nadia"}'::jsonb);

set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);

do $$ begin
  begin
    perform public.api_admin_upsert_organization('{"name":"Evil","donate_url":"https://evil.example","category":"general_welfare"}'::jsonb);
    raise exception 'FAIL: a normal account edited the directory';
  exception when insufficient_privilege then
    raise notice 'PASS: directory CRUD is admin-only';
  end;
end $$;

-- ...and cannot attach organizations to someone else's mission
select set_config('asar.other_mission', (select id::text from public.missions where slug like 'feed-100-people%' limit 1), false);
do $$ begin
  begin
    perform public.api_attach_mission_org(
      current_setting('asar.other_mission')::uuid,
      (select id from public.organizations where slug = 'edhi-foundation'));
    raise exception 'FAIL: a stranger attached an org to someone else''s mission';
  exception when insufficient_privilege then
    raise notice 'PASS: only the mission owner curates its causes';
  end;
end $$;

-- ============ the owner curates their own mission (Track B) ============
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

select id as mid, slug as mslug from public.missions
 where owner_id = '11111111-1111-1111-1111-111111111111' and visibility = 'public'
 order by created_at limit 1 \gset m_

select '4. attach' as step, public.api_attach_mission_org(
  :'m_mid'::uuid, (select id from public.organizations where slug = 'edhi-foundation'));
select '4b. attach again is a no-op' as step, public.api_attach_mission_org(
  :'m_mid'::uuid, (select id from public.organizations where slug = 'edhi-foundation'));
select '4c. attach a second' as step, public.api_attach_mission_org(
  :'m_mid'::uuid, (select id from public.organizations where slug = 'saylani-welfare'));

select '5. mission_orgs' as step, count(*) from public.mission_orgs where mission_id = :'m_mid'::uuid;

-- the public mission page sees them, with the donate_url intact
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select '6. api_mission_orgs' as step,
       jsonb_array_length(public.api_mission_orgs(:'m_mslug')) as orgs,
       public.api_mission_orgs(:'m_mslug') -> 0 ->> 'donate_url' as first_donate_url;

-- detaching is the owner's call too
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select '7. detach' as step, public.api_detach_mission_org(
  :'m_mid'::uuid, (select id from public.organizations where slug = 'saylani-welfare'));
select '7b. remaining' as step, count(*) from public.mission_orgs where mission_id = :'m_mid'::uuid;

-- the owner can search the directory to pick from it
select '8. search' as step, jsonb_array_length(public.api_search_organizations('orphans')) > 0 as ok;

-- ============ admin CRUD, including the verify step ============
reset role;
update public.profiles set is_admin = true where id = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

select '9. admin upsert' as step, public.api_admin_upsert_organization(jsonb_build_object(
  'name', 'Test Relief Trust',
  'category', 'emergency_relief',
  'causes', jsonb_build_array('emergency', 'meals'),
  'country', 'Pakistan',
  'donate_url', 'https://test-relief.example/donate',
  'is_featured', true
)) ->> 'slug' as slug;

select '9b. verify it' as step, public.api_admin_upsert_organization(jsonb_build_object(
  'id', (select id from public.organizations where slug = 'test-relief-trust'),
  'name', 'Test Relief Trust',
  'category', 'emergency_relief',
  'donate_url', 'https://test-relief.example/donate',
  'is_verified', true
)) ->> 'is_verified' as is_verified;

select '10. admin list' as step, jsonb_array_length(public.api_admin_organizations()) as organizations;

select '11. admin delete' as step, public.api_admin_delete_organization(
  (select id from public.organizations where slug = 'test-relief-trust'));

reset role;
select '11b. gone' as step, count(*) from public.organizations where slug = 'test-relief-trust';

-- ============ a mission's causes disappear with the mission ============
delete from public.missions where id = :'m_mid'::uuid;
select '12. cascade' as step, count(*) from public.mission_orgs where mission_id = :'m_mid'::uuid;

select 'DONE' as step;
