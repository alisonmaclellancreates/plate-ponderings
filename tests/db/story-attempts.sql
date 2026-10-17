-- Step 44: story_save_attempts quota (5 per 15 minutes, service-role only).
set role service_role;
do $$
declare
  u uuid := '44444444-4444-4444-4444-444444444444';
  i int;
begin
  for i in 1..5 loop
    if not public.consume_story_save_attempt(u) then
      raise exception 'attempt % should be accepted', i;
    end if;
  end loop;
  if public.consume_story_save_attempt(u) then
    raise exception 'sixth attempt should be refused';
  end if;
  if (select count(*) from public.story_save_attempts where user_id = u) <> 5 then
    raise exception 'a refused attempt must not be recorded';
  end if;
end $$;
reset role;

-- Browser roles have no grants on the table or the function.
set role authenticated;
do $$
begin
  begin
    perform 1 from public.story_save_attempts limit 1;
    raise exception 'authenticated should not read story_save_attempts';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.consume_story_save_attempt(gen_random_uuid());
    raise exception 'authenticated should not execute consume_story_save_attempt';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- RLS is enabled with no policies.
set role service_role;
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.story_save_attempts'::regclass) then
    raise exception 'story_save_attempts must have RLS enabled';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'story_save_attempts') then
    raise exception 'story_save_attempts must have no policies';
  end if;
end $$;
reset role;
