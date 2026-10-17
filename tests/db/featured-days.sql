-- Step 46: privileged rollback-only daily selection and archive tests.
begin;
-- Isolate the pool without committing changes to any existing row.
update public.subjects set status = 'pending' where status = 'published';
delete from public.featured_days where day >= (current_timestamp at time zone 'UTC')::date - 40;
insert into public.subjects(id,identity_a,identity_b,normalized_key,status) values
('d0000000-0000-0000-0000-000000000046','US-WA','FEATZERO','US-WA|FEATZERO','published'),
('d0000000-0000-0000-0000-000000000047','US-WA','FEATONE','US-WA|FEATONE','published'),
('d0000000-0000-0000-0000-000000000048','US-WA','FEATTWO','US-WA|FEATTWO','published');
insert into public.stories(subject_id,meaning,source,status,published_at) values
('d0000000-0000-0000-0000-000000000046','Pending is not published','owner','pending',null),
('d0000000-0000-0000-0000-000000000047','One published story','guess','published',now()),
('d0000000-0000-0000-0000-000000000048','First published story','guess','published',now()),
('d0000000-0000-0000-0000-000000000048','Second published story','owner','published',now());
do $$ declare a record; b record; today date := (current_timestamp at time zone 'UTC')::date; r text; fn text;
begin
 select * into a from public.pick_featured_subject_for_today();
 if a.subject_id <> 'd0000000-0000-0000-0000-000000000046' or a.stories_at_pick <> 0 or a.day <> today then raise exception 'FAIL: UTC mystery priority'; end if;
 insert into public.stories(subject_id,meaning,source,status,published_at) values(a.subject_id,'Now published','owner','published',now());
 select * into b from public.pick_featured_subject_for_today();
 if b is distinct from a or (select count(*) from public.featured_days where day=today) <> 1 then raise exception 'FAIL: stable winner and immutable count'; end if;
 if not exists(select 1 from public.get_featured_subject_days() where day=today and story_count=1 and stories_at_pick=0 and has_owner_story) then raise exception 'FAIL: current count and owner'; end if;
 delete from public.featured_days where day=today;
 -- The minimum pool contains two one-story candidates; never assert a random tied identity.
 select * into a from public.pick_featured_subject_for_today();
 if a.stories_at_pick <> 1 or a.subject_id='d0000000-0000-0000-0000-000000000048' then raise exception 'FAIL: fewest-story fallback'; end if;
 delete from public.featured_days where day=today;
 insert into public.featured_days(day,subject_id,stories_at_pick) values(today-30,'d0000000-0000-0000-0000-000000000046',0),(today-1,'d0000000-0000-0000-0000-000000000047',1);
 select * into a from public.pick_featured_subject_for_today();
 if a.subject_id <> 'd0000000-0000-0000-0000-000000000048' or a.stories_at_pick <> 2 then raise exception 'FAIL: inclusive 30-day exclusion'; end if;
 delete from public.featured_days where day=today;
 update public.featured_days set day=today-31 where day=today-30;
 select * into a from public.pick_featured_subject_for_today();
 if a.subject_id <> 'd0000000-0000-0000-0000-000000000046' then raise exception 'FAIL: eligible after 30 preceding dates'; end if;
 delete from public.featured_days where day=today;
 update public.subjects set status='pending' where id in ('d0000000-0000-0000-0000-000000000046','d0000000-0000-0000-0000-000000000047','d0000000-0000-0000-0000-000000000048');
 if exists(select 1 from public.pick_featured_subject_for_today()) or exists(select 1 from public.featured_days where day=today) then raise exception 'FAIL: empty pool'; end if;
 update public.subjects set status='published' where id='d0000000-0000-0000-0000-000000000046';
 -- Two eligible mysteries: any member is valid; unpublished stories never count.
 update public.stories set status='hidden' where subject_id='d0000000-0000-0000-0000-000000000046' and status='published';
 update public.subjects set status='published' where id='d0000000-0000-0000-0000-000000000047';
 update public.stories set status='rejected' where subject_id='d0000000-0000-0000-0000-000000000047';
 delete from public.featured_days where day=today-1;
 select * into a from public.pick_featured_subject_for_today();
 if a.subject_id not in ('d0000000-0000-0000-0000-000000000046','d0000000-0000-0000-0000-000000000047') or a.stories_at_pick<>0 then raise exception 'FAIL: mystery pool'; end if;
 delete from public.featured_days where day>=today-40;
 insert into public.featured_days(day,subject_id,stories_at_pick) select today-i,'d0000000-0000-0000-0000-000000000046',0 from generate_series(-1,14) i;
 if (select count(*) from public.get_featured_subject_days(null,100))<>13 or (select count(*) from public.get_featured_subject_days(null,0))<>1 or (select count(*) from public.get_featured_subject_days(null,null))<>12 then raise exception 'FAIL: bounded archive'; end if;
 if (select array_agg(day) from public.get_featured_subject_days(null,3))<>array[today,today-1,today-2] then raise exception 'FAIL: newest first and no future'; end if;
 if (select max(day) from public.get_featured_subject_days(today-2,12))<>today-3 then raise exception 'FAIL: strict date cursor'; end if;
 if exists(select 1 from public.get_featured_subject_days() where story_count<>0 or has_owner_story) then raise exception 'FAIL: hidden/pending owner excluded'; end if;
 update public.subjects set status='pending' where id='d0000000-0000-0000-0000-000000000046';
 if exists(select 1 from public.get_featured_subject_days()) then raise exception 'FAIL: unpublished archive rows'; end if;
 foreach fn in array array['public.pick_featured_subject_for_today()','public.get_featured_subject_days(date,integer)','public.get_visible_summary_versions(uuid)'] loop
  foreach r in array array['anon','authenticated'] loop
   if has_function_privilege(r,fn,'execute') then raise exception 'FAIL: browser execute % %',r,fn; end if;
  end loop;
  if not has_function_privilege('service_role',fn,'execute') then raise exception 'FAIL: service execute %',fn; end if;
 end loop;
 foreach r in array array['anon','authenticated'] loop
  if has_table_privilege(r,'public.featured_days','select,insert,update,delete') then raise exception 'FAIL: browser featured access'; end if;
 end loop;
end $$;
rollback;
select 'featured-days: all assertions passed (two-session concurrency not exercised)' as result;