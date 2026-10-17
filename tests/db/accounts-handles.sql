-- Step 42 rollback-only fixtures. Run through the privileged database tool.
begin;
insert into auth.users (id) values ('d0000000-0000-0000-0000-000000000042'), ('d0000000-0000-0000-0000-000000000043');
do $$ declare h text; begin
 select handle into h from public.profiles where id='d0000000-0000-0000-0000-000000000042';
 if h !~ '^Traveler[0-9]{4}$' or h='Traveler4821' then raise exception 'FAIL generated handle'; end if;
 if (select count(distinct lower(handle)) from public.profiles where id in ('d0000000-0000-0000-0000-000000000042','d0000000-0000-0000-0000-000000000043'))<>2 then raise exception 'FAIL unique generated handles'; end if;
 begin update public.profiles set handle='ADMIN' where id='d0000000-0000-0000-0000-000000000042'; raise exception 'FAIL reserved handle accepted'; exception when check_violation then null; end;
 begin update public.profiles set handle='a-' where id='d0000000-0000-0000-0000-000000000042'; raise exception 'FAIL invalid format accepted'; exception when check_violation then null; end;
 update public.profiles set handle='DbTest42' where id='d0000000-0000-0000-0000-000000000042';
 begin update public.profiles set handle='dbtest42' where id='d0000000-0000-0000-0000-000000000043'; raise exception 'FAIL case-insensitive collision accepted'; exception when unique_violation then null; end;
 if has_table_privilege('authenticated','public.profiles','update') or has_table_privilege('anon','public.profiles','update') then raise exception 'FAIL browser handle writes'; end if;
end $$;
do $$ declare n integer; begin
 for n in 1..5 loop if not public.consume_handle_save_attempt('d0000000-0000-0000-0000-000000000042') then raise exception 'FAIL attempt %',n; end if; end loop;
 if public.consume_handle_save_attempt('d0000000-0000-0000-0000-000000000042') then raise exception 'FAIL sixth attempt accepted'; end if;
 if (select count(*) from public.handle_save_attempts where user_id='d0000000-0000-0000-0000-000000000042')<>5 then raise exception 'FAIL denied attempt recorded'; end if;
 update public.handle_save_attempts set attempted_at=clock_timestamp()-interval '15 minutes' where user_id='d0000000-0000-0000-0000-000000000042';
 if not public.consume_handle_save_attempt('d0000000-0000-0000-0000-000000000042') then raise exception 'FAIL expired attempts counted'; end if;
 insert into public.user_roles(user_id,role) values ('d0000000-0000-0000-0000-000000000043','demo');
 if public.consume_handle_save_attempt('d0000000-0000-0000-0000-000000000043') then raise exception 'FAIL demo attempt accepted'; end if;
 if exists(select 1 from public.handle_save_attempts where user_id='d0000000-0000-0000-0000-000000000043') then raise exception 'FAIL demo attempt recorded'; end if;
 if has_table_privilege('anon','public.handle_save_attempts','select') or has_table_privilege('authenticated','public.handle_save_attempts','select') then raise exception 'FAIL attempts exposed'; end if;
end $$;
rollback;
select 'accounts-handles: signup, format, reservation, uniqueness, browser refusal, 5/15-minute quota and demo checks passed; fixtures rolled back' as result;