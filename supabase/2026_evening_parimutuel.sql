-- Golf Camp 2026 Evening Parimutuel.
-- Run in Supabase SQL Editor before using Evening Parimutuel betting.

create table if not exists public.evening_parimutuel_bets (
  id uuid primary key default gen_random_uuid(),
  betting_night text not null,
  money_round_day text not null,
  market text not null,
  selection text not null,
  amount numeric(10, 2) not null,
  bettor_player_id uuid not null references public.players(id) on delete cascade,
  bettor_name text not null,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'evening_parimutuel_bets_amount_check'
  ) then
    alter table public.evening_parimutuel_bets
    add constraint evening_parimutuel_bets_amount_check
    check (amount > 0 and amount <= 20);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'evening_parimutuel_bets_status_check'
  ) then
    alter table public.evening_parimutuel_bets
    add constraint evening_parimutuel_bets_status_check
    check (status in ('active', 'void'));
  end if;
end $$;

create or replace function public.enforce_evening_parimutuel_market_limit()
returns trigger
language plpgsql
as $$
declare
  existing_total numeric(10, 2);
begin
  select coalesce(sum(amount), 0)
  into existing_total
  from public.evening_parimutuel_bets
  where bettor_player_id = new.bettor_player_id
    and betting_night = new.betting_night
    and market = new.market
    and status = 'active'
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if existing_total + new.amount > 20 then
    raise exception 'Players may only bet $20 per market per night.';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists evening_parimutuel_market_limit_trigger on public.evening_parimutuel_bets;
create trigger evening_parimutuel_market_limit_trigger
before insert or update on public.evening_parimutuel_bets
for each row
execute function public.enforce_evening_parimutuel_market_limit();

create index if not exists evening_parimutuel_bets_night_market_idx
on public.evening_parimutuel_bets (betting_night, market, status);

create index if not exists evening_parimutuel_bets_bettor_idx
on public.evening_parimutuel_bets (bettor_player_id, betting_night, market);

alter table public.evening_parimutuel_bets enable row level security;

drop policy if exists "Public evening_parimutuel_bets select" on public.evening_parimutuel_bets;
create policy "Public evening_parimutuel_bets select"
on public.evening_parimutuel_bets for select
using (true);

drop policy if exists "Public evening_parimutuel_bets insert" on public.evening_parimutuel_bets;
create policy "Public evening_parimutuel_bets insert"
on public.evening_parimutuel_bets for insert
with check (true);

drop policy if exists "Public evening_parimutuel_bets update" on public.evening_parimutuel_bets;
create policy "Public evening_parimutuel_bets update"
on public.evening_parimutuel_bets for update
using (true)
with check (true);

drop policy if exists "Public evening_parimutuel_bets delete" on public.evening_parimutuel_bets;
create policy "Public evening_parimutuel_bets delete"
on public.evening_parimutuel_bets for delete
using (true);
