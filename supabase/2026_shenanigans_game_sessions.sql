-- Golf Camp 2026 Shenanigans game sessions.
-- Run in Supabase SQL Editor before using Shenanigans sessions.

create table if not exists public.shenanigans_games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  created_by_player_id uuid null references public.players(id) on delete set null,
  created_at timestamptz default now(),
  ended_at timestamptz null
);

create table if not exists public.shenanigans_game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.shenanigans_games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  player_name text not null,
  starting_points integer not null default 5,
  created_at timestamptz default now(),
  unique (game_id, player_id)
);

alter table public.shenanigans_events
add column if not exists game_id uuid null references public.shenanigans_games(id) on delete cascade;

alter table public.shenanigans_wagers
add column if not exists game_id uuid null references public.shenanigans_games(id) on delete cascade;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shenanigans_games_status_check'
  ) then
    alter table public.shenanigans_games
    add constraint shenanigans_games_status_check
    check (status in ('active', 'ended'));
  end if;
end $$;

create index if not exists shenanigans_events_game_id_idx
on public.shenanigans_events (game_id);

create index if not exists shenanigans_wagers_game_id_idx
on public.shenanigans_wagers (game_id);

create index if not exists shenanigans_game_players_game_id_idx
on public.shenanigans_game_players (game_id);

alter table public.shenanigans_games enable row level security;
alter table public.shenanigans_game_players enable row level security;
alter table public.shenanigans_events enable row level security;
alter table public.shenanigans_wagers enable row level security;

drop policy if exists "Public shenanigans_games select" on public.shenanigans_games;
create policy "Public shenanigans_games select"
on public.shenanigans_games for select
using (true);

drop policy if exists "Public shenanigans_games insert" on public.shenanigans_games;
create policy "Public shenanigans_games insert"
on public.shenanigans_games for insert
with check (true);

drop policy if exists "Public shenanigans_games update" on public.shenanigans_games;
create policy "Public shenanigans_games update"
on public.shenanigans_games for update
using (true)
with check (true);

drop policy if exists "Public shenanigans_games delete" on public.shenanigans_games;
create policy "Public shenanigans_games delete"
on public.shenanigans_games for delete
using (true);

drop policy if exists "Public shenanigans_game_players select" on public.shenanigans_game_players;
create policy "Public shenanigans_game_players select"
on public.shenanigans_game_players for select
using (true);

drop policy if exists "Public shenanigans_game_players insert" on public.shenanigans_game_players;
create policy "Public shenanigans_game_players insert"
on public.shenanigans_game_players for insert
with check (true);

drop policy if exists "Public shenanigans_game_players update" on public.shenanigans_game_players;
create policy "Public shenanigans_game_players update"
on public.shenanigans_game_players for update
using (true)
with check (true);

drop policy if exists "Public shenanigans_game_players delete" on public.shenanigans_game_players;
create policy "Public shenanigans_game_players delete"
on public.shenanigans_game_players for delete
using (true);

drop policy if exists "Public shenanigans_events select" on public.shenanigans_events;
create policy "Public shenanigans_events select"
on public.shenanigans_events for select
using (true);

drop policy if exists "Public shenanigans_events insert" on public.shenanigans_events;
create policy "Public shenanigans_events insert"
on public.shenanigans_events for insert
with check (true);

drop policy if exists "Public shenanigans_events update" on public.shenanigans_events;
create policy "Public shenanigans_events update"
on public.shenanigans_events for update
using (true)
with check (true);

drop policy if exists "Public shenanigans_events delete" on public.shenanigans_events;
create policy "Public shenanigans_events delete"
on public.shenanigans_events for delete
using (true);

drop policy if exists "Public shenanigans_wagers select" on public.shenanigans_wagers;
create policy "Public shenanigans_wagers select"
on public.shenanigans_wagers for select
using (true);

drop policy if exists "Public shenanigans_wagers insert" on public.shenanigans_wagers;
create policy "Public shenanigans_wagers insert"
on public.shenanigans_wagers for insert
with check (true);

drop policy if exists "Public shenanigans_wagers update" on public.shenanigans_wagers;
create policy "Public shenanigans_wagers update"
on public.shenanigans_wagers for update
using (true)
with check (true);

drop policy if exists "Public shenanigans_wagers delete" on public.shenanigans_wagers;
create policy "Public shenanigans_wagers delete"
on public.shenanigans_wagers for delete
using (true);
