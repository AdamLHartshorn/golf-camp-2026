-- Golf Camp 2026 Money Rounds scaffolding.
-- Run in the Supabase SQL editor when ready to create Money Rounds tables.

create table if not exists public.money_rounds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  round_date date,
  format text,
  status text not null default 'pending',
  buy_in numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.money_round_teams (
  id uuid primary key default gen_random_uuid(),
  money_round_id uuid not null references public.money_rounds(id) on delete cascade,
  name text not null,
  player_names text[] not null default '{}',
  score_status text not null default 'pending'
    check (score_status in ('pending', 'submitted', 'verified')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (id, money_round_id),
  unique (money_round_id, name)
);

create table if not exists public.money_round_scores (
  id uuid primary key default gen_random_uuid(),
  money_round_id uuid not null references public.money_rounds(id) on delete cascade,
  money_round_team_id uuid not null,
  score integer not null,
  score_label text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  foreign key (money_round_team_id, money_round_id)
    references public.money_round_teams(id, money_round_id)
    on delete cascade
);

create table if not exists public.money_round_payouts (
  id uuid primary key default gen_random_uuid(),
  money_round_id uuid not null references public.money_rounds(id) on delete cascade,
  money_round_team_id uuid not null,
  amount numeric not null,
  payout_label text,
  paid boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  foreign key (money_round_team_id, money_round_id)
    references public.money_round_teams(id, money_round_id)
    on delete cascade
);

alter table public.money_rounds enable row level security;
alter table public.money_round_teams enable row level security;
alter table public.money_round_scores enable row level security;
alter table public.money_round_payouts enable row level security;

drop policy if exists "Public money_rounds select" on public.money_rounds;
create policy "Public money_rounds select"
on public.money_rounds for select
using (true);

drop policy if exists "Public money_rounds insert" on public.money_rounds;
create policy "Public money_rounds insert"
on public.money_rounds for insert
with check (true);

drop policy if exists "Public money_rounds update" on public.money_rounds;
create policy "Public money_rounds update"
on public.money_rounds for update
using (true)
with check (true);

drop policy if exists "Public money_rounds delete" on public.money_rounds;
create policy "Public money_rounds delete"
on public.money_rounds for delete
using (true);

drop policy if exists "Public money_round_teams select" on public.money_round_teams;
create policy "Public money_round_teams select"
on public.money_round_teams for select
using (true);

drop policy if exists "Public money_round_teams insert" on public.money_round_teams;
create policy "Public money_round_teams insert"
on public.money_round_teams for insert
with check (true);

drop policy if exists "Public money_round_teams update" on public.money_round_teams;
create policy "Public money_round_teams update"
on public.money_round_teams for update
using (true)
with check (true);

drop policy if exists "Public money_round_teams delete" on public.money_round_teams;
create policy "Public money_round_teams delete"
on public.money_round_teams for delete
using (true);

drop policy if exists "Public money_round_scores select" on public.money_round_scores;
create policy "Public money_round_scores select"
on public.money_round_scores for select
using (true);

drop policy if exists "Public money_round_scores insert" on public.money_round_scores;
create policy "Public money_round_scores insert"
on public.money_round_scores for insert
with check (true);

drop policy if exists "Public money_round_scores update" on public.money_round_scores;
create policy "Public money_round_scores update"
on public.money_round_scores for update
using (true)
with check (true);

drop policy if exists "Public money_round_scores delete" on public.money_round_scores;
create policy "Public money_round_scores delete"
on public.money_round_scores for delete
using (true);

drop policy if exists "Public money_round_payouts select" on public.money_round_payouts;
create policy "Public money_round_payouts select"
on public.money_round_payouts for select
using (true);

drop policy if exists "Public money_round_payouts insert" on public.money_round_payouts;
create policy "Public money_round_payouts insert"
on public.money_round_payouts for insert
with check (true);

drop policy if exists "Public money_round_payouts update" on public.money_round_payouts;
create policy "Public money_round_payouts update"
on public.money_round_payouts for update
using (true)
with check (true);

drop policy if exists "Public money_round_payouts delete" on public.money_round_payouts;
create policy "Public money_round_payouts delete"
on public.money_round_payouts for delete
using (true);
