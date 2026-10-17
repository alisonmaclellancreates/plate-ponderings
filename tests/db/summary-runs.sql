-- Step 45: claim_summary_run, one summary run per plate per minute.
-- Rerunnable: fixed UUIDs, runs inside a transaction that is rolled back.
-- Run with: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f tests/db/summary-runs.sql

begin;

insert into public.subjects (id, identity_a, identity_b, normalized_key, status, published_at)
values ('d0000000-0000-0000-0000-000000000045', 'US-WA', 'RUNTEST', 'US-WA|RUNTEST', 'published', now());

do $$
begin
  if not public.claim_summary_run('d0000000-0000-0000-0000-000000000045') then
    raise exception 'FAIL: first claim must succeed';
  end if;
  if public.claim_summary_run('d0000000-0000-0000-0000-000000000045') then
    raise exception 'FAIL: a second claim within the minute must be refused';
  end if;
end $$;

-- A run that began over a minute ago can be claimed again.
update public.summary_runs set last_started_at = clock_timestamp() - interval '61 seconds'
where subject_id = 'd0000000-0000-0000-0000-000000000045';

do $$
begin
  if not public.claim_summary_run('d0000000-0000-0000-0000-000000000045') then
    raise exception 'FAIL: a claim after the minute must succeed';
  end if;
end $$;

-- Closed twice: no browser grants on the table or the function.
do $$
begin
  if has_table_privilege('anon', 'public.summary_runs', 'select')
     or has_table_privilege('authenticated', 'public.summary_runs', 'select')
     or has_table_privilege('authenticated', 'public.summary_runs', 'insert') then
    raise exception 'FAIL: browser roles must have no access to summary_runs';
  end if;
  if has_function_privilege('anon', 'public.claim_summary_run(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.claim_summary_run(uuid)', 'execute') then
    raise exception 'FAIL: browser roles must not execute claim_summary_run';
  end if;
  if not has_function_privilege('service_role', 'public.claim_summary_run(uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.is_summary_public(uuid)', 'execute') then
    raise exception 'FAIL: service_role must execute claim_summary_run and is_summary_public';
  end if;
end $$;

rollback;

select 'summary-runs: all assertions passed' as result;
