alter table public.badge_settings
  add column if not exists app_logo_url text,
  add column if not exists header_ribbon_url text,
  add column if not exists badge_background_url text;
