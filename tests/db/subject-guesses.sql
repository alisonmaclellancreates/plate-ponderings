-- Step 45b: isolated immutable guesses. Privileged database tool, rollback only.
begin;
insert into public.subjects (id,identity_a,identity_b,normalized_key,status)
values ('d0000000-0000-0000-0000-000000000045','US-WA','GUESSDB','US-WA|GUESSDB','published');
set local role service_role;
insert into public.subject_guesses(subject_id,meaning,story)
values ('d0000000-0000-0000-0000-000000000045','One playful possibility','A fictional letter puzzle.');
do $$ begin
 if (select count(*) from public.subject_guesses where subject_id='d0000000-0000-0000-0000-000000000045') <> 1 then raise exception 'FAIL: service read/insert'; end if;
 begin
  insert into public.subject_guesses(subject_id,meaning,story) values ('d0000000-0000-0000-0000-000000000045','replacement','replacement');
  raise exception 'FAIL: duplicate allowed';
 exception when unique_violation then null; end;
 begin
  update public.subject_guesses set meaning='replacement' where subject_id='d0000000-0000-0000-0000-000000000045';
  raise exception 'FAIL: service update allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare r text; p text; begin
 foreach r in array array['anon','authenticated'] loop
  foreach p in array array['SELECT','INSERT','UPDATE','DELETE'] loop
   if has_table_privilege(r,'public.subject_guesses',p) then raise exception 'FAIL: browser privilege % %',r,p; end if;
  end loop;
 end loop;
 if not (select relrowsecurity from pg_class where oid='public.subject_guesses'::regclass) then raise exception 'FAIL: RLS off'; end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename='subject_guesses') then raise exception 'FAIL: policy exists'; end if;
 begin
  update public.subject_guesses set meaning=repeat('x',81) where subject_id='d0000000-0000-0000-0000-000000000045';
  raise exception 'FAIL: 81 characters allowed';
 exception when check_violation then null; end;
end $$;
delete from public.subjects where id='d0000000-0000-0000-0000-000000000045';
do $$ begin
 if exists(select 1 from public.subject_guesses where subject_id='d0000000-0000-0000-0000-000000000045') then raise exception 'FAIL: cascade failed'; end if;
end $$;
rollback;
select 'subject-guesses: all assertions passed' as result;
