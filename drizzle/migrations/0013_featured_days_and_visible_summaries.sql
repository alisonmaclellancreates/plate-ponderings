create or replace function public.pick_featured_subject_for_today()
returns table(day date, subject_id uuid, stories_at_pick integer)
language plpgsql security definer set search_path = public, pg_temp as $$
declare today date := (current_timestamp at time zone 'UTC')::date; picked uuid; picked_count integer;
begin
  perform pg_advisory_xact_lock(46, today - date '2000-01-01');
  if not exists (select 1 from public.featured_days f where f.day = today) then
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
  where f.day <= (current_timestamp at time zone 'UTC')::date
    and (_before is null or f.day < _before)
  group by f.day, f.subject_id, f.stories_at_pick, j.name, s.identity_b
  order by f.day desc
  limit least(greatest(coalesce(_limit,12),1),13)
$$;
revoke all on function public.get_featured_subject_days(date, integer) from public, anon, authenticated;
grant execute on function public.get_featured_subject_days(date, integer) to service_role;

create or replace function public.get_visible_summary_versions(_subject_id uuid)
returns table(version integer, text text, disagreement_score integer, story_count integer, started_at timestamptz, generated_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select v.version, v.text, v.disagreement_score, v.story_count, v.started_at, v.generated_at
  from public.summaries v
  join public.subjects s on s.id = v.subject_id and s.status = 'published'
  where v.subject_id = _subject_id and public.is_summary_public(v.id)
  order by v.version desc
$$;
revoke all on function public.get_visible_summary_versions(uuid) from public, anon, authenticated;
grant execute on function public.get_visible_summary_versions(uuid) to service_role;