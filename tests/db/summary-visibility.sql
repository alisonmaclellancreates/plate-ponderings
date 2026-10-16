-- Step 41: is_summary_public visibility rule tests.
-- Rerunnable: uses fixed UUIDs, cleans up its own rows first and last.
-- Run with: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f tests/db/summary-visibility.sql
--
-- Rule under test: a summary version is hidden iff any story on the subject is
-- now hidden/deleted, was published at or before the version's generated_at,
-- and left public view after the version's started_at (or never left).

begin;

-- Clean slate (rerunnable)
delete from public.summaries where subject_id = 'd0000000-0000-0000-0000-000000000041';
delete from public.stories  where subject_id = 'd0000000-0000-0000-0000-000000000041';
delete from public.subjects where id = 'd0000000-0000-0000-0000-000000000041';

insert into public.subjects (id, identity_a, identity_b, normalized_key, status, published_at)
values ('d0000000-0000-0000-0000-000000000041', 'US-WA', 'VISTEST', 'US-WA|VISTEST', 'published', '2026-10-01 00:00:00+00');

-- S1: published Oct 2
insert into public.stories (id, subject_id, meaning, source, status, published_at)
values ('d0000000-0000-0000-0000-000000000101', 'd0000000-0000-0000-0000-000000000041',
        'Visibility test story one.', 'guess', 'published', '2026-10-02 00:00:00+00');

-- V1: started Oct 3, generated Oct 4, nothing hidden -> public
insert into public.summaries (id, subject_id, version, text, disagreement_score, story_count, started_at, generated_at)
values ('d0000000-0000-0000-0000-000000000201', 'd0000000-0000-0000-0000-000000000041',
        1, 'Baseline version.', 10, 1, '2026-10-03 00:00:00+00', '2026-10-04 00:00:00+00');

do $$
begin
  if not public.is_summary_public('d0000000-0000-0000-0000-000000000201') then
    raise exception 'FAIL: baseline version with no hidden stories must be public';
  end if;
end $$;

-- Case: one hidden story. S1 hidden Oct 6 (published Oct 2 <= generated Oct 4, removed Oct 6 > started Oct 3)
update public.stories set status = 'hidden', removed_at = '2026-10-06 00:00:00+00'
where id = 'd0000000-0000-0000-0000-000000000101';

do $$
begin
  if public.is_summary_public('d0000000-0000-0000-0000-000000000201') then
    raise exception 'FAIL: version covering a story later hidden must be hidden';
  end if;
end $$;

-- Case: a version started AFTER the hide stays visible.
-- V2: started Oct 7 (after removal Oct 6), generated Oct 8.
insert into public.summaries (id, subject_id, version, text, disagreement_score, story_count, started_at, generated_at)
values ('d0000000-0000-0000-0000-000000000202', 'd0000000-0000-0000-0000-000000000041',
        2, 'Written after the hide.', 10, 0, '2026-10-07 00:00:00+00', '2026-10-08 00:00:00+00');

do $$
begin
  if not public.is_summary_public('d0000000-0000-0000-0000-000000000202') then
    raise exception 'FAIL: version started after the story left view must stay public';
  end if;
end $$;

-- Case: a never-published story (pending, no published_at) never hides anything.
insert into public.stories (id, subject_id, meaning, source, status)
values ('d0000000-0000-0000-0000-000000000102', 'd0000000-0000-0000-0000-000000000041',
        'Never published.', 'guess', 'pending');

do $$
begin
  if not public.is_summary_public('d0000000-0000-0000-0000-000000000202') then
    raise exception 'FAIL: a never-published story must not affect visibility';
  end if;
end $$;

-- Case: two hidden, one restored -> still hidden.
-- S3 published Oct 2, hidden Oct 6 (same window as S1). Restore S1.
insert into public.stories (id, subject_id, meaning, source, status, published_at, removed_at)
values ('d0000000-0000-0000-0000-000000000103', 'd0000000-0000-0000-0000-000000000041',
        'Second hidden story.', 'guess', 'hidden', '2026-10-02 12:00:00+00', '2026-10-06 00:00:00+00');
update public.stories set status = 'published', removed_at = null
where id = 'd0000000-0000-0000-0000-000000000101';

do $$
begin
  if public.is_summary_public('d0000000-0000-0000-0000-000000000201') then
    raise exception 'FAIL: with one of two hidden stories restored, the version must stay hidden';
  end if;
end $$;

-- Case: a deleted story behaves like a hidden one.
update public.stories set status = 'deleted'
where id = 'd0000000-0000-0000-0000-000000000103';

do $$
begin
  if public.is_summary_public('d0000000-0000-0000-0000-000000000201') then
    raise exception 'FAIL: a deleted story must hide the versions that included it';
  end if;
end $$;

-- Case: version started before a hide, finished after it -> hidden.
-- Re-hide S1 on Oct 10; V3 started Oct 9, generated Oct 11.
update public.stories set status = 'hidden', removed_at = '2026-10-10 00:00:00+00'
where id = 'd0000000-0000-0000-0000-000000000101';
insert into public.summaries (id, subject_id, version, text, disagreement_score, story_count, started_at, generated_at)
values ('d0000000-0000-0000-0000-000000000203', 'd0000000-0000-0000-0000-000000000041',
        3, 'Started before, finished after.', 10, 1, '2026-10-09 00:00:00+00', '2026-10-11 00:00:00+00');

do $$
begin
  if public.is_summary_public('d0000000-0000-0000-0000-000000000203') then
    raise exception 'FAIL: version started before a hide and finished after it must be hidden';
  end if;
end $$;

-- Cleanup so the file is rerunnable
delete from public.summaries where subject_id = 'd0000000-0000-0000-0000-000000000041';
delete from public.stories  where subject_id = 'd0000000-0000-0000-0000-000000000041';
delete from public.subjects where id = 'd0000000-0000-0000-0000-000000000041';

commit;

select 'summary-visibility: all 7 assertions passed' as result;
