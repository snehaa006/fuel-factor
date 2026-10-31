-- Storage for the weekly challenge photo.
--
-- The Week 1 challenge asks for a breakfast photo, which is the one thing the
-- app stores that is a picture of a child. Three decisions follow from that
-- and none of them is a default:
--
--   1. The bucket is PRIVATE. Nothing is ever served from a public URL. The
--      app holds an object path and asks for a short-lived signed URL when it
--      needs to draw the image.
--
--   2. Only the athlete can read their own photo. A coach can already read
--      the completion row, because that is a tick on a log -- the image is
--      not, and nobody has asked for coaches to see these. Granting it later
--      is one policy; un-sharing a photo of a minor is not possible. The
--      coach dashboard is specified as roster, compliance and flags, with no
--      photos in it.
--
--   3. The path is <participant_id>/<challenge_id>/<date>.<ext>, so the first
--      folder is the owner and a policy can check it without trusting
--      anything the client said.
--
-- Nothing here is exported. photo_path on challenge_completions is tier 2.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'challenge-photos',
  'challenge-photos',
  false,
  5242880,                                  -- 5 MB; a phone photo downscaled by the picker
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
);

-- The first folder of the object name, which is the participant it belongs to.
-- Compared as text so a malformed path fails the policy instead of raising on
-- a bad uuid cast.
create policy "athlete reads own challenge photos" on storage.objects
  for select to authenticated using (
    bucket_id = 'challenge-photos'
    and (storage.foldername(name))[1] = private.current_participant_id()::text
  );

create policy "athlete writes own challenge photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'challenge-photos'
    and (storage.foldername(name))[1] = private.current_participant_id()::text
  );

create policy "athlete replaces own challenge photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'challenge-photos'
    and (storage.foldername(name))[1] = private.current_participant_id()::text
  )
  with check (
    bucket_id = 'challenge-photos'
    and (storage.foldername(name))[1] = private.current_participant_id()::text
  );

create policy "athlete deletes own challenge photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'challenge-photos'
    and (storage.foldername(name))[1] = private.current_participant_id()::text
  );
