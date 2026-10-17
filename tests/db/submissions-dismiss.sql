-- Step 47: dismissing a rejected item removes its notifications by cascade; browser cannot delete. Privileged database tool, rollback only.
begin;
insert into public.subjects (id,identity_a,identity_b,normalized_key,status,created_by)
values ('d0000000-0000-0000-0000-000000000047','US-WA','DISMISS','US-WA|DISMISS','rejected','d0000000-0000-0000-0000-0000000004a7'),
       ('d0000000-0000-0000-0000-000000000048','US-WA','DISMPUB','US-WA|DISMPUB','published','d0000000-0000-0000-0000-0000000004a7');
insert into public.stories (id,subject_id,author_id,meaning,source,status)
values ('d0000000-0000-0000-0000-000000000049','d0000000-0000-0000-0000-000000000048','d0000000-0000-0000-0000-0000000004a7','A rejected test story','guess','rejected');
insert into public.notifications (user_id,kind,subject_id) values ('d0000000-0000-0000-0000-0000000004a7','subject_rejected','d0000000-0000-0000-0000-000000000047');
insert into public.notifications (user_id,kind,subject_id,story_id) values ('d0000000-0000-0000-0000-0000000004a7','story_rejected','d0000000-0000-0000-0000-000000000048','d0000000-0000-0000-0000-000000000049');
do $$ declare t text; begin
 foreach t in array array['public.subjects','public.stories','public.notifications'] loop
  if has_table_privilege('authenticated',t,'DELETE') then raise exception 'FAIL: browser delete on %',t; end if;
 end loop;
end $$;
set local role service_role;
delete from public.stories where id='d0000000-0000-0000-0000-000000000049' and status='rejected';
delete from public.subjects where id='d0000000-0000-0000-0000-000000000047' and status='rejected';
reset role;
do $$ begin
 if exists(select 1 from public.notifications where user_id='d0000000-0000-0000-0000-0000000004a7') then raise exception 'FAIL: notifications survived'; end if;
 if not exists(select 1 from public.subjects where id='d0000000-0000-0000-0000-000000000048') then raise exception 'FAIL: published plate removed'; end if;
end $$;
rollback;
select 'submissions-dismiss: all assertions passed' as result;
