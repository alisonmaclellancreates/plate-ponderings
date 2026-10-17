-- Step 49c: stories.photo_box checks. Run through the privileged database tool.
-- Rollback-only: nothing is kept.
begin;
do $$
declare
  s uuid;
  boxes text[] := array[
    '{-0.1,0.1,0.2,0.2}', '{0.1,-0.1,0.2,0.2}', '{0.1,0.1,0,0.2}', '{0.1,0.1,0.2,0}',
    '{0.9,0.1,0.2,0.2}', '{0.1,0.9,0.2,0.2}', '{0.1,0.1,0.2}', '{0.1,0.1,0.2,0.2,0.1}',
    '{0.1,NULL,0.2,0.2}', '{{0.1,0.1},{0.2,0.2}}'
  ];
  b text;
begin
  select id into s from public.stories where photo_path is null limit 1;
  if s is null then
    raise notice 'no story without a photo to test against; skipping row checks';
    return;
  end if;
  -- A box without a photo is refused.
  begin
    update public.stories set photo_box = '{0.1,0.1,0.2,0.2}' where id = s;
    raise exception 'box without photo should be refused';
  exception when check_violation then null;
  end;
  update public.stories set photo_path = 'test/test.jpg' where id = s;
  foreach b in array boxes loop
    begin
      update public.stories set photo_box = b::real[] where id = s;
      raise exception 'box % should be refused', b;
    exception when check_violation then null;
    end;
  end loop;
  -- Valid boxes, including one touching the right and bottom edges, are accepted.
  update public.stories set photo_box = '{0.37,0.46,0.25,0.12}' where id = s;
  update public.stories set photo_box = '{0.7,0.8333,0.3,0.1667}' where id = s;
  -- Clearing the photo clears the box together.
  update public.stories set photo_path = null, photo_box = null where id = s;
end $$;
rollback;
