-- Inspect the deployed repair without invoking reset or deleting any rows.
begin;
do $$
declare
  definition text := lower(pg_get_functiondef('public.replace_demo_seed_content(uuid,date,jsonb)'::regprocedure));
  target text;
  key_column text;
  delete_count integer;
begin
  for target, key_column in
    select * from (values
      ('featured_days', 'day'), ('notifications', 'id'), ('reports', 'id'),
      ('hearts', 'story_id'), ('blocks', 'blocker_id'),
      ('subject_guesses', 'subject_id'), ('summary_runs', 'subject_id'),
      ('summaries', 'id'), ('stories', 'id'), ('subjects', 'id')
    ) as scopes(table_name, column_name)
  loop
    if position('delete from public.' || target || ' where ' || key_column || ' is not null;' in definition) = 0 then
      raise exception 'FAIL reset delete scope: %', target;
    end if;
    if not exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target
        and column_name = key_column and is_nullable = 'NO') then
      raise exception 'FAIL reset scope must include every row: %.%', target, key_column;
    end if;
  end loop;
  select count(*) into delete_count from regexp_matches(definition, 'delete from public\.', 'g');
  if delete_count <> 10 then raise exception 'FAIL reset table boundary'; end if;
  if position('public.renew_demo_reset(_token, _day)' in definition) = 0 then
    raise exception 'FAIL reset lease guard missing';
  end if;
  if has_function_privilege('anon', 'public.replace_demo_seed_content(uuid,date,jsonb)', 'execute')
    or has_function_privilege('authenticated', 'public.replace_demo_seed_content(uuid,date,jsonb)', 'execute')
    or not has_function_privilege('service_role', 'public.replace_demo_seed_content(uuid,date,jsonb)', 'execute') then
    raise exception 'FAIL reset service-only access';
  end if;
end $$;
rollback;
select 'demo-reset-delete-scope: all assertions passed; rolled back; reset not invoked' as result;