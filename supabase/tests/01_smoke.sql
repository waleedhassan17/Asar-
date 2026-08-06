\set ON_ERROR_STOP on
\pset pager off

-- 1. Sign-up creates a profile via the auth trigger
insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'ayesha@example.com',
        '{"display_name":"Ayesha"}'::jsonb);
select '1. profile bootstrapped' as step, display_name from public.profiles
 where id = '11111111-1111-1111-1111-111111111111';

-- 2. Owner creates a mission from the Feed preset
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select '2. create mission' as step,
       public.api_create_mission(jsonb_build_object(
         'template_slug', 'feed-100-people',
         'title', 'Feed 100 people for my 25th',
         'birthday_date', (current_date + 20)::text,
         'goal_amount', 100,
         'visibility', 'public',
         'story', 'Instead of gifts.'
       )) as result \gset r_
select :'r_result'::jsonb ->> 'slug' as slug \gset

-- 3. Owner attaches an external give link (auto-approved domain)
select '3. add link' as step, public.api_add_external_link(jsonb_build_object(
  'mission_id', (select id from public.missions where slug = :'slug'),
  'label', 'Give via Transparent Hands',
  'url', 'https://www.transparenthands.org/donate'
));

-- 4. Anonymous friends contribute across all three tracks
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);

select '4a. pledge' as step, public.api_add_contribution(jsonb_build_object(
  'slug', :'slug', 'track', 'pledge', 'contributor_name', 'Bilal',
  'quantity', 5, 'action_label', 'fund 5 meals', 'visitor_hash', 'hash-bilal',
  'message', 'Happy Birthday! I funded 5 meals in your name'
)) as r \gset p_
select (:'p_r'::jsonb ->> 'id') as cid, (:'p_r'::jsonb ->> 'manage_token') as tok \gset

select '4b. wish only' as step, public.api_add_contribution(jsonb_build_object(
  'slug', :'slug', 'track', 'wish', 'contributor_name', 'Sara',
  'visitor_hash', 'hash-sara', 'message', 'Wishing you the happiest year'
)) is not null as ok;

select '4c. volunteer' as step, public.api_add_contribution(jsonb_build_object(
  'slug', :'slug', 'track', 'volunteer', 'contributor_name', 'Omar',
  'quantity', 2, 'hours', 2, 'action_label', 'volunteer 2 hours',
  'visitor_hash', 'hash-omar', 'already_done', true, 'message', 'Done!'
)) is not null as ok;

select '4d. share' as step, public.api_add_contribution(jsonb_build_object(
  'slug', :'slug', 'track', 'share', 'contributor_name', 'Zara',
  'visitor_hash', 'hash-zara', 'message', 'Shared with everyone!'
)) is not null as ok;

-- 5. Contributor self-confirms their pledge with proof
select '5. confirm pledge' as step,
       public.api_confirm_contribution(:'cid'::uuid, :'tok'::uuid,
         'https://example.com/proof.jpg', 'receipt') -> 'contribution' ->> 'status' as status;

-- 6. Peer endorsement + flag
select '6a. endorse' as step,
       public.api_endorse_contribution(:'cid'::uuid, 'Sara', 'hash-sara') ->> 'endorsement_count' as n;
select '6b. flag' as step,
       public.api_flag_contribution(:'cid'::uuid, 'looks-fake', 'testing', 'hash-zara') is not null as ok;

-- 7. Live tally
select '7. stats' as step, confirmed_units, lives_impacted, goal_percent,
       contributor_count, wish_count, share_count, volunteer_count,
       proof_count, endorsed_count, joined_last_24h
  from public.mission_stats where slug = :'slug';

-- 8. Public mission page payload
select '8. get_mission' as step,
       jsonb_array_length(public.api_get_mission(:'slug') -> 'contributions') as wishes,
       public.api_get_mission(:'slug') -> 'stats' ->> 'confirmed_units' as confirmed,
       jsonb_array_length(public.api_get_mission(:'slug') -> 'links') as links;

-- 9. Click-through tracking
select '9. click' as step, public.api_record_link_click(
  (select id from public.external_links limit 1), 'hash-bilal') ->> 'url' as url;

-- 10. Reveal is locked before the birthday, for visitors
select '10. reveal locked' as step, public.api_reveal(:'slug') ->> 'is_unlocked' as unlocked;

-- ============ negative security checks ============
select '--- security ---' as step;

-- anon must not be able to write directly
do $$ begin
  begin
    insert into public.contributions (mission_id, track) values (gen_random_uuid(), 'wish');
    raise exception 'FAIL: anon could insert a contribution directly';
  exception when insufficient_privilege then
    raise notice 'PASS: direct insert into contributions denied';
  end;
end $$;

do $$ begin
  begin
    update public.missions set goal_amount = 1;
    raise exception 'FAIL: anon could update missions';
  exception when insufficient_privilege then
    raise notice 'PASS: direct update of missions denied';
  end;
end $$;

-- anon must not be able to read the secret share token
do $$ begin
  begin
    perform share_token from public.missions;
    raise exception 'FAIL: anon could read share_token';
  exception when insufficient_privilege then
    raise notice 'PASS: share_token not readable by anon';
  end;
end $$;

-- anon must not be able to read manage_token
do $$ begin
  begin
    perform manage_token from public.contributions;
    raise exception 'FAIL: anon could read manage_token';
  exception when insufficient_privilege then
    raise notice 'PASS: manage_token not readable by anon';
  end;
end $$;

-- anon must not be able to create a mission
do $$ begin
  begin
    perform public.api_create_mission('{"birthday_date":"2030-01-01"}'::jsonb);
    raise exception 'FAIL: anon created a mission';
  exception when insufficient_privilege then
    raise notice 'PASS: api_create_mission requires auth';
  end;
end $$;

-- anon must not reach the admin surface
do $$ begin
  begin
    perform public.api_admin_overview();
    raise exception 'FAIL: anon reached admin overview';
  exception when insufficient_privilege then
    raise notice 'PASS: api_admin_overview requires admin';
  end;
end $$;

-- internal helpers are not callable from the anon key
do $$ begin
  begin
    perform public.resolve_mission('anything');
    raise exception 'FAIL: anon could call resolve_mission';
  exception when insufficient_privilege then
    raise notice 'PASS: internal helper not granted to anon';
  end;
end $$;

-- confirming someone else's pledge without the token must fail
do $$ begin
  begin
    perform public.api_confirm_contribution(
      (select id from public.contributions limit 1), gen_random_uuid());
    raise exception 'FAIL: confirmed a pledge without its manage token';
  exception when sqlstate 'P0002' then
    raise notice 'PASS: wrong manage_token rejected';
  end;
end $$;

-- ============ private mission visibility (M-06) ============
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select public.api_create_mission(jsonb_build_object(
  'template_slug', 'plant-50-trees', 'title', 'Secret grove',
  'birthday_date', (current_date + 10)::text, 'visibility', 'link'
)) as r \gset priv_
select (:'priv_r'::jsonb ->> 'slug') as pslug, (:'priv_r'::jsonb ->> 'share_token') as ptok \gset

reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);

select set_config('asar.test_pslug', :'pslug', false);
do $$ begin
  begin
    perform public.api_get_mission(current_setting('asar.test_pslug'));
    raise exception 'FAIL: link-only mission opened without a token';
  exception when insufficient_privilege then
    raise notice 'PASS: link-only mission requires its share token';
  end;
end $$;

select 'private with token' as step, public.api_get_mission(:'pslug', :'ptok'::uuid) -> 'mission' ->> 'title' as title;

-- ============ admin surface ============
reset role;
update public.profiles set is_admin = true where id = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

select 'admin overview' as step,
       jsonb_array_length(public.api_admin_overview() -> 'review_queue') as flagged,
       jsonb_array_length(public.api_admin_overview() -> 'templates') as templates,
       public.api_admin_overview() -> 'transparency' ->> 'proof_attached_percent' as proof_pct;

select 'dashboard' as step,
       public.api_mission_dashboard(:'slug') -> 'stats' ->> 'lives_impacted' as lives,
       jsonb_array_length(public.api_mission_dashboard(:'slug') -> 'daily') as days;

select 'owner reaction' as step,
       public.api_react_to_contribution(:'cid'::uuid, '❤️') -> 'contribution' ->> 'owner_reaction' as reaction;

reset role;
select 'DONE' as step;
