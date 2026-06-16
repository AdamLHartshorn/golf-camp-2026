-- Golf Camp 2026 Parimutuel resolution and settlement support.
-- Run in Supabase SQL Editor after the base Parimutuel schema files.

create table if not exists public.evening_parimutuel_results (
  id uuid primary key default gen_random_uuid(),
  parimutuel_market_id uuid not null references public.evening_parimutuel_markets(id) on delete cascade,
  betting_night text null,
  money_round_day text null,
  market text not null,
  winning_selections jsonb not null default '[]'::jsonb,
  resolved_at timestamptz default now(),
  resolved_by_player_id uuid null references public.players(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists evening_parimutuel_results_market_result_idx
on public.evening_parimutuel_results (parimutuel_market_id, market);

create index if not exists evening_parimutuel_results_night_idx
on public.evening_parimutuel_results (betting_night, money_round_day);

create index if not exists evening_parimutuel_results_market_idx
on public.evening_parimutuel_results (market);

alter table public.evening_parimutuel_results enable row level security;

drop policy if exists "Public evening_parimutuel_results select" on public.evening_parimutuel_results;
create policy "Public evening_parimutuel_results select"
on public.evening_parimutuel_results for select
using (true);

drop policy if exists "Public evening_parimutuel_results insert" on public.evening_parimutuel_results;
create policy "Public evening_parimutuel_results insert"
on public.evening_parimutuel_results for insert
with check (true);

drop policy if exists "Public evening_parimutuel_results update" on public.evening_parimutuel_results;
create policy "Public evening_parimutuel_results update"
on public.evening_parimutuel_results for update
using (true)
with check (true);

drop policy if exists "Public evening_parimutuel_results delete" on public.evening_parimutuel_results;
create policy "Public evening_parimutuel_results delete"
on public.evening_parimutuel_results for delete
using (true);
