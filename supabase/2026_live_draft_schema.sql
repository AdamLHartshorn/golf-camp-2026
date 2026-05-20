-- Golf Camp 2026 Live Draft scaffolding.
-- Run in the Supabase SQL editor when ready to create Draft tables.

create table if not exists public.draft_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'pending',
  draft_order text[] default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.draft_teams (
  id uuid primary key default gen_random_uuid(),
  draft_session_id uuid not null references public.draft_sessions(id) on delete cascade,
  name text not null,
  captain_player_id uuid references public.players(id) on delete set null,
  draft_position integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (id, draft_session_id),
  unique (draft_session_id, name),
  unique (draft_session_id, draft_position)
);

create table if not exists public.draft_picks (
  id uuid primary key default gen_random_uuid(),
  draft_session_id uuid not null references public.draft_sessions(id) on delete cascade,
  draft_team_id uuid not null,
  player_id uuid not null references public.players(id) on delete restrict,
  pick_number integer not null,
  round_number integer,
  created_at timestamptz default now(),
  foreign key (draft_team_id, draft_session_id)
    references public.draft_teams(id, draft_session_id)
    on delete cascade,
  unique (draft_session_id, player_id),
  unique (draft_session_id, pick_number)
);

alter table public.draft_sessions enable row level security;
alter table public.draft_teams enable row level security;
alter table public.draft_picks enable row level security;

drop policy if exists "Public draft_sessions select" on public.draft_sessions;
create policy "Public draft_sessions select"
on public.draft_sessions for select
using (true);

drop policy if exists "Public draft_sessions insert" on public.draft_sessions;
create policy "Public draft_sessions insert"
on public.draft_sessions for insert
with check (true);

drop policy if exists "Public draft_sessions update" on public.draft_sessions;
create policy "Public draft_sessions update"
on public.draft_sessions for update
using (true)
with check (true);

drop policy if exists "Public draft_sessions delete" on public.draft_sessions;
create policy "Public draft_sessions delete"
on public.draft_sessions for delete
using (true);

drop policy if exists "Public draft_teams select" on public.draft_teams;
create policy "Public draft_teams select"
on public.draft_teams for select
using (true);

drop policy if exists "Public draft_teams insert" on public.draft_teams;
create policy "Public draft_teams insert"
on public.draft_teams for insert
with check (true);

drop policy if exists "Public draft_teams update" on public.draft_teams;
create policy "Public draft_teams update"
on public.draft_teams for update
using (true)
with check (true);

drop policy if exists "Public draft_teams delete" on public.draft_teams;
create policy "Public draft_teams delete"
on public.draft_teams for delete
using (true);

drop policy if exists "Public draft_picks select" on public.draft_picks;
create policy "Public draft_picks select"
on public.draft_picks for select
using (true);

drop policy if exists "Public draft_picks insert" on public.draft_picks;
create policy "Public draft_picks insert"
on public.draft_picks for insert
with check (true);

drop policy if exists "Public draft_picks update" on public.draft_picks;
create policy "Public draft_picks update"
on public.draft_picks for update
using (true)
with check (true);

drop policy if exists "Public draft_picks delete" on public.draft_picks;
create policy "Public draft_picks delete"
on public.draft_picks for delete
using (true);
