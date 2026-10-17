# Step 51: Real demo, reproducible seed content, and removal of scaffolding

## Outcome and boundaries
The sample account browses the same live pages as contributors without changing anything. An admin can replace event content with the exact scenario in `docs/seed.md`, then fill missing fictional guesses in bounded batches. Existing live layouts, styling, accessibility, and approved copy stay intact.

Work stays on the current branch. No unrelated fixes, auth-method changes, colour changes, or AGENTS.md edits. Approval authorizes schema/code work, not running the destructive reset against current content or making real AI calls.

## 1. Demo identity and access
- Wire `/demo` into server-side password sign-in using `DEMO_EMAIL` and `DEMO_PASSWORD`. Check demo mode first, verify the returned account has the demo role and `Traveler4821` handle, and return only the session needed for browser sign-in, never credentials. Use an isolated non-persisting auth client; do not overwrite the service client's session. Missing configuration or invalid sample identity fails safely.
- Preserve the demo introduction; Start the Demo enters live browsing. Remove `/demo-form` as a static sample, not the real `/demo` entry.
- Use verified account roles for the header. Exit Demo signs out to `/`; failed exit retains the menu and existing error feedback. Ordinary member sign-out behavior stays unchanged.
- Mount the brief's banner once in the shared layout for a signed-in demo account, with its visibility governed by demo mode. Demo mode has no effect on email or sign-in methods.
- Audit server and deployed database refusals for handle saves, account deletion, plate spotting, story submission/deletion, photo detection/upload, hearts/unhearts, reports, blocks/unblocks, dismissals, notification marking, rechecks, and admin writes. Demo refusal occurs before side effects, including photo deletion on a refused story. A caller with both demo and admin roles cannot mutate anything.
- Keep the sample excluded from own-account and admin rechecks; automatic submission viewing never marks its notifications read. Deliver the full refusal matrix in `docs/step51-demo-write-audit.md`, distinguishing RLS denial from absence of browser policies/grants.

## 2. Proposed database changes, awaiting approval
Next migration number is **0019**, following applied 0018. Existing migrations remain untouched. No new public read policy or browser write grant. The full staged proposal appears below and is not applied. Approval must precede the migration tool call.

- Add `app_settings.demo_today date NULL`, without a default or data update. It changes nothing until Alison sets it.
- Add one service-only `effective_today()` function: return `demo_today` only when demo mode is on and that date is set; otherwise return the actual UTC date. All application callers obtain today from this function, rather than duplicating the decision in JavaScript.
- Update the existing picker and featured archive RPCs to use that same effective day. Preserve the current atomic daily lock, immutable saved picks, selection criteria, ordering and cursor limits. While frozen, return the saved pick only; if it is absent, return no pick instead of creating one. Archive reads exclude days after the effective day.
- Add service-only relational reset support with a strict typed seed payload. It rechecks demo mode, serializes relational replacement, deletes only the named content tables in dependency order, and inserts the complete seed rows in one transaction. No Auth or Storage schema writes. Any insertion failure rolls back relational replacement.
- Harden story/subject attempt-consumption functions to refuse demo users before inserting an attempt, matching existing handle/photo protection. Confirm current grants and policies first; the historical Storage policies were removed by migration 0002, so do not restore them.
- Every new function has a fixed search path, revoked PUBLIC/anon/authenticated execution and explicit service-role execution. Existing RLS stays enabled. Validate against existing rows and test effective-day/frozen-picker behavior and service-only access in rollback transactions.

## 3. Exact seed scenario and reset safety
- Use `docs/seed.md` as the literal seed source, not existing fixtures: 16 plates (15 published, 1 pending), 15 published stories plus the sample's one pending and one rejected story, all 9 summary versions, prescribed hearts, five featured dates, one report, and two unread sample notifications. Use the document literally: RAINY7Q 3, EH2ZED 4, MAPLE9X 1, 2FOG4ME 2, YEEHA7Z 3, BRKFST4U 2 published stories; summary versions 2, 3, 1, 1, 1, 1 respectively. Never add or invent content to match a count. Preserve exact story text and source claims; do not run seed stories through AI or apply contributor-form framing to rewrite them.
- Keep admin accounts, the configured sample account, and all app settings. Recreate the ten other seed accounts through the server with random passwords never logged, displayed, or saved in readable files. Remove other non-admin accounts through the Auth admin API, never direct SQL against managed Auth tables.
- Clear only subjects, stories, story photos, summaries, hearts, reports, blocks, notifications, featured days, subject guesses, and summary runs. Account profile/role removal happens only as part of deleting accounts. Jurisdictions, rate-limit attempt tables and all other unnamed tables stay untouched.
- Hide Reset seed data and Fill missing guesses while demo mode is off; every server entry verifies non-demo admin access and rechecks the mode before any destructive step. If demo_today is empty, refuse with “Set the demo date before resetting seed data.” before deleting anything. Validate secrets, sample identity and bundled media before deletion.
- Reset requires a first destructive confirmation and a second dialog where the admin types exactly `RESET`. Cancel never calls the reset function.
- Auth, Storage and database changes cannot share one transaction. Make the sequence retryable and fail at the first error with a clear incomplete-reset result, never claim cross-service rollback or success until counts/storage read back correctly. Repeating a successful reset leaves the same dataset and exactly five photos; serialize concurrent reset requests with a service-only operational lease rather than in-memory state. The proposed lease expires after 15 minutes, is renewed before each destructive batch while confirming the same demo date, and is released by its token. A lost lease stops further work; resetting never clears this operational table.
- Seed dates are offset from configured demo_today, preserving Pacific-time story/summary timestamps and the four previous featured days. The sample's credentials, identity and existing account are not replaced.

## 4. Seed photos and guesses
- **First change completed:** moved the five originals to `docs/seed-photos/` and deleted their five measuring copies. All originals are 1600 × 1200.
- Add a build-time processing script that reuses the existing canvas recipe: downscale by 24 and smooth back up outside the sharp plate box, seed-only JPEG quality **0.85** and longest side **≤1200 px**. The contributor photo pipeline stays unchanged. Report each processed JPEG’s byte size and their total; treat 1 MB as 1,000,000 bytes. If the total exceeds **1 MB**, stop and tell Alison before bundling. Preserve the five exact fractional boxes from the seed document. Processing does not use detection or real AI.
- Commit processed JPEGs beside server code and bundle their bytes server-only. Originals stay exclusively in the source-photo directory; never serve/upload them. Image processing runs before deployment/runtime, never during Reset.
- Reset uploads processed JPEGs into each seed author's UUID folder with a fresh UUID `.jpg` basename, then saves the path and box on the associated published story.
- Fill missing guesses awaits up to five existing `requestPlateGuess` calls sequentially, checks the shared pause before each, preserves saved guesses, leaves failures missing, and reports the remaining count. It does not dispatch unbounded after-response work.

## 5. Remove preview scaffolding last, without removing live behavior
Complete demo sign-in/refusals first, then the frozen date, then reset and exact seed content with their tests. Only after those paths are implemented and their related tests pass, remove preview scaffolding.
- Move domain types and genuine shared copy/helpers out of `mock-data.ts` before deletion. Keep `featuredProgress` in `featured.ts`; delete `previewFeatured` and fixture adaptation, eliminating the cycle.
- Remove all preview-only routes and sample aliases, including `/previews`, component galleries, home variants, static story menus/outcomes, fixture-backed plate aliases and fallback story steps. Keep valid live public/protected routes and real-condition success, pending, rejected and error states.
- Remove fixture defaults and sample-only branches in shared live components, then delete `src/lib/mock-data.ts` and `public/mock/`. Search all source imports and links before deleting their targets. Do not change generated routing or generated preview-host authentication files.
- Delete tests belonging solely to removed preview surfaces. Migrate retained live tests to explicit test-owned fixtures and real DTOs, preserving behavioral/accessibility coverage. No production sample rows remain.
- Inspect retained content-route metadata, including index, preserving unique app-specific titles and descriptions.

## 6. Analytics and verification
- Register `demo_started`, `demo_exited`, and `demo_write_refused` with only `action` for the refusal event. Emit start/exit only after successful transitions, and refusals only for an actual verified refusal. Automatic skipped rechecks/read marking are not user write attempts. Preserve the never-send filter and test credentials/content are excluded.
- Tests cover each demo boundary, frozen/off/unset dates, reset empty-date refusal before any deletion, off-mode/non-admin/dual-role refusal, confirmation cancellation, unrelated content removal, preserved admins/settings/sample identity, exact seed counts and histories, photo boxes/paths, repeated reset, partial failures/retry, concurrent reset coordination and capped sequential guess fill with mocked AI.
- Run `bunx vitest related --run` on every changed source file and changed test file, then `bun run lint`; fix errors in changed files. No local full suite, coverage, typecheck, build, live browser or real-AI checks.
- After approved migrations, rerun the existing database tests (including step 41 visibility checks) and new demo/reset tests through the database tool inside rollbacks; verify no fixtures remain.
- Report only executed checks, at most 10 lines, with the audit document and any credential/setup blockers. CI and actual PR Codecov remain authoritative; managed Git sync owns commits, with no branch changes or manual Git mutations.

## Alison's setup after implementation
Approve the proposed migration; create/identify the sample account, set its handle and demo role, set `DEMO_EMAIL` and `DEMO_PASSWORD`, retain/create the admin account, set demo_today to **2026-10-17** and enable demo mode. After recording the real-account walkthrough, explicitly run Reset seed data, then click Fill missing guesses until zero remain. Live reset and real AI results remain Alison's verification unless separately requested.

## Full proposed 0019 SQL (not applied)

Source: `docs/proposed-migrations/0019_step51_demo_seed.sql`. The lease is operational coordination, not seed content; no existing settings values, Auth rows or Storage objects are changed by applying this migration.

```sql
-- Proposed 0019: Step 51. Not applied. No settings values are changed.
alter table public.app_settings add column demo_today date;

create function public.effective_today()
returns date language sql stable security definer
set search_path = public, pg_temp as $$
  select coalesce(
    (select case when s.demo_mode then s.demo_today end
     from public.app_settings s where s.id = true),
    (current_timestamp at time zone 'UTC')::date
  );
$$;
revoke all on function public.effective_today() from public, anon, authenticated;
grant execute on function public.effective_today() to service_role;

create or replace function public.pick_featured_subject_for_today()
returns table(day date, subject_id uuid, stories_at_pick integer)
language plpgsql security definer set search_path = public, pg_temp as $$
declare today date := public.effective_today(); picked uuid; picked_count integer; frozen boolean;

begin
  perform pg_advisory_xact_lock(46, today - date '2000-01-01');
  select coalesce(s.demo_mode and s.demo_today is not null, false) into frozen
  from public.app_settings s where s.id = true;
  if not coalesce(frozen, false) and not exists (select 1 from public.featured_days f where f.day = today) then
    select s.id, count(st.id)::integer into picked, picked_count
    from public.subjects s
    left join public.stories st on st.subject_id = s.id and st.status = 'published'
    where s.status = 'published' and not exists (
      select 1 from public.featured_days f where f.subject_id = s.id
        and f.day >= today - 30 and f.day < today)
    group by s.id
    order by count(st.id) asc, random()
    limit 1;
    if picked is not null then
      insert into public.featured_days(day, subject_id, stories_at_pick)
      values(today, picked, picked_count) on conflict on constraint featured_days_pkey do nothing;
    end if;
  end if;
  return query select f.day, f.subject_id, f.stories_at_pick from public.featured_days f where f.day = today;
end $$;
revoke all on function public.pick_featured_subject_for_today() from public, anon, authenticated;
grant execute on function public.pick_featured_subject_for_today() to service_role;

create or replace function public.get_featured_subject_days(_before date default null, _limit integer default 12)
returns table(day date, subject_id uuid, stories_at_pick integer, jurisdiction text, plate_text text, story_count integer, has_owner_story boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select f.day, f.subject_id, f.stories_at_pick, j.name, s.identity_b,
    count(st.id)::integer, coalesce(bool_or(st.source = 'owner'), false)
  from public.featured_days f
  join public.subjects s on s.id = f.subject_id and s.status = 'published'
  join public.jurisdictions j on j.code = s.identity_a
  left join public.stories st on st.subject_id = s.id and st.status = 'published'
  where f.day <= public.effective_today()
    and (_before is null or f.day < _before)
  group by f.day, f.subject_id, f.stories_at_pick, j.name, s.identity_b
  order by f.day desc
  limit least(greatest(coalesce(_limit,12),1),13)
$$;
revoke all on function public.get_featured_subject_days(date, integer) from public, anon, authenticated;
grant execute on function public.get_featured_subject_days(date, integer) to service_role;

-- Coordination only. Reset does not delete this operational table.
create table public.demo_reset_lease (
  id boolean primary key default true check (id = true),
  token uuid not null,
  expires_at timestamptz not null
);
grant all on public.demo_reset_lease to service_role;
revoke all on public.demo_reset_lease from public, anon, authenticated;
alter table public.demo_reset_lease enable row level security;
-- No browser policies. No time-dependent CHECK constraint.

create function public.claim_demo_reset(_token uuid)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
declare claimed boolean;
begin
  if not exists (select 1 from public.app_settings where id = true and demo_mode) then
    raise exception 'Reset seed data is available only while demo mode is on.';
  end if;
  if not exists (select 1 from public.app_settings where id = true and demo_today is not null) then
    raise exception 'Set the demo date before resetting seed data.';
  end if;
  insert into public.demo_reset_lease as lease (id, token, expires_at)
  values (true, _token, clock_timestamp() + interval '15 minutes')
  on conflict (id) do update set token = excluded.token, expires_at = excluded.expires_at
    where lease.expires_at <= clock_timestamp()
  returning true into claimed;
  return coalesce(claimed, false);
end $$;
revoke all on function public.claim_demo_reset(uuid) from public, anon, authenticated;
grant execute on function public.claim_demo_reset(uuid) to service_role;

create function public.renew_demo_reset(_token uuid, _day date)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
declare renewed boolean;
begin
  if not exists (select 1 from public.app_settings
                 where id = true and demo_mode and demo_today = _day) then
    raise exception 'Demo mode and its date must remain set while resetting seed data.';
  end if;
  update public.demo_reset_lease
  set expires_at = clock_timestamp() + interval '15 minutes'
  where id = true and token = _token and expires_at > clock_timestamp()
  returning true into renewed;
  return coalesce(renewed, false);
end $$;
revoke all on function public.renew_demo_reset(uuid, date) from public, anon, authenticated;
grant execute on function public.renew_demo_reset(uuid, date) to service_role;

create function public.release_demo_reset(_token uuid)
returns void language sql security definer
set search_path = public, pg_temp as $$
  delete from public.demo_reset_lease where id = true and token = _token;
$$;
revoke all on function public.release_demo_reset(uuid) from public, anon, authenticated;
grant execute on function public.release_demo_reset(uuid) to service_role;

-- Payload is constructed by server-only seed code, never supplied by the browser.
-- Server verifies caller is admin and not demo before privileged access.
create function public.replace_demo_seed_content(_token uuid, _day date, _seed jsonb)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if not public.renew_demo_reset(_token, _day) then
    raise exception 'The reset lock expired. Please retry Reset seed data.';
  end if;
  -- Serialize with the daily picker during relational replacement.
  perform pg_advisory_xact_lock(46, _day - date '2000-01-01');
  if jsonb_typeof(_seed) is distinct from 'object' then
    raise exception 'Invalid seed payload.';
  end if;
  if jsonb_typeof(_seed -> 'subjects') is distinct from 'array' or
     jsonb_array_length(_seed -> 'subjects') <> 16 then
    raise exception 'Invalid seed subjects count.';
  end if;
  if jsonb_typeof(_seed -> 'stories') is distinct from 'array' or
     jsonb_array_length(_seed -> 'stories') <> 17 then
    raise exception 'Invalid seed stories count.';
  end if;
  if jsonb_typeof(_seed -> 'summaries') is distinct from 'array' or
     jsonb_array_length(_seed -> 'summaries') <> 9 then
    raise exception 'Invalid seed summaries count.';
  end if;
  if jsonb_typeof(_seed -> 'featured_days') is distinct from 'array' or
     jsonb_array_length(_seed -> 'featured_days') <> 5 then
    raise exception 'Invalid seed featured_days count.';
  end if;
  if jsonb_typeof(_seed -> 'notifications') is distinct from 'array' or
     jsonb_array_length(_seed -> 'notifications') <> 2 then
    raise exception 'Invalid seed notifications count.';
  end if;
  if jsonb_typeof(_seed -> 'reports') is distinct from 'array' or
     jsonb_array_length(_seed -> 'reports') <> 1 then
    raise exception 'Invalid seed reports count.';
  end if;
  if jsonb_typeof(_seed -> 'hearts') is distinct from 'array' then
    raise exception 'Invalid seed hearts.';
  end if;
  if (select count(*) from jsonb_array_elements(_seed -> 'stories') r
      where r ->> 'status' = 'published') <> 15 or
     (select count(*) from jsonb_array_elements(_seed -> 'stories') r
      where r ->> 'status' = 'pending') <> 1 or
     (select count(*) from jsonb_array_elements(_seed -> 'stories') r
      where r ->> 'status' = 'rejected') <> 1 or
     (select count(*) from jsonb_array_elements(_seed -> 'stories') r
      where r ->> 'photo_path' is not null) <> 5 then
    raise exception 'Invalid seed story states or photos.';
  end if;
  delete from public.featured_days;
  delete from public.notifications;
  delete from public.reports;
  delete from public.hearts;
  delete from public.blocks;
  delete from public.subject_guesses;
  delete from public.summary_runs;
  delete from public.summaries;
  delete from public.stories;
  delete from public.subjects;
  insert into public.subjects (id, identity_a, identity_b, normalized_key, image_path, status, created_by, created_at, published_at)
  select id, identity_a, identity_b, normalized_key, image_path, status, created_by, created_at, published_at from jsonb_populate_recordset(null::public.subjects, _seed -> 'subjects');
  insert into public.stories (id, subject_id, author_id, meaning, source, body, photo_path, status, created_at, published_at, removed_at, photo_box)
  select id, subject_id, author_id, meaning, source, body, photo_path, status, created_at, published_at, removed_at, photo_box from jsonb_populate_recordset(null::public.stories, _seed -> 'stories');
  insert into public.summaries (id, subject_id, version, text, disagreement_score, story_count, started_at, generated_at)
  select id, subject_id, version, text, disagreement_score, story_count, started_at, generated_at from jsonb_populate_recordset(null::public.summaries, _seed -> 'summaries');
  insert into public.hearts (story_id, user_id, created_at)
  select story_id, user_id, created_at from jsonb_populate_recordset(null::public.hearts, _seed -> 'hearts');
  insert into public.featured_days (day, subject_id, stories_at_pick)
  select day, subject_id, stories_at_pick from jsonb_populate_recordset(null::public.featured_days, _seed -> 'featured_days');
  insert into public.notifications (id, user_id, kind, subject_id, story_id, created_at, read_at)
  select id, user_id, kind, subject_id, story_id, created_at, read_at from jsonb_populate_recordset(null::public.notifications, _seed -> 'notifications');
  insert into public.reports (id, story_id, reporter_id, reason, note, created_at)
  select id, story_id, reporter_id, reason, note, created_at from jsonb_populate_recordset(null::public.reports, _seed -> 'reports');
  if not exists (select 1 from public.featured_days where day = _day) then
    raise exception 'The seed must include Plate of the Day for the demo date.';
  end if;
end $$;
revoke all on function public.replace_demo_seed_content(uuid, date, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_demo_seed_content(uuid, date, jsonb)
  to service_role;

create or replace function public.consume_subject_save_attempt(_user_id uuid)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if public.has_role(_user_id, 'demo') then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(_user_id::text, 43));
  if (select count(*) from public.subject_save_attempts
      where user_id = _user_id and attempted_at > clock_timestamp() - interval '15 minutes') >= 5 then
    return false;
  end if;
  insert into public.subject_save_attempts (user_id, attempted_at)
  values (_user_id, clock_timestamp());
  return true;
end $$;
revoke all on function public.consume_subject_save_attempt(uuid) from public, anon, authenticated;
grant execute on function public.consume_subject_save_attempt(uuid) to service_role;

create or replace function public.consume_story_save_attempt(_user_id uuid)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if public.has_role(_user_id, 'demo') then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(_user_id::text, 44));
  if (select count(*) from public.story_save_attempts
      where user_id = _user_id and attempted_at > clock_timestamp() - interval '15 minutes') >= 5 then
    return false;
  end if;
  insert into public.story_save_attempts (user_id, attempted_at)
  values (_user_id, clock_timestamp());
  return true;
end $$;
revoke all on function public.consume_story_save_attempt(uuid) from public, anon, authenticated;
grant execute on function public.consume_story_save_attempt(uuid) to service_role;

```
