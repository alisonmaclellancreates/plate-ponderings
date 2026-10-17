create table public.subject_guesses (
  subject_id uuid primary key references public.subjects(id) on delete cascade,
  meaning text not null check (char_length(meaning) between 1 and 80),
  story text not null check (char_length(btrim(story)) > 0),
  created_at timestamptz not null default now()
);
revoke all on public.subject_guesses from public, anon, authenticated;
grant select, insert, delete on public.subject_guesses to service_role;
alter table public.subject_guesses enable row level security;