-- ---------------------------------------------------------------------
-- First-run onboarding + avatars.
--
-- Idempotent like every migration here: safe to re-run.
-- ---------------------------------------------------------------------

-- When the person finished (or skipped) onboarding. Null means they have
-- never been through it, which is what the middleware gate reads. A
-- timestamp rather than a boolean so that changing the flow later can
-- decide "anyone who onboarded before date X should see the new step".
alter table public.profiles
  add column if not exists onboarded_at timestamptz;

-- profiles_update_self already restricts updates to your own row and
-- refuses is_admin changes; the column grant is what decides which
-- columns an authenticated user may write at all, so onboarded_at has to
-- be added to it or the update is silently refused.
grant update (display_name, avatar_url, birthday, onboarded_at)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- Avatars bucket.
--
-- Separate from `proofs` because the limits differ: an avatar is small
-- and square, a proof photo is a phone camera shot. Sharing a bucket
-- would mean taking the larger of the two limits for both.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read, mirroring the proofs bucket. Writes have no policy at all
-- and happen only through the service role, so nobody can upload an
-- avatar over someone else's key.
drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');
