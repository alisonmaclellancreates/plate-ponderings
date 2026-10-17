-- Step 51: effective date, frozen selection, reset lease and demo quotas.
-- Privileged database tool only. Every fixture and setting change rolls back.
begin;
do $$
declare
  real_today date := (current_timestamp at time zone 'UTC')::date;
  token uuid := '51515151-5151-5151-5151-515151515151';
  other uuid := '52525252-5252-5252-5252-525252525252';
  fn text;
  r text;
begin
  update public.app_settings set demo_mode = false, demo_today = '2026-10-17' where id = true;
  if public.effective_today() is distinct from real_today then raise exception 'FAIL off date'; end if;
  begin
    perform public.claim_demo_reset(token);
    raise exception 'FAIL off reset allowed';
  exception when raise_exception then
    if sqlerrm <> 'Reset seed data is available only while demo mode is on.' then raise; end if;
  end;
  update public.app_settings set demo_mode = true, demo_today = null where id = true;
  if public.effective_today() is distinct from real_today then raise exception 'FAIL unset date'; end if;
  begin
    perform public.claim_demo_reset(token);
    raise exception 'FAIL empty date reset allowed';
  exception when raise_exception then
    if sqlerrm <> 'Set the demo date before resetting seed data.' then raise; end if;
  end;
  update public.app_settings set demo_today = '2026-10-17' where id = true;
  if public.effective_today() is distinct from date '2026-10-17' then raise exception 'FAIL frozen date'; end if;
  delete from public.featured_days where day = '2026-10-17';
  if exists(select 1 from public.pick_featured_subject_for_today()) or
     exists(select 1 from public.featured_days where day = '2026-10-17') then
    raise exception 'FAIL frozen picker wrote a new day';
  end if;
  delete from public.demo_reset_lease where id = true;
  if not public.claim_demo_reset(token) or public.claim_demo_reset(other) then raise exception 'FAIL lease exclusion'; end if;
  if public.renew_demo_reset(other, '2026-10-17') then raise exception 'FAIL foreign renewal'; end if;
  if not public.renew_demo_reset(token, '2026-10-17') then raise exception 'FAIL own renewal'; end if;
  begin
    perform public.replace_demo_seed_content(token, '2026-10-17', '{}'::jsonb);
    raise exception 'FAIL invalid payload accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid seed subjects count.' then raise; end if;
  end;
  perform public.release_demo_reset(other);
  if not exists(select 1 from public.demo_reset_lease where token = token) then raise exception 'FAIL foreign release'; end if;
  perform public.release_demo_reset(token);
  if exists(select 1 from public.demo_reset_lease) then raise exception 'FAIL release'; end if;
  foreach fn in array array['public.effective_today()', 'public.claim_demo_reset(uuid)',
    'public.renew_demo_reset(uuid,date)', 'public.release_demo_reset(uuid)',
    'public.replace_demo_seed_content(uuid,date,jsonb)'] loop
    foreach r in array array['anon','authenticated'] loop
      if has_function_privilege(r,fn,'execute') then raise exception 'FAIL browser execute %',fn; end if;
    end loop;
    if not has_function_privilege('service_role',fn,'execute') then raise exception 'FAIL service execute %',fn; end if;
  end loop;
  if not (select relrowsecurity from pg_class where oid='public.demo_reset_lease'::regclass) or
    exists(select 1 from pg_policies where schemaname='public' and tablename='demo_reset_lease') then
    raise exception 'FAIL lease RLS';
  end if;
end $$;
insert into auth.users(id) values('d0000000-0000-0000-0000-000000000051');
insert into public.user_roles(user_id,role) values('d0000000-0000-0000-0000-000000000051','demo');
do $$ begin
  if public.consume_story_save_attempt('d0000000-0000-0000-0000-000000000051') or
     public.consume_subject_save_attempt('d0000000-0000-0000-0000-000000000051') then raise exception 'FAIL demo quotas'; end if;
  if exists(select 1 from public.story_save_attempts where user_id='d0000000-0000-0000-0000-000000000051') or
     exists(select 1 from public.subject_save_attempts where user_id='d0000000-0000-0000-0000-000000000051') then raise exception 'FAIL demo attempts recorded'; end if;
end $$;
rollback;
select 'demo-reset: all assertions passed; rolled back' as result;