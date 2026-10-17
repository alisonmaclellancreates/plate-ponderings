-- Step 48: report note limit, reporter SET NULL on account deletion, get_reported_stories grants,
-- and summary versions hidden then restored by hide/unhide. Privileged database tool, rollback only.
begin;
insert into auth.users (id) values ('d0000000-0000-0000-0000-0000000004a8'), ('d0000000-0000-0000-0000-0000000004a9');
insert into public.subjects (id,identity_a,identity_b,normalized_key,status,published_at)
values ('d0000000-0000-0000-0000-000000000481','US-WA','ACTIONS','US-WA|ACTIONS','published', now() - interval '2 days');
insert into public.stories (id,subject_id,author_id,meaning,source,status,published_at)
values ('d0000000-0000-0000-0000-000000000482','d0000000-0000-0000-0000-000000000481','d0000000-0000-0000-0000-0000000004a8','A test story about actions','guess','published', now() - interval '1 day');
insert into public.summaries (subject_id,version,text,disagreement_score,story_count,started_at,generated_at)
values ('d0000000-0000-0000-0000-000000000481',1,'Test summary.',10,1, now() - interval '12 hours', now() - interval '11 hours');
do $$ begin
 begin
  insert into public.reports (story_id,reporter_id,reason,note)
  values ('d0000000-0000-0000-0000-000000000482','d0000000-0000-0000-0000-0000000004a9','spam', repeat('x',201));
  raise exception 'FAIL: 201-character note accepted';
 exception when check_violation then null; end;
 insert into public.reports (story_id,reporter_id,reason,note)
 values ('d0000000-0000-0000-0000-000000000482','d0000000-0000-0000-0000-0000000004a9','spam', repeat('x',200));
 begin
  insert into public.reports (story_id,reporter_id,reason)
  values ('d0000000-0000-0000-0000-000000000482','d0000000-0000-0000-0000-0000000004a9','other');
  raise exception 'FAIL: second report by the same person accepted';
 exception when unique_violation then null; end;
 if has_function_privilege('authenticated','public.get_reported_stories()','EXECUTE')
    or has_function_privilege('anon','public.get_reported_stories()','EXECUTE') then
  raise exception 'FAIL: browser can call get_reported_stories';
 end if;
 if not has_function_privilege('service_role','public.get_reported_stories()','EXECUTE') then
  raise exception 'FAIL: service_role cannot call get_reported_stories';
 end if;
end $$;
set local role service_role;
do $$ declare r record; begin
 select * into r from public.get_reported_stories() where story_id='d0000000-0000-0000-0000-000000000482';
 if r.report_count <> 1 or r.reasons <> array['spam'] or r.plate_text <> 'ACTIONS' then
  raise exception 'FAIL: reported row %', r;
 end if;
end $$;
reset role;
-- Hide: versions written from the story disappear; published_at is kept.
update public.stories set status='hidden', removed_at=now() where id='d0000000-0000-0000-0000-000000000482';
do $$ begin
 if (select count(*) from public.get_visible_summary_versions('d0000000-0000-0000-0000-000000000481')) <> 0 then
  raise exception 'FAIL: version visible while its story is hidden';
 end if;
 if (select published_at from public.stories where id='d0000000-0000-0000-0000-000000000482') is null then
  raise exception 'FAIL: published_at cleared';
 end if;
end $$;
-- Unhide: the version comes back.
update public.stories set status='published', removed_at=null where id='d0000000-0000-0000-0000-000000000482';
do $$ begin
 if (select count(*) from public.get_visible_summary_versions('d0000000-0000-0000-0000-000000000481')) <> 1 then
  raise exception 'FAIL: version not restored by unhide';
 end if;
end $$;
-- Tombstone: the version disappears again.
update public.stories set status='deleted', meaning='', body=null, photo_path=null, removed_at=now()
where id='d0000000-0000-0000-0000-000000000482';
do $$ begin
 if (select count(*) from public.get_visible_summary_versions('d0000000-0000-0000-0000-000000000481')) <> 0 then
  raise exception 'FAIL: version visible after tombstone';
 end if;
end $$;
-- Deleting the reporter's auth user cascades to the profile, which nulls the reporter and keeps the report.
delete from auth.users where id='d0000000-0000-0000-0000-0000000004a9';
do $$ begin
 if (select count(*) from public.reports where story_id='d0000000-0000-0000-0000-000000000482' and reporter_id is null) <> 1 then
  raise exception 'FAIL: report not kept with a null reporter';
 end if;
end $$;
rollback;
select 'story-actions: all assertions passed' as result;
