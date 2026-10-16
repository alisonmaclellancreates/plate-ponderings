# Step 41 revision: no public table reads, exact grants, storage locked to server

The first migration is already applied, so this is a corrective migration on top of it. All seven feedback points are in; the three approved assumptions and everything else stay as proposed.

## What changes

1. **No public table reads.** The `public read` policies on subjects, stories, summaries and jurisdictions are dropped, and the anon grants on those tables are revoked. Public data will reach pages through server functions that return only the fields a page needs. `creator reads own` and `author reads own pending/rejected` stay. Summaries get an authenticated-only policy gated by `is_summary_public`.
2. **`is_story_published(story_id)`** — SECURITY DEFINER, fixed search_path, boolean only. Used in the hearts insert policy and the reports insert policy (reports on published stories only), since stories are no longer browser-readable.
3. **Exact grants.** `revoke all` on every new table from anon and authenticated first, then only the listed grants. `featured_days` and `app_settings` end with no anon or authenticated grants at all.
4. **notifications**: `grant select, update (read_at)` — column-scoped, not whole-table update.
5. **blocks**: `check (blocker_id <> blocked_id)`.
6. **subject_owner**: `order by subject_id, published_at asc, id asc` — stable on ties.
7. **Storage**: the three story-photos policies on storage.objects are dropped. The bucket has no storage policies, so it is reachable only through server functions and signed links.

## Resulting grant table (after revoke all)

| Table | anon | authenticated |
|---|---|---|
| profiles | — | select |
| user_roles | — | select |
| jurisdictions | — | select |
| subjects | — | select |
| stories | — | select |
| hearts | — | select, insert, delete |
| summaries | — | select |
| featured_days | — | — |
| notifications | — | select, update (read_at) |
| reports | — | select, insert |
| blocks | — | select, insert, delete |
| app_settings | — | — |

## Proposed migration SQL

```sql
-- 1. No public table reads: drop the public read policies.
drop policy "subjects: public read published" on public.subjects;
drop policy "stories: public read published" on public.stories;
drop policy "summaries: read public versions" on public.summaries;
drop policy "jurisdictions: public read" on public.jurisdictions;

-- Summaries: authenticated readers see only versions passing the visibility rule.
create policy "summaries: read visible versions" on public.summaries
  for select to authenticated using (public.is_summary_public(id));

-- 3. Exact grants: revoke everything from browser roles first.
revoke all on public.profiles from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;
revoke all on public.jurisdictions from anon, authenticated;
revoke all on public.subjects from anon, authenticated;
revoke all on public.stories from anon, authenticated;
revoke all on public.hearts from anon, authenticated;
revoke all on public.summaries from anon, authenticated;
revoke all on public.featured_days from anon, authenticated;
revoke all on public.notifications from anon, authenticated;
revoke all on public.reports from anon, authenticated;
revoke all on public.blocks from anon, authenticated;
revoke all on public.app_settings from anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.jurisdictions to authenticated;
grant select on public.subjects to authenticated;
grant select on public.stories to authenticated;
grant select, insert, delete on public.hearts to authenticated;
grant select on public.summaries to authenticated;
grant select, update (read_at) on public.notifications to authenticated;
grant select, insert on public.reports to authenticated;
grant select, insert, delete on public.blocks to authenticated;
-- featured_days and app_settings: no anon or authenticated grants.

-- 2. Published-story check for policies, since stories are not browser-readable.
create or replace function public.is_story_published(_story_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stories where id = _story_id and status = 'published')
$$;

drop policy "hearts: add own, non-demo, published story" on public.hearts;
create policy "hearts: add own, non-demo, published story" on public.hearts
  for insert to authenticated with check (
    user_id = auth.uid()
    and not public.has_role(auth.uid(), 'demo')
    and public.is_story_published(story_id));

drop policy "reports: create own, non-demo" on public.reports;
create policy "reports: create own, non-demo, published story" on public.reports
  for insert to authenticated with check (
    reporter_id = auth.uid()
    and not public.has_role(auth.uid(), 'demo')
    and public.is_story_published(story_id));

-- 5. Never block yourself.
alter table public.blocks add constraint blocks_no_self_block check (blocker_id <> blocked_id);

-- 6. Owner story stable on ties.
create or replace view public.subject_owner with (security_invoker = on) as
  select distinct on (subject_id) subject_id, id as story_id, author_id, published_at
  from public.stories
  where status = 'published' and source = 'owner'
  order by subject_id, published_at asc, id asc;

-- 7. story-photos has no storage policies: server functions and signed links only.
drop policy "story-photos: author uploads own folder" on storage.objects;
drop policy "story-photos: author reads own folder" on storage.objects;
drop policy "story-photos: author deletes own folder" on storage.objects;
```

## Notes

- With anon grants gone, signed-out pages (homepage search, plate pages) will get jurisdictions, plates, stories and summaries through server functions in later steps; those functions decide field-by-field what leaves the server.
- The derived views (`subject_story_counts`, `subject_status`, `subject_owner`) are security-invoker, so they return nothing to browser roles now; server-side readers use them with elevated context.
- After approval: apply, rerun the seven visibility assertions (they exercise `is_summary_public` directly and are unaffected by the policy changes), and confirm the app suite is still green.
