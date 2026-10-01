create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info' check (level in ('info', 'warning', 'error', 'success')),
  message text not null,
  source text,
  actor_email text,
  created_at timestamptz not null default now()
);

alter table public.system_logs enable row level security;

create policy "Authenticated users can read system logs"
  on public.system_logs for select to authenticated using (true);

create policy "Authenticated users can write system logs"
  on public.system_logs for insert to authenticated with check (true);
