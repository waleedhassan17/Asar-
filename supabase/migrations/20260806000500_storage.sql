-- =====================================================================
-- Asar — 05. Proof storage (C-104, T-03, R-03)
--
-- One public-read bucket for proof photos. Uploads never happen straight
-- from the browser: the Next.js route handler validates size and MIME
-- type and writes with the service-role key, so no client-side insert
-- policy is needed on storage.objects.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proofs',
  'proofs',
  true,
  5242880,                                        -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can look at a proof photo (they appear on the wish wall and in
-- the reveal collage); nobody but the server can write one.
drop policy if exists "proofs are publicly readable" on storage.objects;
create policy "proofs are publicly readable" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'proofs');
