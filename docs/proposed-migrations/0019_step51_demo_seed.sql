-- Proposed 0019: Step 51. Not applied. No settings values are changed.
alter table public.app_settings add column demo_today date;

create function public.effective_today()
returns date language sql stable security definer
set search_path = public, pg_temp as $$
  select coalesce(
    (select case when s.demo_mode then s.demo_today end
     from public.app_settings s where s.id = true),
    (current_timestamp at time zone 'UTC')::date
  );
$$;
revoke all on function public.effective_today() from public, anon, authenticated;
grant execute on function public.effective_today() to service_role;

create or replace function public.pick_featured_subject_for_today()
returns table(day date, subject_id uuid, stories_at_pick integer)
language plpgsql security definer set search_path = public, pg_temp as $$
declare today date := public.effective_today(); picked uuid; picked_count integer; frozen boolean;

begin
  perform pg_advisory_xact_lock(46, today - date '2000-01-01');
  select coalesce(s.demo_mode and s.demo_today is not null, false) into frozen
  from public.app_settings s where s.id = true;
  if not coalesce(frozen, false) and not exists (select 1 from public.featured_days f where f.day = today) then
    select s.id, count(st.id)::integer into picked, picked_count
    from public.subjects s
    left join public.stories st on st.subject_id = s.id and st.status = 'published'
    where s.status = 'published' and not exists (
      select 1 from public.featured_days f where f.subject_id = s.id
        and f.day >= today - 30 and f.day < today)
    group by s.id
    order by count(st.id) asc, random()
    limit 1;
    if picked is not null then
      insert into public.featured_days(day, subject_id, stories_at_pick)
      values(today, picked, picked_count) on conflict on constraint featured_days_pkey do nothing;
    end if;
  end if;
  return query select f.day, f.subject_id, f.stories_at_pick from public.featured_days f where f.day = today;
end $$;
revoke all on function public.pick_featured_subject_for_today() from public, anon, authenticated;
grant execute on function public.pick_featured_subject_for_today() to service_role;

create or replace function public.get_featured_subject_days(_before date default null, _limit integer default 12)
returns table(day date, subject_id uuid, stories_at_pick integer, jurisdiction text, plate_text text, story_count integer, has_owner_story boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select f.day, f.subject_id, f.stories_at_pick, j.name, s.identity_b,
    count(st.id)::integer, coalesce(bool_or(st.source = 'owner'), false)
  from public.featured_days f
  join public.subjects s on s.id = f.subject_id and s.status = 'published'
  join public.jurisdictions j on j.code = s.identity_a
  left join public.stories st on st.subject_id = s.id and st.status = 'published'
  where f.day <= public.effective_today()
    and (_before is null or f.day < _before)
  group by f.day, f.subject_id, f.stories_at_pick, j.name, s.identity_b
  order by f.day desc
  limit least(greatest(coalesce(_limit,12),1),13)
$$;
revoke all on function public.get_featured_subject_days(date, integer) from public, anon, authenticated;
grant execute on function public.get_featured_subject_days(date, integer) to service_role;

-- Coordination only. Reset does not delete this operational table.
create table public.demo_reset_lease (
  id boolean primary key default true check (id = true),
  token uuid not null,
  expires_at timestamptz not null
);
grant all on public.demo_reset_lease to service_role;
revoke all on public.demo_reset_lease from public, anon, authenticated;
alter table public.demo_reset_lease enable row level security;
-- No browser policies. No time-dependent CHECK constraint.

create function public.claim_demo_reset(_token uuid)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
declare claimed boolean;
begin
  if not exists (select 1 from public.app_settings where id = true and demo_mode) then
    raise exception 'Reset seed data is available only while demo mode is on.';
  end if;
  if not exists (select 1 from public.app_settings where id = true and demo_today is not null) then
    raise exception 'Set the demo date before resetting seed data.';
  end if;
  insert into public.demo_reset_lease as lease (id, token, expires_at)
  values (true, _token, clock_timestamp() + interval '15 minutes')
  on conflict (id) do update set token = excluded.token, expires_at = excluded.expires_at
    where lease.expires_at <= clock_timestamp()
  returning true into claimed;
  return coalesce(claimed, false);
end $$;
revoke all on function public.claim_demo_reset(uuid) from public, anon, authenticated;
grant execute on function public.claim_demo_reset(uuid) to service_role;

create function public.renew_demo_reset(_token uuid, _day date)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
declare renewed boolean;
begin
  if not exists (select 1 from public.app_settings
                 where id = true and demo_mode and demo_today = _day) then
    raise exception 'Demo mode and its date must remain set while resetting seed data.';
  end if;
  update public.demo_reset_lease
  set expires_at = clock_timestamp() + interval '15 minutes'
  where id = true and token = _token and expires_at > clock_timestamp()
  returning true into renewed;
  return coalesce(renewed, false);
end $$;
revoke all on function public.renew_demo_reset(uuid, date) from public, anon, authenticated;
grant execute on function public.renew_demo_reset(uuid, date) to service_role;

create function public.release_demo_reset(_token uuid)
returns void language sql security definer
set search_path = public, pg_temp as $$
  delete from public.demo_reset_lease where id = true and token = _token;
$$;
revoke all on function public.release_demo_reset(uuid) from public, anon, authenticated;
grant execute on function public.release_demo_reset(uuid) to service_role;

-- Payload is constructed by server-only seed code, never supplied by the browser.
-- Server verifies caller is admin and not demo before privileged access.
create function public.replace_demo_seed_content(_token uuid, _day date, _seed jsonb)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
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
  delete from public.featured_days;
  delete from public.notifications;
  delete from public.reports;
  delete from public.hearts;
  delete from public.blocks;
  delete from public.subject_guesses;
  delete from public.summary_runs;
  delete from public.summaries;
  delete from public.stories;
  delete from public.subjects;
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
end $$;
revoke all on function public.replace_demo_seed_content(uuid, date, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_demo_seed_content(uuid, date, jsonb)
  to service_role;

create or replace function public.consume_subject_save_attempt(_user_id uuid)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if public.has_role(_user_id, 'demo') then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(_user_id::text, 43));
  if (select count(*) from public.subject_save_attempts
      where user_id = _user_id and attempted_at > clock_timestamp() - interval '15 minutes') >= 5 then
    return false;
  end if;
  insert into public.subject_save_attempts (user_id, attempted_at)
  values (_user_id, clock_timestamp());
  return true;
end $$;
revoke all on function public.consume_subject_save_attempt(uuid) from public, anon, authenticated;
grant execute on function public.consume_subject_save_attempt(uuid) to service_role;

create or replace function public.consume_story_save_attempt(_user_id uuid)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if public.has_role(_user_id, 'demo') then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(_user_id::text, 44));
  if (select count(*) from public.story_save_attempts
      where user_id = _user_id and attempted_at > clock_timestamp() - interval '15 minutes') >= 5 then
    return false;
  end if;
  insert into public.story_save_attempts (user_id, attempted_at)
  values (_user_id, clock_timestamp());
  return true;
end $$;
revoke all on function public.consume_story_save_attempt(uuid) from public, anon, authenticated;
grant execute on function public.consume_story_save_attempt(uuid) to service_role;

