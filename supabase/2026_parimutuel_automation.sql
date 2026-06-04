-- Golf Camp 2026 Draft -> Money Round -> Parimutuel automation support.
-- Run in Supabase SQL Editor after the base Evening Parimutuel schema.

create table if not exists public.evening_parimutuel_markets (
  id uuid primary key default gen_random_uuid(),
  draft_session_id uuid not null references public.draft_sessions(id) on delete cascade,
  money_round_id uuid null references public.money_rounds(id) on delete set null,
  betting_night text null,
  money_round_day text null,
  status text not null default 'pending',
  tee_time timestamptz null,
  opened_at timestamptz null,
  locked_at timestamptz null,
  reset_at timestamptz null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evening_parimutuel_markets_status_check'
  ) then
    alter table public.evening_parimutuel_markets
    add constraint evening_parimutuel_markets_status_check
    check (status in ('pending', 'open', 'locked', 'settled', 'void'));
  end if;
end $$;

create unique index if not exists evening_parimutuel_markets_draft_session_idx
on public.evening_parimutuel_markets (draft_session_id);

create index if not exists evening_parimutuel_markets_money_round_idx
on public.evening_parimutuel_markets (money_round_id);

create index if not exists evening_parimutuel_markets_status_idx
on public.evening_parimutuel_markets (status, created_at desc);

alter table public.evening_parimutuel_bets
add column if not exists parimutuel_market_id uuid null references public.evening_parimutuel_markets(id) on delete cascade;

alter table public.evening_parimutuel_bets
add column if not exists draft_session_id uuid null references public.draft_sessions(id) on delete set null;

alter table public.evening_parimutuel_bets
add column if not exists money_round_id uuid null references public.money_rounds(id) on delete set null;

create index if not exists evening_parimutuel_bets_market_idx
on public.evening_parimutuel_bets (parimutuel_market_id, status);

create index if not exists evening_parimutuel_bets_draft_session_idx
on public.evening_parimutuel_bets (draft_session_id, status);

create index if not exists evening_parimutuel_bets_money_round_idx
on public.evening_parimutuel_bets (money_round_id, status);

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
    and market = new.market
    and status = 'active'
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and (
      (
        new.parimutuel_market_id is not null
        and parimutuel_market_id = new.parimutuel_market_id
      )
      or (
        new.parimutuel_market_id is null
        and parimutuel_market_id is null
        and betting_night = new.betting_night
      )
    );

  if existing_total + new.amount > 20 then
    raise exception 'Players may only bet $20 per market per night.';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

alter table public.evening_parimutuel_markets enable row level security;

drop policy if exists "Public evening_parimutuel_markets select" on public.evening_parimutuel_markets;
create policy "Public evening_parimutuel_markets select"
on public.evening_parimutuel_markets for select
using (true);

drop policy if exists "Public evening_parimutuel_markets insert" on public.evening_parimutuel_markets;
create policy "Public evening_parimutuel_markets insert"
on public.evening_parimutuel_markets for insert
with check (true);

drop policy if exists "Public evening_parimutuel_markets update" on public.evening_parimutuel_markets;
create policy "Public evening_parimutuel_markets update"
on public.evening_parimutuel_markets for update
using (true)
with check (true);

drop policy if exists "Public evening_parimutuel_markets delete" on public.evening_parimutuel_markets;
create policy "Public evening_parimutuel_markets delete"
on public.evening_parimutuel_markets for delete
using (true);
