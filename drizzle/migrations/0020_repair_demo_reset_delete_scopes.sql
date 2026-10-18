CREATE OR REPLACE FUNCTION public.replace_demo_seed_content(_token uuid, _day date, _seed jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.renew_demo_reset(_token, _day) then
    raise exception 'The reset lock expired. Please retry Reset seed data.';
  end if;
  -- Serialize with the daily picker during relational replacement.
  perform pg_advisory_xact_lock(46, _day - date '2000-01-01');
  if jsonb_typeof(_seed) is distinct from 'object' then
    raise exception 'Invalid seed payload.';
  end if;
  if jsonb_typeof(_seed -> 'subjects') is distinct from 'array' or
     jsonb_array_length(_seed -> 'subjects') <> 16 then
    raise exception 'Invalid seed subjects count.';
  end if;
  if jsonb_typeof(_seed -> 'stories') is distinct from 'array' or
     jsonb_array_length(_seed -> 'stories') <> 17 then
    raise exception 'Invalid seed stories count.';
  end if;
  if jsonb_typeof(_seed -> 'summaries') is distinct from 'array' or
     jsonb_array_length(_seed -> 'summaries') <> 9 then
    raise exception 'Invalid seed summaries count.';
  end if;
  if jsonb_typeof(_seed -> 'featured_days') is distinct from 'array' or
     jsonb_array_length(_seed -> 'featured_days') <> 5 then
    raise exception 'Invalid seed featured_days count.';
  end if;
  if jsonb_typeof(_seed -> 'notifications') is distinct from 'array' or
     jsonb_array_length(_seed -> 'notifications') <> 2 then
    raise exception 'Invalid seed notifications count.';
  end if;
  if jsonb_typeof(_seed -> 'reports') is distinct from 'array' or
     jsonb_array_length(_seed -> 'reports') <> 1 then
    raise exception 'Invalid seed reports count.';
  end if;
  if jsonb_typeof(_seed -> 'hearts') is distinct from 'array' then
    raise exception 'Invalid seed hearts.';
  end if;
  if (select count(*) from jsonb_array_elements(_seed -> 'stories') r
      where r ->> 'status' = 'published') <> 15 or
     (select count(*) from jsonb_array_elements(_seed -> 'stories') r
      where r ->> 'status' = 'pending') <> 1 or
     (select count(*) from jsonb_array_elements(_seed -> 'stories') r
      where r ->> 'status' = 'rejected') <> 1 or
     (select count(*) from jsonb_array_elements(_seed -> 'stories') r
      where r ->> 'photo_path' is not null) <> 5 then
    raise exception 'Invalid seed story states or photos.';
  end if;
  delete from public.featured_days where day is not null;
  delete from public.notifications where id is not null;
  delete from public.reports where id is not null;
  delete from public.hearts where story_id is not null;
  delete from public.blocks where blocker_id is not null;
  delete from public.subject_guesses where subject_id is not null;
  delete from public.summary_runs where subject_id is not null;
  delete from public.summaries where id is not null;
  delete from public.stories where id is not null;
  delete from public.subjects where id is not null;
  insert into public.subjects (id, identity_a, identity_b, normalized_key, image_path, status, created_by, created_at, published_at)
  select id, identity_a, identity_b, normalized_key, image_path, status, created_by, created_at, published_at from jsonb_populate_recordset(null::public.subjects, _seed -> 'subjects');
  insert into public.stories (id, subject_id, author_id, meaning, source, body, photo_path, status, created_at, published_at, removed_at, photo_box)
  select id, subject_id, author_id, meaning, source, body, photo_path, status, created_at, published_at, removed_at, photo_box from jsonb_populate_recordset(null::public.stories, _seed -> 'stories');
  insert into public.summaries (id, subject_id, version, text, disagreement_score, story_count, started_at, generated_at)
  select id, subject_id, version, text, disagreement_score, story_count, started_at, generated_at from jsonb_populate_recordset(null::public.summaries, _seed -> 'summaries');
  insert into public.hearts (story_id, user_id, created_at)
  select story_id, user_id, created_at from jsonb_populate_recordset(null::public.hearts, _seed -> 'hearts');
  insert into public.featured_days (day, subject_id, stories_at_pick)
  select day, subject_id, stories_at_pick from jsonb_populate_recordset(null::public.featured_days, _seed -> 'featured_days');
  insert into public.notifications (id, user_id, kind, subject_id, story_id, created_at, read_at)
  select id, user_id, kind, subject_id, story_id, created_at, read_at from jsonb_populate_recordset(null::public.notifications, _seed -> 'notifications');
  insert into public.reports (id, story_id, reporter_id, reason, note, created_at)
  select id, story_id, reporter_id, reason, note, created_at from jsonb_populate_recordset(null::public.reports, _seed -> 'reports');
  if not exists (select 1 from public.featured_days where day = _day) then
    raise exception 'The seed must include Plate of the Day for the demo date.';
  end if;
end $function$;
REVOKE ALL ON FUNCTION public.replace_demo_seed_content(uuid,date,jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_demo_seed_content(uuid,date,jsonb) TO service_role;