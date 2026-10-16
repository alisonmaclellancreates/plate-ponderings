# Step 41: Backend foundation — schema, RLS, derived views

No page changes. One migration creates every table, the role enum, `has_role`, the derived views, the two SECURITY DEFINER functions, all GRANTs and all RLS policies. A private storage bucket for story photos is created separately (buckets cannot be created by migration). Nothing is applied until you approve.

## Data shape

```text
auth.users 1---1 profiles (handle, unique on lower(handle))
auth.users 1---* user_roles (role: admin | demo; browser read-own only)
jurisdictions (reference: 64 rows, code PK e.g. US-WA, CA-ON)
subjects *---1 jurisdictions, status pending|published|rejected
  partial unique index on normalized_key WHERE status IN ('pending','published')
stories *---1 subjects, status pending|published|rejected|hidden|deleted
  published_at set once on first publish; removed_at set on each leave of public view
hearts (story_id, user_id) PK — one per person per story
summaries *---1 subjects, unique(subject_id, version), disagreement_score 0..100
featured_days (day PK, subject_id, stories_at_pick) — never recomputed
notifications *---1 user, kind in 4 values, read_at nullable
reports *---1 stories, one per person per story, reason in 4 keys
blocks (blocker_id, blocked_id) PK
app_settings: single row, demo_mode boolean — no browser access at all
```

## Derived, never stored

- `subject_story_counts` view (security_invoker): published story count per subject.
- `subject_owner` view (security_invoker): earliest published `owner` story per subject; hidden/deleted owner stories drop out automatically.
- `subject_status` view (security_invoker): mystery | interpreted | owner, from the two above.
- `is_summary_public(summary_id)` — SECURITY DEFINER, fixed search_path, returns boolean only. A version is hidden iff any story on the subject has status hidden/deleted, was published_at <= generated_at, and left view after started_at (removed_at > started_at or null). Never-published stories ignored.
- `story_heart_counts(subject_id)` — SECURITY DEFINER, returns story ids + counts for published stories only, never who hearted.

## RLS summary (every table enabled, GRANTs in the same migration)

| Table | Browser read | Browser write |
|---|---|---|
| profiles | own row | none (handle server fn, step 42) |
| user_roles | own row | none |
| jurisdictions | everyone | none |
| subjects | published (all); creator sees own any status | none (server fns) |
| stories | published (all); author sees own pending/rejected | none (server fns) |
| hearts | own rows | insert/delete own, non-demo, published stories only |
| summaries | rows where is_summary_public(id) | none |
| featured_days | no browser grant | none |
| notifications | own | update own (mark read), non-demo |
| reports | admins only | insert own, non-demo |
| blocks | own (blocker) | insert/delete own, non-demo |
| app_settings | no browser grant | none |

Demo refusal lives in the policies (hearts, notifications, reports, blocks check `not has_role(auth.uid(),'demo')`); tables with no browser write policy refuse by absence. No demo-blocking triggers, so step 51 can seed through the server.

## Proposed migration SQL

```sql
create type public.app_role as enum ('admin', 'demo');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null,
  created_at timestamptz not null default now()
);
create unique index profiles_handle_lower_key on public.profiles (lower(handle));

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.jurisdictions (
  code text primary key,
  name text not null,
  country text not null check (country in ('US', 'CA'))
);

insert into public.jurisdictions (code, name, country) values
  ('US-AL','Alabama','US'),('US-AK','Alaska','US'),('US-AZ','Arizona','US'),
  ('US-AR','Arkansas','US'),('US-CA','California','US'),('US-CO','Colorado','US'),
  ('US-CT','Connecticut','US'),('US-DE','Delaware','US'),('US-DC','District of Columbia','US'),
  ('US-FL','Florida','US'),('US-GA','Georgia','US'),('US-HI','Hawaii','US'),
  ('US-ID','Idaho','US'),('US-IL','Illinois','US'),('US-IN','Indiana','US'),
  ('US-IA','Iowa','US'),('US-KS','Kansas','US'),('US-KY','Kentucky','US'),
  ('US-LA','Louisiana','US'),('US-ME','Maine','US'),('US-MD','Maryland','US'),
  ('US-MA','Massachusetts','US'),('US-MI','Michigan','US'),('US-MN','Minnesota','US'),
  ('US-MS','Mississippi','US'),('US-MO','Missouri','US'),('US-MT','Montana','US'),
  ('US-NE','Nebraska','US'),('US-NV','Nevada','US'),('US-NH','New Hampshire','US'),
  ('US-NJ','New Jersey','US'),('US-NM','New Mexico','US'),('US-NY','New York','US'),
  ('US-NC','North Carolina','US'),('US-ND','North Dakota','US'),('US-OH','Ohio','US'),
  ('US-OK','Oklahoma','US'),('US-OR','Oregon','US'),('US-PA','Pennsylvania','US'),
  ('US-RI','Rhode Island','US'),('US-SC','South Carolina','US'),('US-SD','South Dakota','US'),
  ('US-TN','Tennessee','US'),('US-TX','Texas','US'),('US-UT','Utah','US'),
  ('US-VT','Vermont','US'),('US-VA','Virginia','US'),('US-WA','Washington','US'),
  ('US-WV','West Virginia','US'),('US-WI','Wisconsin','US'),('US-WY','Wyoming','US'),
  ('CA-AB','Alberta','CA'),('CA-BC','British Columbia','CA'),('CA-MB','Manitoba','CA'),
  ('CA-NB','New Brunswick','CA'),('CA-NL','Newfoundland and Labrador','CA'),
  ('CA-NT','Northwest Territories','CA'),('CA-NS','Nova Scotia','CA'),('CA-NU','Nunavut','CA'),
  ('CA-ON','Ontario','CA'),('CA-PE','Prince Edward Island','CA'),('CA-QC','Quebec','CA'),
  ('CA-SK','Saskatchewan','CA'),('CA-YT','Yukon','CA');

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  identity_a text not null references public.jurisdictions(code),
  identity_b text not null,
  normalized_key text not null,
  image_path text,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_by uuid,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create unique index subjects_normalized_key_active
  on public.subjects (normalized_key) where status in ('pending','published');

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  author_id uuid,
  meaning text not null,
  source text not null check (source in ('owner','knows_owner','secondhand','guess')),
  body text,
  photo_path text,
  status text not null default 'pending'
    check (status in ('pending','published','rejected','hidden','deleted')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  removed_at timestamptz
);

create table public.hearts (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create table public.summaries (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  version integer not null,
  text text not null,
  disagreement_score integer not null check (disagreement_score between 0 and 100),
  story_count integer not null,
  started_at timestamptz not null,
  generated_at timestamptz not null,
  unique (subject_id, version)
);

create table public.featured_days (
  day date primary key,
  subject_id uuid not null references public.subjects(id),
  stories_at_pick integer not null
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in
    ('subject_published','subject_rejected','story_published','story_rejected')),
  subject_id uuid references public.subjects(id),
  story_id uuid references public.stories(id),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  reporter_id uuid not null,
  reason text not null check (reason in ('spam','personal_info','harassment','other')),
  note text,
  created_at timestamptz not null default now(),
  unique (story_id, reporter_id)
);

create table public.blocks (
  blocker_id uuid not null,
  blocked_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table public.app_settings (
  id boolean primary key default true check (id),
  demo_mode boolean not null default false
);
insert into public.app_settings (demo_mode) values (false);

-- Grants
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
grant select on public.jurisdictions to anon, authenticated;
grant all on public.jurisdictions to service_role;
grant select on public.subjects to anon, authenticated;
grant all on public.subjects to service_role;
grant select on public.stories to anon, authenticated;
grant all on public.stories to service_role;
grant select, insert, delete on public.hearts to authenticated;
grant all on public.hearts to service_role;
grant select on public.summaries to anon, authenticated;
grant all on public.summaries to service_role;
grant all on public.featured_days to service_role;
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;
grant select, insert, delete on public.blocks to authenticated;
grant all on public.blocks to service_role;
grant all on public.app_settings to service_role;

-- RLS
alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (auth.uid() = id);

alter table public.user_roles enable row level security;
create policy "user_roles: read own" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

alter table public.jurisdictions enable row level security;
create policy "jurisdictions: public read" on public.jurisdictions
  for select to anon, authenticated using (true);

alter table public.subjects enable row level security;
create policy "subjects: public read published" on public.subjects
  for select to anon, authenticated using (status = 'published');
create policy "subjects: creator reads own" on public.subjects
  for select to authenticated using (created_by = auth.uid());

alter table public.stories enable row level security;
create policy "stories: public read published" on public.stories
  for select to anon, authenticated using (status = 'published');
create policy "stories: author reads own pending/rejected" on public.stories
  for select to authenticated
  using (author_id = auth.uid() and status in ('pending','rejected'));

alter table public.hearts enable row level security;
create policy "hearts: read own" on public.hearts
  for select to authenticated using (user_id = auth.uid());
create policy "hearts: add own, non-demo, published story" on public.hearts
  for insert to authenticated with check (
    user_id = auth.uid()
    and not public.has_role(auth.uid(), 'demo')
    and exists (select 1 from public.stories s
                where s.id = story_id and s.status = 'published'));
create policy "hearts: remove own, non-demo" on public.hearts
  for delete to authenticated
  using (user_id = auth.uid() and not public.has_role(auth.uid(), 'demo'));

alter table public.summaries enable row level security;
create policy "summaries: read public versions" on public.summaries
  for select to anon, authenticated using (public.is_summary_public(id));

alter table public.featured_days enable row level security;

alter table public.notifications enable row level security;
create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications: mark own read, non-demo" on public.notifications
  for update to authenticated
  using (user_id = auth.uid() and not public.has_role(auth.uid(), 'demo'))
  with check (user_id = auth.uid() and not public.has_role(auth.uid(), 'demo'));

alter table public.reports enable row level security;
create policy "reports: admins read" on public.reports
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "reports: create own, non-demo" on public.reports
  for insert to authenticated with check (
    reporter_id = auth.uid() and not public.has_role(auth.uid(), 'demo'));

alter table public.blocks enable row level security;
create policy "blocks: read own" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "blocks: add own, non-demo" on public.blocks
  for insert to authenticated with check (
    blocker_id = auth.uid() and not public.has_role(auth.uid(), 'demo'));
create policy "blocks: remove own, non-demo" on public.blocks
  for delete to authenticated
  using (blocker_id = auth.uid() and not public.has_role(auth.uid(), 'demo'));

alter table public.app_settings enable row level security;

-- Derived views (security_invoker: reader's permissions apply)
create view public.subject_story_counts with (security_invoker = on) as
  select subject_id, count(*)::integer as story_count
  from public.stories where status = 'published' group by subject_id;

create view public.subject_owner with (security_invoker = on) as
  select distinct on (subject_id) subject_id, id as story_id, author_id, published_at
  from public.stories
  where status = 'published' and source = 'owner'
  order by subject_id, published_at asc;

create view public.subject_status with (security_invoker = on) as
  select s.id as subject_id,
    case when o.story_id is not null then 'owner'
         when coalesce(c.story_count, 0) > 0 then 'interpreted'
         else 'mystery' end as status
  from public.subjects s
  left join public.subject_owner o on o.subject_id = s.id
  left join public.subject_story_counts c on c.subject_id = s.id;

-- Summary visibility: sees hidden/deleted stories, returns only a boolean
create or replace function public.is_summary_public(_summary_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1
    from public.summaries v
    join public.stories st on st.subject_id = v.subject_id
    where v.id = _summary_id
      and st.status in ('hidden','deleted')
      and st.published_at is not null
      and st.published_at <= v.generated_at
      and (st.removed_at is null or st.removed_at > v.started_at))
$$;

-- Heart counts without exposing who hearted
create or replace function public.story_heart_counts(_subject_id uuid)
returns table (story_id uuid, hearts bigint)
language sql stable security definer set search_path = public as $$
  select s.id, count(h.user_id)
  from public.stories s
  left join public.hearts h on h.story_id = s.id
  where s.subject_id = _subject_id and s.status = 'published'
  group by s.id
$$;
```

## After approval

1. Apply the migration, then regenerate `src/integrations/supabase/types.ts`.
2. Create the private `story-photos` storage bucket (separate tool; migrations cannot).
3. Write `tests/db/summary-visibility.sql` — one rerunnable file asserting the visibility rule: one hidden story; two hidden with one restored; a never-published story; a deleted story; a version written after a deletion stays visible; a version started before a hide and finished after stays hidden; one run as a signed-out reader. Seed rows go in through data queries, assertions run against the function.
4. Report the full table/policy list, test and coverage results. Pages keep showing mock data, unchanged.

## Assumptions

- Report reasons stored as keys `spam | personal_info | harassment | other`, matching the four reasons in the existing report dialog.
- `hearts.user_id`, `stories.author_id`, `subjects.created_by`, `notifications.user_id`, `reports.reporter_id`, `blocks.*` are plain UUIDs (no FK to auth.users), per project convention; only `profiles` and `user_roles` reference `auth.users`.
- The jurisdictions INSERT rides in the migration as reference data required by the subjects FK; it is additive and part of the table's definition.
