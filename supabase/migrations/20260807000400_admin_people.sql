-- ---------------------------------------------------------------------
-- Who is actually on the platform.
--
-- The admin dashboard could see flags, links, orgs and templates but not
-- a single person — there was no way to answer "how many people have
-- signed up" or "who is running a mission" without opening the Supabase
-- console.
--
-- Security definer so it can read across profiles (RLS otherwise limits
-- an authenticated user to their own row), with the admin check as the
-- first statement. Emails are included because an admin needs to be able
-- to contact someone about their mission — this endpoint is the reason
-- the admin check is not optional.
-- ---------------------------------------------------------------------

create or replace function public.api_admin_people()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totals', jsonb_build_object(
      'people',    (select count(*) from public.profiles),
      'admins',    (select count(*) from public.profiles where is_admin),
      -- Someone who finished (or skipped) onboarding, i.e. got past the
      -- front door rather than only holding an account.
      'onboarded', (select count(*) from public.profiles where onboarded_at is not null),
      'owners',    (select count(distinct owner_id) from public.missions),
      'missions',  (select count(*) from public.missions),
      'joined_last_7d', (
        select count(*) from public.profiles where created_at > now() - interval '7 days'
      )
    ),
    'people', coalesce((
      select jsonb_agg(person order by person ->> 'created_at' desc)
        from (
          select jsonb_build_object(
                   'id', p.id,
                   'display_name', p.display_name,
                   'email', p.email,
                   'avatar_url', p.avatar_url,
                   'is_admin', p.is_admin,
                   'created_at', p.created_at,
                   'onboarded_at', p.onboarded_at,
                   'mission_count', coalesce(m.mission_count, 0),
                   'missions', coalesce(m.missions, '[]'::jsonb)
                 ) as person
            from public.profiles p
            left join (
              select mi.owner_id,
                     count(*)::integer as mission_count,
                     jsonb_agg(jsonb_build_object(
                       'slug', mi.slug,
                       'title', mi.title,
                       'icon', mi.icon,
                       'goal_amount', mi.goal_amount,
                       'unit_plural', mi.unit_plural,
                       'birthday_date', mi.birthday_date,
                       'status', mi.status,
                       'is_revealed', now() >= mi.reveal_at,
                       'confirmed_units', coalesce(s.confirmed_units, 0),
                       'contributor_count', coalesce(s.contributor_count, 0)
                     ) order by mi.created_at desc) as missions
                from public.missions mi
                left join public.mission_stats s on s.mission_id = mi.id
               group by mi.owner_id
            ) m on m.owner_id = p.id
        ) rows
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.api_admin_people() to authenticated;
