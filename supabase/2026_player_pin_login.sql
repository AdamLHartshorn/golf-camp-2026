-- Golf Camp 2026 lightweight player PIN login fields.
-- Run in the Supabase SQL editor before using player PIN login.

alter table public.players
add column if not exists login_name text,
add column if not exists pin_code text,
add column if not exists is_admin boolean not null default false,
add column if not exists last_login_at timestamptz;

create unique index if not exists players_login_name_unique
on public.players (lower(login_name))
where login_name is not null and login_name <> '';

update public.players
set
  login_name = coalesce(login_name, 'adam'),
  is_admin = true,
  updated_at = now()
where lower(first_name) = 'adam'
  and lower(last_name) = 'hartshorn';

update public.players
set
  login_name = coalesce(login_name, 'nick'),
  is_admin = true,
  updated_at = now()
where lower(first_name) = 'nick'
  and lower(last_name) = 'blacklock';

update public.players
set
  login_name = coalesce(login_name, 'cameron'),
  is_admin = true,
  updated_at = now()
where lower(first_name) = 'cameron'
  and lower(last_name) = 'carter';
