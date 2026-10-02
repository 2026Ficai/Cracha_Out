-- Identidade visual: execute este arquivo no SQL Editor do Supabase.
-- Ele adiciona os campos de imagem e permite que somente administradores gravem alterações.

alter table public.badge_settings
  add column if not exists app_logo_url text,
  add column if not exists header_ribbon_url text,
  add column if not exists badge_background_url text,
  add column if not exists badge_crest_url text,
  add column if not exists badge_title_art_url text,
  add column if not exists badge_characters_url text;

-- A função usa a tabela de usuários do sistema para validar o perfil administrador.
create or replace function public.is_system_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users
    where id = auth.uid()
      and role = 'administrador'
  );
$$;

grant execute on function public.is_system_admin() to authenticated;
grant select, insert, update on table public.badge_settings to authenticated;

alter table public.badge_settings enable row level security;

drop policy if exists "Authenticated users read badge settings" on public.badge_settings;
drop policy if exists "Administrators insert badge settings" on public.badge_settings;
drop policy if exists "Administrators update badge settings" on public.badge_settings;

create policy "Authenticated users read badge settings"
on public.badge_settings
for select
to authenticated
using (true);

create policy "Administrators insert badge settings"
on public.badge_settings
for insert
to authenticated
with check (public.is_system_admin());

create policy "Administrators update badge settings"
on public.badge_settings
for update
to authenticated
using (public.is_system_admin())
with check (public.is_system_admin());
