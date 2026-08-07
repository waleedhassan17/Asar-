-- ---------------------------------------------------------------------
-- "Get in touch" messages.
--
-- Replaces the mailto link on the join band. A mailto only works if the
-- visitor has a mail client configured, which on a phone browser is
-- often not true — the link silently does nothing, which is exactly what
-- was reported.
--
-- Deliberately minimal: a name, an email to reply to, a message, and a
-- status an admin can move. No threading and no outbound mail, because
-- there is no SMTP configured — an admin replies from their own mail
-- client, which is honest about what the platform can actually do.
-- ---------------------------------------------------------------------

create table if not exists public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  email        text        not null,
  message      text        not null,
  -- Free text, kept so an admin can tell "wants to help" from "reporting
  -- a problem" without opening every message.
  topic        text        not null default 'help',
  status       text        not null default 'new'
                 check (status in ('new', 'read', 'replied', 'archived')),
  admin_note   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists contact_messages_status_idx
  on public.contact_messages (status, created_at desc);

drop trigger if exists contact_messages_touch on public.contact_messages;
create trigger contact_messages_touch
  before update on public.contact_messages
  for each row execute function public.touch_updated_at();

alter table public.contact_messages enable row level security;

-- No policy grants select to anon or authenticated: a visitor can send a
-- message but can never read anyone's, including their own. Admins read
-- through the api_admin_* functions, which are security definer.
drop policy if exists contact_messages_admin_all on public.contact_messages;
create policy contact_messages_admin_all on public.contact_messages
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ---------------------------------------------------------------------
-- Submit. Callable by anyone, including signed-out visitors.
--
-- Rate limited by email: five in an hour is far more than a real person
-- needs and low enough that the table cannot be filled from one address.
-- ---------------------------------------------------------------------
create or replace function public.api_submit_contact_message(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name    text := left(trim(coalesce(p ->> 'name', '')), 80);
  v_email   text := lower(left(trim(coalesce(p ->> 'email', '')), 200));
  v_message text := left(trim(coalesce(p ->> 'message', '')), 4000);
  v_topic   text := left(coalesce(nullif(trim(p ->> 'topic'), ''), 'help'), 40);
  m         public.contact_messages;
begin
  if length(v_name) < 2 then
    raise exception 'CONTACT_NAME_REQUIRED' using errcode = '22023';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'CONTACT_EMAIL_INVALID' using errcode = '22023';
  end if;

  if length(v_message) < 10 then
    raise exception 'CONTACT_MESSAGE_TOO_SHORT' using errcode = '22023';
  end if;

  if (
    select count(*) from public.contact_messages
     where email = v_email and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'CONTACT_RATE_LIMITED' using errcode = '54000';
  end if;

  insert into public.contact_messages (name, email, message, topic)
  values (v_name, v_email, v_message, v_topic)
  returning * into m;

  -- Nothing about the row goes back: the sender does not need an id, and
  -- returning one would let the endpoint confirm what it stored.
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- Admin read + status change.
-- ---------------------------------------------------------------------
create or replace function public.api_admin_contact_messages()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', c.id, 'name', c.name, 'email', c.email, 'message', c.message,
             'topic', c.topic, 'status', c.status, 'admin_note', c.admin_note,
             'created_at', c.created_at)
           order by
             -- New first, then most recent.
             case c.status when 'new' then 0 when 'read' then 1
                           when 'replied' then 2 else 3 end,
             c.created_at desc)
      from public.contact_messages c
     where c.status <> 'archived'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.api_admin_update_contact_message(
  p_id uuid,
  p_status text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m public.contact_messages;
begin
  if not public.is_platform_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  update public.contact_messages
     set status     = coalesce(nullif(p_status, ''), status),
         admin_note = coalesce(left(nullif(trim(p_note), ''), 2000), admin_note)
   where id = p_id
  returning * into m;

  if m.id is null then
    raise exception 'NOT_FOUND' using errcode = '02000';
  end if;

  return jsonb_build_object('id', m.id, 'status', m.status);
end;
$$;

grant execute on function public.api_submit_contact_message(jsonb) to anon, authenticated;
grant execute on function public.api_admin_contact_messages() to authenticated;
grant execute on function public.api_admin_update_contact_message(uuid, text, text) to authenticated;
