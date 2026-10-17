-- Step 49: photo_detect_attempts quota (5 per 15 minutes, service-role only).
-- Run through the privileged database tool. Rollback-only: nothing is kept.
begin;
set local role service_role;
do $$
declare
  u uuid := '45454545-4545-4545-4545-454545454545';
  i int;
begin
  for i in 1..5 loop
    if not public.consume_photo_detect_attempt(u) then
      raise exception 'attempt % should be accepted', i;
    end if;
  end loop;
  if public.consume_photo_detect_attempt(u) then
    raise exception 'sixth attempt should be refused';
  end if;
  if (select count(*) from public.photo_detect_attempts where user_id = u) <> 5 then
    raise exception 'a refused attempt must not be recorded';
  end if;
end $$;
reset role;

-- Browser roles have no grants on the table or the function.
set local role authenticated;
do $$
begin
  begin
    perform 1 from public.photo_detect_attempts limit 1;
    raise exception 'authenticated should not read photo_detect_attempts';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.consume_photo_detect_attempt(gen_random_uuid());
    raise exception 'authenticated should not execute consume_photo_detect_attempt';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- RLS is enabled with no policies.
set local role service_role;
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'photo_detect_attempts'
      and indexname = 'photo_detect_attempts_user_time'
  ) then
    raise exception 'photo_detect_attempts_user_time index must exist';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.photo_detect_attempts'::regclass) then
    raise exception 'photo_detect_attempts must have RLS enabled';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'photo_detect_attempts') then
    raise exception 'photo_detect_attempts must have no policies';
  end if;
end $$;
reset role;

-- The browser can no longer upload story photos directly; only the server
-- function (service role) writes to the bucket.
set local role authenticated;
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'story-photos: author uploads own folder'
  ) then
    raise exception 'the browser upload policy must be dropped';
  end if;
end $$;
reset role;

rollback;
