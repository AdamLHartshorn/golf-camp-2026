-- Golf Camp 2026 Money Rounds presentation controller state.
-- Run in the Supabase SQL editor before using phone-controlled results presentations.

create table if not exists public.money_round_presentation_state (
  money_round_id uuid primary key references public.money_rounds(id) on delete cascade,
  current_section text not null default 'intro',
  current_index integer not null default 0,
  updated_at timestamptz default now()
);

alter table public.money_round_presentation_state
add column if not exists current_index integer not null default 0;

alter table public.money_round_presentation_state enable row level security;

drop policy if exists "Public money_round_presentation_state select"
on public.money_round_presentation_state;
create policy "Public money_round_presentation_state select"
on public.money_round_presentation_state for select
using (true);

drop policy if exists "Public money_round_presentation_state insert"
on public.money_round_presentation_state;
create policy "Public money_round_presentation_state insert"
on public.money_round_presentation_state for insert
with check (true);

drop policy if exists "Public money_round_presentation_state update"
on public.money_round_presentation_state;
create policy "Public money_round_presentation_state update"
on public.money_round_presentation_state for update
using (true)
with check (true);

drop policy if exists "Public money_round_presentation_state delete"
on public.money_round_presentation_state;
create policy "Public money_round_presentation_state delete"
on public.money_round_presentation_state for delete
using (true);
