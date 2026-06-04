-- Golf Camp year finalization framework.
-- Run in Supabase SQL Editor before using Closing Presentation finalization.

create table if not exists public.camp_years (
  id uuid primary key default gen_random_uuid(),
  year integer not null unique,
  status text not null default 'active',
  finalized_at timestamptz null,
  finalized_by_player_id uuid null references public.players(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'camp_years_status_check'
  ) then
    alter table public.camp_years
    add constraint camp_years_status_check
    check (status in ('active', 'finalized'));
  end if;
end $$;

create index if not exists camp_years_status_idx
on public.camp_years (status, year desc);

insert into public.camp_years (year, status)
values (2026, 'active')
on conflict (year) do nothing;

alter table public.camp_years enable row level security;

drop policy if exists "Public camp_years select" on public.camp_years;
create policy "Public camp_years select"
on public.camp_years for select
using (true);

drop policy if exists "Public camp_years insert" on public.camp_years;
create policy "Public camp_years insert"
on public.camp_years for insert
with check (true);

drop policy if exists "Public camp_years update" on public.camp_years;
create policy "Public camp_years update"
on public.camp_years for update
using (true)
with check (true);

drop policy if exists "Public camp_years delete" on public.camp_years;
create policy "Public camp_years delete"
on public.camp_years for delete
using (true);
