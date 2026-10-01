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

create or replace function public.register_system_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.system_logs (level, message, source, actor_email)
  values (
    case when tg_op = 'DELETE' then 'warning' else 'success' end,
    case tg_op
      when 'INSERT' then 'Registro criado em ' || tg_table_name
      when 'UPDATE' then 'Registro atualizado em ' || tg_table_name
      when 'DELETE' then 'Registro removido de ' || tg_table_name
    end,
    tg_table_name,
    auth.jwt() ->> 'email'
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists system_logs_students on public.students;
create trigger system_logs_students after insert or update or delete on public.students
for each row execute function public.register_system_log();

drop trigger if exists system_logs_schools on public.schools;
create trigger system_logs_schools after insert or update or delete on public.schools
for each row execute function public.register_system_log();

drop trigger if exists system_logs_classes on public.classes;
create trigger system_logs_classes after insert or update or delete on public.classes
for each row execute function public.register_system_log();

drop trigger if exists system_logs_app_users on public.app_users;
create trigger system_logs_app_users after insert or update or delete on public.app_users
for each row execute function public.register_system_log();

drop trigger if exists system_logs_servers on public.servers;
create trigger system_logs_servers after insert or update or delete on public.servers
for each row execute function public.register_system_log();
