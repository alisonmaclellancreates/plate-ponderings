drop policy "subjects: public read published" on public.subjects;
drop policy "stories: public read published" on public.stories;
drop policy "summaries: read public versions" on public.summaries;
drop policy "jurisdictions: public read" on public.jurisdictions;

revoke all on public.profiles from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;
revoke all on public.jurisdictions from anon, authenticated;
revoke all on public.subjects from anon, authenticated;
revoke all on public.stories from anon, authenticated;
revoke all on public.hearts from anon, authenticated;
revoke all on public.summaries from anon, authenticated;
revoke all on public.featured_days from anon, authenticated;
revoke all on public.notifications from anon, authenticated;
revoke all on public.reports from anon, authenticated;
revoke all on public.blocks from anon, authenticated;
revoke all on public.app_settings from anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.subjects to authenticated;
grant select on public.stories to authenticated;
grant select, insert, delete on public.hearts to authenticated;
grant select, update (read_at) on public.notifications to authenticated;
grant select, insert on public.reports to authenticated;
grant select, insert, delete on public.blocks to authenticated;

create or replace function public.is_story_published(_story_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stories where id = _story_id and status = 'published')
$$;

drop policy "hearts: add own, non-demo, published story" on public.hearts;
create policy "hearts: add own, non-demo, published story" on public.hearts
  for insert to authenticated with check (
    user_id = auth.uid()
    and not public.has_role(auth.uid(), 'demo')
    and public.is_story_published(story_id));

drop policy "reports: create own, non-demo" on public.reports;
create policy "reports: create own, non-demo, published story" on public.reports
  for insert to authenticated with check (
    reporter_id = auth.uid()
    and not public.has_role(auth.uid(), 'demo')
    and public.is_story_published(story_id));

alter table public.blocks add constraint blocks_no_self_block check (blocker_id <> blocked_id);

create or replace view public.subject_owner with (security_invoker = on) as
  select distinct on (subject_id) subject_id, id as story_id, author_id, published_at
  from public.stories
  where status = 'published' and source = 'owner'
  order by subject_id, published_at asc, id asc;

drop policy if exists "story-photos: author uploads own folder" on storage.objects;
drop policy if exists "story-photos: author reads own folder" on storage.objects;
drop policy if exists "story-photos: author deletes own folder" on storage.objects;