create policy "story-photos: author uploads own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'story-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "story-photos: author reads own folder"
  on storage.objects for select to authenticated
  using (bucket_id = 'story-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "story-photos: author deletes own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'story-photos' and (storage.foldername(name))[1] = auth.uid()::text);