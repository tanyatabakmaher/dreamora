-- Applied to the Supabase project as migration "images_storage".
-- Goal pictures and profile photos are uploaded to the public bucket "images" (max 300 KB, jpeg/png/webp); the database keeps only the URL.
-- Files live in a folder named after the uploader's user id with a random file name. Only the folder owner can add, replace or delete files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 307200, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "images_insert_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "images_update_own_folder" on storage.objects for update to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "images_delete_own_folder" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);
