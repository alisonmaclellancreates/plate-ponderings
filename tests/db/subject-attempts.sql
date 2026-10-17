-- Step 43 corrective-migration fixtures. Run through the privileged database tool.
begin;
do $$ declare n integer; begin
 for n in 1..5 loop if not public.consume_subject_save_attempt('d0000000-0000-0000-0000-000000000042') then raise exception 'FAIL attempt %',n; end if; end loop;
 if public.consume_subject_save_attempt('d0000000-0000-0000-0000-000000000042') then raise exception 'FAIL sixth attempt accepted'; end if;
 if (select count(*) from public.subject_save_attempts where user_id='d0000000-0000-0000-0000-000000000042')<>5 then raise exception 'FAIL denied attempt recorded'; end if;
 update public.subject_save_attempts set attempted_at=clock_timestamp()-interval '15 minutes' where user_id='d0000000-0000-0000-0000-000000000042';
 if not public.consume_subject_save_attempt('d0000000-0000-0000-0000-000000000042') then raise exception 'FAIL expired attempts counted'; end if;
 if has_table_privilege('anon','public.subject_save_attempts','select') or has_table_privilege('authenticated','public.subject_save_attempts','select') then raise exception 'FAIL attempts exposed to browser roles'; end if;
 if has_table_privilege('anon','public.subject_save_attempts','insert') or has_table_privilege('authenticated','public.subject_save_attempts','insert') then raise exception 'FAIL browser inserts allowed'; end if;
 if has_function_privilege('anon','public.consume_subject_save_attempt(uuid)','execute') or has_function_privilege('authenticated','public.consume_subject_save_attempt(uuid)','execute') or has_function_privilege('public','public.consume_subject_save_attempt(uuid)','execute') then raise exception 'FAIL browser roles can execute'; end if;
 if not has_function_privilege('service_role','public.consume_subject_save_attempt(uuid)','execute') then raise exception 'FAIL service_role cannot execute'; end if;
 if not (select relrowsecurity from pg_class where oid='public.subject_save_attempts'::regclass) then raise exception 'FAIL row level security off'; end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename='subject_save_attempts') then raise exception 'FAIL unexpected policy on attempts'; end if;
end $$;
rollback;
select 'subject-attempts: 5/15-minute quota, denial without recording, browser refusal, service_role execute and RLS checks passed; fixtures rolled back' as result;
