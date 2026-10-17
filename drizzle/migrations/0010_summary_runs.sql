create table public.summary_runs (
  subject_id uuid primary key references public.subjects(id) on delete cascade,
  last_started_at timestamptz not null
);
revoke all on public.summary_runs from anon, authenticated;
grant all on public.summary_runs to service_role;
alter table public.summary_runs enable row level security;

create or replace function public.claim_summary_run(_subject_id uuid)
returns boolean language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare claimed boolean;
begin
  insert into public.summary_runs as r (subject_id, last_started_at)
  values (_subject_id, clock_timestamp())
  on conflict (subject_id) do update set last_started_at = clock_timestamp()
    where r.last_started_at <= clock_timestamp() - interval '1 minute'
  returning true into claimed;
  return coalesce(claimed, false);
end $$;
revoke all on function public.claim_summary_run(uuid) from public, anon, authenticated;
grant execute on function public.claim_summary_run(uuid) to service_role;