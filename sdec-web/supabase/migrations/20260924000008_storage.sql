insert into storage.buckets (id, name, public)
values ('candidate-photos', 'candidate-photos', true)
on conflict (id) do nothing;

create policy "candidate-photos public read"
  on storage.objects for select
  using (bucket_id = 'candidate-photos');

create policy "candidate-photos officer write"
  on storage.objects for insert
  with check (bucket_id = 'candidate-photos' and is_officer_or_admin());

create policy "candidate-photos officer update"
  on storage.objects for update
  using (bucket_id = 'candidate-photos' and is_officer_or_admin())
  with check (bucket_id = 'candidate-photos' and is_officer_or_admin());

create policy "candidate-photos officer delete"
  on storage.objects for delete
  using (bucket_id = 'candidate-photos' and is_officer_or_admin());

-- Students upload their own nomination photo at nominations/{voter_id}/...
-- (Phase 6). storage.foldername(name) splits the object path into an
-- array of folder segments.
create policy "candidate-photos student nomination upload"
  on storage.objects for insert
  with check (
    bucket_id = 'candidate-photos'
    and (storage.foldername(name))[1] = 'nominations'
    and (storage.foldername(name))[2] = (
      select voter_id::text from profiles where id = auth.uid()
    )
  );
